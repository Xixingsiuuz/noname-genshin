"""Rebuild Nicole's three portraits from the preserved original and crop manifest."""
from pathlib import Path
import json
from PIL import Image, ImageFilter, ImageOps
root = Path(__file__).resolve().parents[1] / 'image/character'
im = Image.open(root / 'originals/nicole.png').convert('RGBA')
specs = json.loads((root / 'originals/nicole-crops.json').read_text(encoding='utf8'))
board = Image.new('RGB', (1000, 690), '#333333')
for i, (name, (box, size, blur)) in enumerate(specs.items()):
    crop = im.crop(box)
    if blur:
        crop = crop.convert('RGBa').filter(ImageFilter.GaussianBlur(blur)).convert('RGBA')
    crop = ImageOps.fit(crop, size, method=Image.Resampling.LANCZOS)
    crop.save(root / f'portraits/{name}.png')
    large = ImageOps.contain(crop, (310, 500))
    board.paste(large, (i * 335, 0), large)
    small = ImageOps.fit(crop, (100, 140), method=Image.Resampling.LANCZOS)
    board.paste(small, (i * 335, 525), small)
board.save(root / 'originals/nicole-review.jpg')
