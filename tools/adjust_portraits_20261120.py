from pathlib import Path
from PIL import Image,ImageOps,ImageFilter,ImageDraw
import json
root=Path(__file__).resolve().parents[1]
out=root/'image/character/portraits'
# Every crop is fitted with one scale factor, never stretched to its destination.
specs={
 'prune':('prune.png',(790,150,1230,810),(500,750)),
 'prune-select':('prune.png',(825,150,1200,600),(400,480)),
 'prune-detail':('prune.png',(760,140,1290,865),(760,1040)),
 'ifa':('ifa.jpg',(375,355,960,1233),(500,750)),
 'ifa-select':('ifa.jpg',(440,355,900,907),(400,480)),
 'ifa-detail':('ifa.jpg',(100,260,1080,1430),(840,1003)),
}
for name,(source,box,size) in specs.items():
 im=Image.open(root/'image/character/originals'/source)
 if source=='prune.png':
  # Preserve transparency; premultiply before filtering to avoid hidden RGB bleed.
  im=im.convert('RGBA').convert('RGBa')
 im=ImageOps.fit(im.crop(box),size,method=Image.Resampling.LANCZOS)
 radius=.65 if name.startswith('ifa') else .3
 im=im.filter(ImageFilter.GaussianBlur(radius))
 if im.mode=='RGBa':
  bg=Image.new('RGBA',im.size,'#292929');bg.alpha_composite(im.convert('RGBA'));im=bg.convert('RGB')
 im.save(out/(name+'.png'))
# Rebuild from the intact original; never filter a previously stretched portrait.
from portrait_frames import export_frame
lanyan=Image.open(root/'image/character/originals/lanyan.jpg').convert('RGB')
frames=json.loads((root/'docs/lanyan-fixed-frames.json').read_text(encoding='utf8'))
for filename,box in frames.items():
 export_frame(lanyan,tuple(round(x) for x in box),'select' if '-select' in filename else 'arena',out/filename,.65)
(root/'docs/portrait-adjustments-20261120.json').write_text(json.dumps({'method':'ImageOps.fit, uniform scaling with centered crop','specs':specs,'lanyan':'existing independent crops, median 3 then Gaussian 0.45','originals':'unchanged'},ensure_ascii=False,indent=2),encoding='utf8')
board=Image.new('RGB',(960,750),'#303438')
for i,name in enumerate(['prune-select','prune','prune-detail','ifa-select','ifa','lanyan']):
 im=Image.open(out/(name+'.png'));im=ImageOps.fit(im,(150,225),method=Image.Resampling.LANCZOS)
 board.paste(im,(i*160,30));ImageDraw.Draw(board).text((i*160,10),name,fill='white')
board.save(root/'docs/portrait-review-20261120.jpg')
