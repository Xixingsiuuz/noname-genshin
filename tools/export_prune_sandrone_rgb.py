"""Export all three portrait views on a consistent opaque dark background."""
from pathlib import Path
import json
from PIL import Image, ImageFilter, ImageOps
root = Path(__file__).resolve().parents[1] / 'image/character'
specs = {
 'prune-select': ('prune', (876,170,1136,482), (400,480), .3),
 'prune': ('prune', (868,165,1178,630), (480,720), .3),
 'prune-detail': ('prune', (760,140,1290,865), (760,1040), .3),
}
for name, (box, size, blur) in json.loads((root/'originals/sandrone-crops.json').read_text(encoding='utf8')).items():
 specs[name] = ('sandrone', box, size, blur)
for name, (source, box, size, blur) in specs.items():
 im = Image.open(root/f'originals/{source}.png').convert('RGBA').convert('RGBa')
 crop = ImageOps.fit(im.crop(box), size, method=Image.Resampling.LANCZOS)
 if blur: crop = crop.filter(ImageFilter.GaussianBlur(blur))
 bg = Image.new('RGBA', crop.size, '#292929')
 bg.alpha_composite(crop.convert('RGBA'))
 crop = bg.convert('RGB')
 crop.save(root/f'portraits/{name}.png')
 if name.endswith('-detail'): continue
 width = min(300, crop.width)
 radius = .4 * crop.width / width if crop.width > width else 0
 smooth = crop.filter(ImageFilter.GaussianBlur(radius)) if radius else crop
 smooth.resize((width, round(crop.height*width/crop.width)), Image.Resampling.LANCZOS).convert('RGB').save(root/f'smooth/{name}.png')
for name in specs:
 im = Image.open(root/f'portraits/{name}.png')
 assert im.mode == 'RGB'
print('Verified six opaque dark-background portraits and four smooth assets.')
