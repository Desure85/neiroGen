import asyncio
import logging
import uuid
import contextvars
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

from .config import settings
from .jobs import JobManager

try:
    from pythonjsonlogger import jsonlogger  # type: ignore
except Exception:  # pragma: no cover
    jsonlogger = None  # Fallback to basic logging if package missing

request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)

def setup_json_logging() -> None:
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # Remove default handlers to avoid double logs
    for h in list(root.handlers):
        root.removeHandler(h)
    handler = logging.StreamHandler()
    if jsonlogger is not None:
        fmt = jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s")
        handler.setFormatter(fmt)
    else:
        logging.basicConfig(level=logging.INFO)
    class _ReqIdFilter(logging.Filter):
        def filter(self, record: logging.LogRecord) -> bool:
            rid = request_id_ctx.get()
            setattr(record, 'request_id', rid or '')
            return True
    handler.addFilter(_ReqIdFilter())
    root.addHandler(handler)

logger = logging.getLogger(__name__)

setup_json_logging()
app = FastAPI(title="NeiroGen SVG Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

JOB_MANAGER = JobManager()


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)
    width: int = Field(512, ge=64, le=2048)
    height: int = Field(512, ge=64, le=2048)
    mode: Literal["blocking", "queued"] = "blocking"

    @validator("prompt")
    def _validate_prompt(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("prompt must not be empty")
        return value


class GenerateResponse(BaseModel):
    status: Literal["done", "queued", "failed"]
    url: str | None = None
    fallback: bool | None = None
    job_id: str | None = None
    error: str | None = None


@app.on_event("startup")
async def startup_event() -> None:
    await JOB_MANAGER.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await JOB_MANAGER.shutdown()


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    # Propagate/generate X-Request-Id
    req_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
    token = request_id_ctx.set(req_id)
    try:
        response: Response = await call_next(request)
    finally:
        request_id_ctx.reset(token)
    response.headers.setdefault("X-Request-Id", req_id)
    return response


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest) -> GenerateResponse:
    job_id = await JOB_MANAGER.submit(
        prompt=request.prompt.strip(),
        width=request.width,
        height=request.height,
    )

    if request.mode == "queued":
        return GenerateResponse(status="queued", job_id=job_id)

    # blocking mode: wait for completion
    while True:
        state = await JOB_MANAGER.get_state(job_id)
        if state is None:
            raise HTTPException(status_code=404, detail="job-not-found")
        if state.status in {"done", "failed"}:
            break
        await asyncio.sleep(0.25)

    if state.status == "done" and state.url:
        return GenerateResponse(
            status="done",
            url=state.url,
            fallback=state.fallback,
            job_id=job_id,
        )

    return GenerateResponse(
        status="failed",
        error=state.error or "Generation failed",
        job_id=job_id,
    )


@app.get("/status/{job_id}", response_model=GenerateResponse)
async def status(job_id: str) -> GenerateResponse:
    state = await JOB_MANAGER.get_state(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="job-not-found")
    return GenerateResponse(
        status=state.status,
        url=state.url,
        fallback=state.fallback,
        job_id=job_id,
        error=state.error,
    )


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "service": "svggen", "version": "1.0.0"}
