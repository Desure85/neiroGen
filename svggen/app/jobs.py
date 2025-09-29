import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Optional

from PIL import Image

from .config import settings
from .pipeline import generate_image
from .storage import store_svg
from .utils import generate_simple_svg, sanitize_text
from .vectorize import raster_to_svg

logger = logging.getLogger(__name__)


@dataclass
class JobRequest:
    job_id: str
    prompt: str
    width: int
    height: int
    created_at: float = field(default_factory=time.time)


@dataclass
class JobState:
    status: str = "queued"
    url: Optional[str] = None
    error: Optional[str] = None
    fallback: bool = False
    started_at: Optional[float] = None
    finished_at: Optional[float] = None


class JobManager:
    def __init__(self) -> None:
        self.queue: asyncio.Queue[JobRequest] = asyncio.Queue()
        self.jobs: Dict[str, JobState] = {}
        self.lock = asyncio.Lock()
        self.workers: list[asyncio.Task] = []
        self.max_concurrent = max(1, settings.max_concurrent_jobs)
        self.timeout = max(10, settings.job_timeout_seconds)

    async def start(self) -> None:
        logger.info(
            "Starting job manager with max_concurrent=%s timeout=%s",
            self.max_concurrent,
            self.timeout,
        )
        for _ in range(self.max_concurrent):
            task = asyncio.create_task(self._worker(), name="svg-worker")
            self.workers.append(task)

    async def shutdown(self) -> None:
        logger.info("Shutting down job manager")
        for worker in self.workers:
            worker.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()

    async def submit(self, prompt: str, width: int, height: int) -> str:
        job_id = uuid.uuid4().hex
        request = JobRequest(job_id=job_id, prompt=prompt, width=width, height=height)
        async with self.lock:
            self.jobs[job_id] = JobState(status="queued")
        await self.queue.put(request)
        logger.info("Job %s queued", job_id)
        return job_id

    async def get_state(self, job_id: str) -> Optional[JobState]:
        async with self.lock:
            return self.jobs.get(job_id)

    async def _worker(self) -> None:
        while True:
            request = await self.queue.get()
            try:
                await self._process(request)
            except Exception:
                logger.exception("Unexpected failure in worker for job %s", request.job_id)
                await self._update_job(request.job_id, status="failed", error="internal_error")
            finally:
                self.queue.task_done()

    async def _process(self, request: JobRequest) -> None:
        await self._update_job(request.job_id, status="processing", started_at=time.time())

        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self._execute_blocking, request),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError:
            logger.warning("Job %s timed out", request.job_id)
            await self._update_job(
                request.job_id,
                status="failed",
                error="timeout",
                finished_at=time.time(),
            )
            return

        if result.url:
            await self._update_job(
                request.job_id,
                status="done",
                url=result.url,
                fallback=result.fallback,
                finished_at=time.time(),
            )
        else:
            await self._update_job(
                request.job_id,
                status="failed",
                error=result.error or "generation_failed",
                finished_at=time.time(),
            )

    def _execute_blocking(self, request: JobRequest) -> JobState:
        prompt = request.prompt
        width = request.width
        height = request.height
        state = JobState(status="processing", started_at=time.time())

        logger.info("Job %s: starting diffusion", request.job_id)
        image: Optional[Image.Image] = generate_image(prompt, width, height)

        if image is None:
            logger.warning("Job %s: diffusion unavailable, falling back", request.job_id)
            fallback_svg = generate_simple_svg(prompt, (width, height))
            url = store_svg(fallback_svg)
            if url:
                state.url = url
                state.fallback = True
                state.finished_at = time.time()
                return state
            state.error = "storage_failed"
            return state

        logger.info("Job %s: diffusion completed, vectorizing", request.job_id)
        svg_content = raster_to_svg(image)
        if not svg_content:
            logger.warning("Job %s: vectorization failed, fallback", request.job_id)
            svg_content = generate_simple_svg(prompt, (width, height))
            state.fallback = True

        sanitized_prompt = sanitize_text(prompt, max_length=200)
        metadata_block = (
            f"<!-- prompt: {sanitized_prompt} | generated: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} -->\n"
        )
        final_svg = metadata_block + svg_content

        url = store_svg(final_svg)
        if url:
            state.url = url
            state.finished_at = time.time()
            return state

        state.error = "storage_failed"
        return state

    async def _update_job(self, job_id: str, **kwargs) -> None:
        async with self.lock:
            state = self.jobs.get(job_id)
            if state is None:
                state = JobState()
                self.jobs[job_id] = state
            for key, value in kwargs.items():
                setattr(state, key, value)
