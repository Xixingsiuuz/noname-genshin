"""Rebuild Jahoda's three independent close crops from the preserved original."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
im = Image.open(ROOT / 'image/character/originals/jahoda.jpg').convert('RGB')
# Selection emphasizes the face; arena includes the torso; detail retains pose to thighs.
specs = [
 ('jahoda-select', (190, 0, 710, 624), (400, 480), (168, 202)),
 ('jahoda', (160, 0, 760, 900), (480, 720), (216, 324)),
 ('jahoda-detail', (60, 45, 1000, 1345), (780, 1080), (300, 415)),
]
board = Image.new('RGB', (1050, 850), '#303438')
draw = ImageDraw.Draw(board)
draw.text((15, 10), 'Before', fill='white')
draw.text((545, 10), 'After', fill='white')
for i, (name, box, size, preview_size) in enumerate(specs):
 path = ROOT / f'image/character/portraits/{name}.png'
 old = Image.open(path).convert('RGB')
 crop = im.crop(box).filter(ImageFilter.GaussianBlur(.85 if name == "jahoda-select" else .35))
 if name != "jahoda-detail":
  crop.save(path)
 else:
  crop = old
 pos = [(15, 40), (215, 40), (15, 405)][i]
 for source, offset in [(old, 0), (crop, 530)]:
  board.paste(ImageOps.fit(source, preview_size, method=Image.Resampling.LANCZOS, centering=(.5, 0)), (pos[0]+offset, pos[1]))
board.save(ROOT / 'image/character/originals/jahoda-crop-review.png')
