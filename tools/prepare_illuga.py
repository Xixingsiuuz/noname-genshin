from PIL import ImageOps
from pathlib import Path
from PIL import Image, ImageFilter
source=Path(__file__).resolve().parents[1] / 'image/character/originals/illuga.jpg'
im=Image.open(source)
for name,box,size in [('illuga-select',(410,665,860,1190),(360,420)),('illuga',(325,650,945,1394),(500,600)),('illuga-detail',(120,570,1080,1630),(790,872))]:
 ImageOps.fit(im.crop(box),size,method=Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.25)).save('image/character/portraits/'+name+'.png')
