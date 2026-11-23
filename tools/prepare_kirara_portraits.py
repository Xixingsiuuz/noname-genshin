from pathlib import Path
from PIL import Image
from portrait_frames import export_frame
import json
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'image/character/originals/kirara.png').convert('RGB')
boxes={'select':(1050,100,2650,2020),'arena':(950,0,2850,2850),'detail':(825,0,2885,2884)}
preview=Image.new('RGB',(1020,500),'#292929')
for i,(kind,box) in enumerate(boxes.items()):
 name='kirara'+('' if kind=='arena' else '-'+kind)+'.png'
 path=root/'image/character/portraits'/name
 export_frame(im,box,kind,path,blur=.2)
 pic=Image.open(path);pic.thumbnail((330,480));preview.paste(pic,(i*340,0))
(root/'docs/kirara').mkdir(exist_ok=True)
preview.save(root/'docs/kirara/portraits.jpg')
(root/'image/character/originals/kirara-crops.json').write_text(json.dumps(boxes,indent=2),encoding='utf-8')
