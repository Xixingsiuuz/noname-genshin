"""Generate closer avatar crops; keep existing detail illustrations untouched."""
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "image/character"
CROPS = {
    "skirk": ("portraits/skirk-v2.png", (115, 0, 935, 1148)),
    "shenhe": ("originals/shenhe.jpg", (1840, 0, 2960, 1568)),
}

for name, (source, box) in CROPS.items():
    with Image.open(ROOT / source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        assert 0 <= box[0] < box[2] <= image.width
        assert 0 <= box[1] < box[3] <= image.height
        assert (box[2] - box[0]) * 7 == (box[3] - box[1]) * 5
        portrait = image.crop(box)
        size = (600, 840)
        if name in ("shenhe", "skirk"):
            # Small frames lose thin high-contrast lines during browser minification.
            # Prefilter at source resolution and use a smaller, smoothly sampled asset.
            size = (300, 420)
            portrait = portrait.filter(ImageFilter.GaussianBlur(radius=0.5 * portrait.width / size[0]))
        portrait.resize(size, Image.Resampling.LANCZOS).save(
            ROOT / f"portraits/{name}-avatar-20261027.png", optimize=True
        )
