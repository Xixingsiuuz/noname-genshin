"""Three fixed-aspect crop frames; resize only after matching the frame ratio."""
from PIL import Image,ImageOps,ImageFilter
FRAME_SIZES={'select':(400,480),'arena':(500,750),'detail':(900,1260)}
def export_frame(original,box,kind,destination,blur=0):
 size=FRAME_SIZES[kind]
 # Fit crops uniformly to the fixed frame. Never resize an unmatched aspect.
 crop=ImageOps.fit(original.crop(box),size,method=Image.Resampling.LANCZOS)
 assert crop.width*size[1]==crop.height*size[0]
 if blur:crop=crop.filter(ImageFilter.GaussianBlur(blur))
 crop.save(destination)
