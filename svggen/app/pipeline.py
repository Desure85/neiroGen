import logging
import os
from functools import lru_cache
from typing import Optional

import torch
from diffusers import StableDiffusionPipeline

from .config import settings

logger = logging.getLogger(__name__)


def get_torch_device() -> torch.device:
    if settings.torch_device_pref.lower() == "cpu":
        return torch.device("cpu")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


@lru_cache(maxsize=1)
def load_pipeline() -> StableDiffusionPipeline:
    device = get_torch_device()
    logger.info("Loading diffusion model %s on %s", settings.sd_model_id, device)
    pipe = StableDiffusionPipeline.from_pretrained(
        settings.sd_model_id,
        cache_dir=settings.hf_cache,
        torch_dtype=torch.float16 if device.type == "cuda" else torch.float32,
        safety_checker=None,
    )
    if device.type == "cuda":
        pipe.enable_xformers_memory_efficient_attention()
    pipe = pipe.to(device)
    return pipe


def generate_image(prompt: str, width: int, height: int, guidance_scale: float = 7.5, steps: int = 30) -> Optional["PIL.Image.Image"]:
    try:
        pipe = load_pipeline()
    except Exception:
        logger.exception("Failed to load diffusion pipeline")
        return None

    generator = torch.Generator(device=pipe.device).manual_seed(torch.seed())
    try:
        result = pipe(
            prompt=prompt,
            width=width,
            height=height,
            guidance_scale=guidance_scale,
            num_inference_steps=steps,
            generator=generator,
        )
        return result.images[0]
    except Exception:
        logger.exception("Generation failed for prompt: %s", prompt)
        return None
