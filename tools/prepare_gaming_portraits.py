"""Reproduce Gaming close crops; composite transparency as existing Sandrone portraits."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
from portrait_frames import export_frame
root=Path(__file__).resolve().parents[1]
out=root/'docs/gaming-portrait-review';out.mkdir(exist_ok=True)
im=Image.open(root/'image/character/originals/gaming.png').convert('RGBA')
bg=Image.new('RGBA',im.size,'#292929');bg.alpha_composite(im);im=bg.convert('RGB')
boxes={'select':(920,245,1100,461),'arena':(895,230,1135,590),'detail':(800,140,1250,770)}
canvas=Image.new('RGB',(1080,1000),'#292929');draw=ImageDraw.Draw(canvas)
for i,(kind,box) in enumerate(boxes.items()):
 name='gaming'+('' if kind=='arena' else '-'+kind)+'.png'
 path=root/'image/character/portraits'/name
 before=Image.open(path).convert('RGBA');base=Image.new('RGBA',before.size,'#292929');base.alpha_composite(before);before=base.convert('RGB');before.save(out/(kind+'-before.png'))
 export_frame(im,box,kind,path,blur=.25)
 after=Image.open(path)
 for row,pic in enumerate([before,after]):
  pic.thumbnail((330,450));x=i*360+(360-pic.width)//2;y=30+row*500;canvas.paste(pic,(x,y));draw.text((i*360+10,y-20),kind+(' BEFORE' if row==0 else ' AFTER'),fill='white')
canvas.save(out/'comparison.jpg',quality=94)
(root/'image/character/originals/gaming-crops.json').write_text(json.dumps(boxes,indent=2),encoding='utf-8')
