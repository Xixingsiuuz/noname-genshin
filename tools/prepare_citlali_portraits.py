"""Independent portrait crops; coordinates relative to the preserved original."""
from pathlib import Path
import json, shutil
from PIL import Image, ImageOps, ImageFilter, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
source=Path('C:/Users/22697/AppData/Local/Temp/codex-clipboard-56bba486-ea50-4c23-a4a5-9af38dad6c07.png')
original=ROOT/'image/character/originals/citlali.png'
if not original.exists(): shutil.copyfile(source,original)
im=Image.open(original).convert('RGB'); w,h=im.size
spec={
 'citlali-select':dict(box=[.30,.09,.72,.678],size=[180,252],blur=.7),
 'citlali':dict(box=[.23,.045,.79,.829],size=[300,420],blur=.45),
 'citlali-detail':dict(box=[.10,0,.90,1],size=[960,1200],blur=0),
}
board=Image.new('RGB',(920,670),'#303438'); draw=ImageDraw.Draw(board)
for i,(name,settings) in enumerate(spec.items()):
 box=tuple(round(n*(w if j%2==0 else h)) for j,n in enumerate(settings['box']))
 crop=im.crop(box)
 if settings['blur']: crop=crop.filter(ImageFilter.GaussianBlur(settings['blur']*w/1600))
 crop=ImageOps.fit(crop,settings['size'],method=Image.Resampling.LANCZOS)
 crop.save(ROOT/f'image/character/portraits/{name}.png')
 board.paste(ImageOps.contain(crop,(290,440)),(i*310,20)); draw.text((i*310+10,470),name,fill='white')
 board.paste(ImageOps.fit(crop,(90,126),method=Image.Resampling.LANCZOS),(i*310+20,510))
(ROOT/'image/character/originals/citlali-crops.json').write_text(json.dumps(dict(original_size=im.size,crops=spec,method='Gaussian prefilter in original pixels scaled from 1600 reference; Lanczos resize; separate selection/arena/detail'),indent=2)+'\n')
board.save(ROOT/'image/character/originals/citlali-review.png')
