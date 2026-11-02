"""Reproduce independent crops from the preserved original; no generated imagery."""
from pathlib import Path
import json
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1] / 'image/character'
im = Image.open(ROOT / 'originals/qiqi.png').convert('RGB')
w, h = im.size
specs = json.loads((ROOT / 'originals/qiqi-crops.json').read_text(encoding='utf8'))['specs_fractional']
board = Image.new('RGB', (900, 660), '#303438')
for i, (name, (box, size, blur)) in enumerate(specs.items()):
    crop = im.crop(tuple(round(v * (w if j % 2 == 0 else h)) for j, v in enumerate(box)))
    if blur:
        crop = crop.filter(ImageFilter.GaussianBlur(blur * w / 1600))
    crop = ImageOps.fit(crop, size, method=Image.Resampling.LANCZOS)
    crop.save(ROOT / f'portraits/{name}.png')
    board.paste(ImageOps.contain(crop, (280, 480)), (i * 300, 30))
    # Approximate small selection/arena viewports in addition to large crop review.
    size = (90, 126) if i == 0 else (120, 160) if i == 1 else (100, 126)
    board.paste(ImageOps.fit(crop, size, method=Image.Resampling.LANCZOS), (i * 300, 495))
board.save(ROOT / 'originals/qiqi-review.png')
