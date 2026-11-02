"""Regenerate three independently framed portraits from the preserved supplied illustration."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
image = Image.open(ROOT / 'image/character/originals/ganyu.png').convert('RGB')
for name, box, size in [
    ('ganyu', (715, 0, 1135, 588), (500, 700)),
    ('ganyu-select', (755, 20, 1115, 524), (400, 560)),
    ('ganyu-detail', (695, 0, 1145, 630), (900, 1260)),
]:
    image.crop(box).resize(size, Image.Resampling.LANCZOS).save(ROOT / 'image/character/portraits' / (name + '.png'))
