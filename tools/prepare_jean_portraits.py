"""Create three independent crops from the preserved Jean screenshot."""
from pathlib import Path
import json
from PIL import Image, ImageFilter, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
specs=json.loads((ROOT/'image/character/originals/jean-crops.json').read_text(encoding='utf8'))['specs']
im=Image.open(ROOT/'image/character/originals/jean.png').convert('RGB')
board=Image.new('RGB',(1100,850),'#303438')
draw=ImageDraw.Draw(board)
draw.text((12,8),'Before',fill='white')
draw.text((562,8),'After',fill='white')
for i,(name,(box,size,blur)) in enumerate(specs.items()):
    crop=im.crop(box)
    if blur: crop=crop.filter(ImageFilter.GaussianBlur(blur))
    crop=crop.resize(size,Image.Resampling.LANCZOS)
    crop.save(ROOT/f'image/character/portraits/{name}.png')
    # Approximate the user's screenshot viewports, alongside small-size QA.
    preview_size=[(168,202),(216,324),(300,420)][i]
    position=[(260,40),(12,40),(12,400)][i]
    previous=['jean-select','jean','jean-detail'][i]
    before=Image.open(ROOT/f'image/character/portraits/{previous}.png').convert('RGB')
    for image,offset in [(before,0),(crop,550)]:
        preview=ImageOps.fit(image,preview_size,method=Image.Resampling.LANCZOS,centering=(.5,0))
        board.paste(preview,(position[0]+offset,position[1]))
    if i == 0:
        tiny=ImageOps.fit(crop,(90,126),method=Image.Resampling.LANCZOS,centering=(.5,0))
        board.paste(tiny,(1000,40))
board.save(ROOT/'image/character/originals/jean-review.png')
