"""Reproduce Kachina's independent close portraits and review comparison."""
from pathlib import Path
from PIL import Image, ImageDraw
from portrait_frames import export_frame
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/kachina-portrait-review'
OUT.mkdir(exist_ok=True)
im=Image.open(ROOT/'image/character/originals/kachina.png').convert('RGB')
frames=[('select',(570,280,930,712),'-select'),('arena',(555,245,995,905),''),('detail',(425,170,1125,1150),'-detail')]
canvas=Image.new('RGB',(1200,920),'#292929');draw=ImageDraw.Draw(canvas)
for i,(kind,box,suffix) in enumerate(frames):
 path=ROOT/f'image/character/portraits/kachina{suffix}.png'
 before=Image.open(path).convert('RGB');before.save(OUT/f'{kind}-before.png')
 export_frame(im,box,kind,path,blur=.25)
 after=Image.open(path).convert('RGB')
 for row,pic in enumerate([before,after]):
  pic.thumbnail((360,410));x=i*400+(400-pic.width)//2;y=35+row*455
  canvas.paste(pic,(x,y));draw.text((i*400+15,y-22),f'{kind} / {"BEFORE" if row==0 else "AFTER"}',fill='white')
canvas.save(OUT/'comparison.jpg',quality=94)
source=im.copy();d=ImageDraw.Draw(source)
for (kind,box,_),color in zip(frames,['red','lime','blue']):d.rectangle(box,outline=color,width=5);d.text((box[0],box[1]),kind,fill=color,stroke_width=1)
source.save(OUT/'crop-frames.jpg',quality=94)
