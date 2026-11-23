"""Mild antialiasing for the six approved crops, using immutable pre-filter inputs."""
from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import shutil
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'image/character/originals/portrait-smoothing-20261120'
source.mkdir(exist_ok=True)
names=['ororon-select','ororon','ororon-detail','iansan-select','iansan','iansan-detail']
canvas=Image.new('RGB',(900,680),'#333333');draw=ImageDraw.Draw(canvas)
for i,name in enumerate(names):
 target=ROOT/f'image/character/portraits/{name}.png'
 original=source/(name+'.png')
 if not original.exists():shutil.copy2(target,original)
 im=Image.open(original).convert('RGB')
 # A small subpixel low-pass removes hard stair steps without erasing linework.
 radius=.48 if 'detail' not in name else .60
 result=im.filter(ImageFilter.GaussianBlur(radius))
 result.save(target)
 assert result.size==im.size
 thumb=result.copy();thumb.thumbnail((270,300),Image.Resampling.LANCZOS)
 canvas.paste(thumb,((i%3)*300,(i//3)*340+20))
 draw.text(((i%3)*300,(i//3)*340),name,fill='white')
canvas.save(ROOT/'image/character/portraits/ororon-iansan-smooth-preview.jpg',quality=95)
print('Updated six portraits; preserved original crops and dimensions.')
