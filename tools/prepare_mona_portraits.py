from pathlib import Path
import json
from PIL import Image, ImageFilter, ImageOps
root=Path(__file__).resolve().parents[1]/'image/character'
im=Image.open(root/'originals/mona.png').convert('RGB')
board=Image.new('RGB',(900,700),'#303438')
for i,(name,(box,size,blur)) in enumerate(json.loads((root/'originals/mona-crops.json').read_text()).items()):
 crop=im.crop(box)
 if blur:crop=crop.filter(ImageFilter.GaussianBlur(blur))
 crop=ImageOps.fit(crop,size,method=Image.Resampling.LANCZOS)
 crop.save(root/f'portraits/{name}.png')
 board.paste(ImageOps.contain(crop,(280,490)),(i*300,0))
 board.paste(ImageOps.fit(crop,(90,126),method=Image.Resampling.LANCZOS),(i*300+90,540))
board.save(root/'originals/mona-review.png')
