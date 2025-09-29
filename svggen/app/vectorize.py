import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)


def _postprocess(image: Image.Image) -> Image.Image:
    """Apply light post-processing for cleaner vectorization."""
    img = image.convert("RGBA")
    # Light blur to reduce noise
    img = img.filter(ImageFilter.MedianFilter(size=3))
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.1)
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    bg.alpha_composite(img)
    return bg.convert("RGB")


def raster_to_svg(image: Image.Image) -> Optional[str]:
    processed = _postprocess(image)
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        input_path = tmpdir_path / "input.png"
        output_path = tmpdir_path / "output.svg"
        processed.save(input_path, format="PNG")

        try:
            subprocess.run(
                [
                    "vtracer",
                    "--input",
                    str(input_path),
                    "--output",
                    str(output_path),
                    "--colormode",
                    "color",
                    "--simplify",
                    "true",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
            )
        except FileNotFoundError:
            logger.error("vtracer CLI tool not found; ensure vtracer is installed")
            return None
        except subprocess.CalledProcessError as exc:
            logger.error("vtracer failed: %s", exc.stderr.decode("utf-8", errors="ignore"))
            return None

        if not output_path.exists():
            logger.error("vtracer output not created at %s", output_path)
            return None

        svg_content = output_path.read_text(encoding="utf-8")
        return svg_content
