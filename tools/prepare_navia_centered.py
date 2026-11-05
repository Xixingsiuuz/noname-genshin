from pathlib import Path
from PIL import Image, ImageFilter
ROOT = Path(__file__).resolve().parents[1]
# Shoulder centering: camera left 35 px on 1052x1052 original; no vertical shift or zoom.
# Old crop (235,0,985,1050); new crop (200,0,950,1050).
im = Image.open(ROOT / "image/character/navia.avif").convert("RGB").crop((200,0,950,1050))
im.resize((400,560),Image.Resampling.LANCZOS).save(ROOT / "image/character/portraits/navia-centered-20261104.png")
im.filter(ImageFilter.GaussianBlur(1.0)).resize((300,420),Image.Resampling.LANCZOS).save(ROOT / "image/character/smooth/navia-centered-20261104.png")
