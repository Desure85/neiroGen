import logging
from pathlib import Path
from typing import Optional

from .config import settings
from .utils import generate_filename

logger = logging.getLogger(__name__)


def ensure_directories() -> None:
    settings.public_storage_path.mkdir(parents=True, exist_ok=True)


def store_svg(content: str) -> Optional[str]:
    try:
        ensure_directories()
        filename = generate_filename()
        destination = settings.public_storage_path / filename
        destination.write_text(content, encoding="utf-8")
        public_url = f"{settings.public_base_url.rstrip('/')}/{filename}"
        logger.info("Stored SVG at %s", destination)
        return public_url
    except Exception:
        logger.exception("Failed to store SVG")
        return None
