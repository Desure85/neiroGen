import html
import logging
import textwrap
import uuid
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)


def sanitize_text(value: str, max_length: int = 160) -> str:
    value = value.strip()
    if len(value) > max_length:
        value = value[: max_length - 3] + "..."
    return value


def generate_simple_svg(prompt: str, size: Tuple[int, int]) -> str:
    """Generate a placeholder SVG when the diffusion pipeline is unavailable."""
    width, height = size
    escaped_prompt = html.escape(sanitize_text(prompt))
    return textwrap.dedent(
        f"""
        <?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#60a5fa" />
              <stop offset="100%" stop-color="#34d399" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
          <g opacity="0.35">
            <circle cx="{width/2}" cy="{height/2}" r="{min(width, height) / 3}" fill="#ffffff" />
            <circle cx="{width/2}" cy="{height/2}" r="{min(width, height) / 4}" fill="#ffffff" opacity="0.35" />
          </g>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="{max(18, min(48, width // 12))}" fill="#0f172a">
            {escaped_prompt}
          </text>
        </svg>
        """
    ).strip()


def generate_filename() -> str:
    return f"{uuid.uuid4().hex}.svg"
