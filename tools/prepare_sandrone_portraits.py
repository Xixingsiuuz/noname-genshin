"""Reproduce independent Sandrone crops; preserve the full original."""
from pathlib import Path
import json
from PIL import Image,ImageFilter,ImageOps
root=Path(__file__).resolve().parents[1]/'image/character'
im=Image.open(root/'originals/sandrone.png').convert('RGBA')
spec=json.loads((root/'originals/sandrone-crops.json').read_text(encoding='utf8'))
board=Image.new('RGB',(900,660),'#333333')
for i,(name,(box,size,blur)) in enumerate(spec.items()):
 c=im.crop(box)
 if blur:c=c.convert('RGBa').filter(ImageFilter.GaussianBlur(blur)).convert('RGBA')
 c=c.resize(size,Image.Resampling.LANCZOS)
 c.save(root/f'portraits/{name}.png')
 preview=ImageOps.contain(c,(290,450));board.paste(preview,(i*300,0),preview)
 small=ImageOps.fit(c,(100,140),method=Image.Resampling.LANCZOS);board.paste(small,(i*300+95,480),small)
board.save(root/'originals/sandrone-review.jpg')
