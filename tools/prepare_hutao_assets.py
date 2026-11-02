"""Three independent crops per appearance; retain the exact supplied originals."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageDraw
import shutil, json
ROOT=Path(__file__).resolve().parents[1]
TEMP=Path('C:/Users/22697/AppData/Local/Temp')
SOURCES={
 'hutao':('codex-clipboard-e33cc818-342f-457a-97d3-a3f9dcb553da.png', [(85,285,535,915),(75,285,495,873),(15,230,735,1238)]),
 'hutao-skin1':('codex-clipboard-09bc6f8a-1065-45d4-acd7-189671bcc3be.jpg', [(160,20,1080,1308),(160,20,1080,1308),(0,0,1178,1650)]),
 'hutao-skin2':('codex-clipboard-320b8a6b-f520-46ae-910e-bd88c728a109.png', [(400,120,1120,1128),(290,70,1250,1414),(222,0,1332,1554)]),
}
def main():
 original=ROOT/'image/character/originals'; portraits=ROOT/'image/character/portraits'; skin=ROOT/'image/skin/fan_hutao'
 for p in [original,portraits,skin]: p.mkdir(parents=True,exist_ok=True)
 review=Image.new('RGB',(900,650),'#222222'); draw=ImageDraw.Draw(review); records={}
 for col,(key,(filename,boxes)) in enumerate(SOURCES.items()):
  src=TEMP/filename; saved=original/(key+src.suffix)
  if not saved.exists(): shutil.copy2(src,saved)
  image=Image.open(saved).convert('RGB'); records[key]=dict(original=saved.relative_to(ROOT).as_posix(),boxes=boxes,select_blur=0.35,avatar_blur=0.2,resampling='LANCZOS')
  for kind,box,size,blur in [('select',boxes[0],(240,336),0.35),('avatar',boxes[1],(400,560),0.2),('detail',boxes[2],(900,1260),0)]:
   cropped=image.crop(box)
   if blur: cropped=cropped.filter(ImageFilter.GaussianBlur(blur))
   if kind=='detail':
    # Independently frame each detail to fill the native tall portrait, preserving originals.
    cropped.thumbnail((1100,1600),Image.Resampling.LANCZOS)
   else: cropped=cropped.resize(size,Image.Resampling.LANCZOS)
   dest=portraits/(key+('-'+kind if kind!='avatar' else '')+'.png'); cropped.save(dest)
   if kind=='avatar' and key!='hutao': shutil.copy2(dest,skin/('1.png' if key.endswith('1') else '2.png'))
   preview=ImageOps.contain(cropped,(145,210),Image.Resampling.LANCZOS)
   x=col*300+(0 if kind=='select' else 150 if kind=='avatar' else 75); y=30 if kind!='detail' else 340
   review.paste(preview,(x,y)); draw.text((x,y-18),key+' '+kind,fill='white')
 review.save(ROOT/'image/character/hutao-review.jpg')
 (original/'hutao-crops.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__': main()
