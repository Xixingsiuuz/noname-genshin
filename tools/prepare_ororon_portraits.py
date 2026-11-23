"""Independent Ororon portrait crops; preserve the supplied original."""
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageDraw
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'image/character/originals/ororon.jpg')
specs=[('ororon-select',(570,25,1010,555),(400,490)),('ororon',(500,0,1080,830),(490,700)),('ororon-detail',(440,0,1080,1120),(860,1500))]
previews=[]
for name,box,size in specs:
    result=ImageOps.fit(im.crop(box),size,method=Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.22))
    result.save(root/f'image/character/portraits/{name}.png')
    preview=result.copy();preview.thumbnail((300,500));previews.append(preview)
canvas=Image.new('RGB',(950,540),'#333333')
for x,preview in zip((10,325,640),previews):canvas.paste(preview,(x,25))
canvas.save(root/'image/character/portraits/ororon-crop-preview.jpg')
