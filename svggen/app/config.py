import os
from dataclasses import dataclass
from pathlib import Path


def _get_env(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value


def _get_env_int(name: str, default: int) -> int:
    try:
        return int(_get_env(name, str(default)))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    sd_model_id: str = _get_env("SD_MODEL_ID", "runwayml/stable-diffusion-v1-5")
    torch_device_pref: str = _get_env("TORCH_DEVICE", "auto")
    hf_cache: Path = Path(_get_env("HUGGINGFACE_HUB_CACHE", "/data/hf-cache"))
    public_storage_path: Path = Path(_get_env("PUBLIC_STORAGE_PATH", "/data/public/svg"))
    public_base_url: str = _get_env("PUBLIC_BASE_URL", "http://localhost:8000/storage")
    max_concurrent_jobs: int = _get_env_int("MAX_CONCURRENT_JOBS", 1)
    job_timeout_seconds: int = _get_env_int("JOB_TIMEOUT_SECONDS", 120)


settings = Settings()
