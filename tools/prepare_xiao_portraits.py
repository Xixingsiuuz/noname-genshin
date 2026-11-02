"""Reframe Xiao from the intact original; preserve previous portraits and selection crop."""
from pathlib import Path
import json
from PIL import Image, ImageFilter, ImageOps, ImageDraw
ROOT = Path(__file__).resolve().parents[1]

def main():
    original = Image.open(ROOT / 'image/character/originals/xiao.png').convert('RGB')
    width, height = original.size
    specs = {
        'xiao-centered-20261027': ((.045, .01, .615, .79), (360, 492), .65),
        'xiao-detail-centered-20261027': ((0, .01, .78, .99), (1056, 1327), 0),
    }
    for name, (box, size, blur) in specs.items():
        crop = original.crop(tuple(round(v * (width if i % 2 == 0 else height)) for i, v in enumerate(box)))
        if blur:
            crop = crop.filter(ImageFilter.GaussianBlur(blur))
        crop.resize(size, Image.Resampling.LANCZOS).save(ROOT / f'image/character/portraits/{name}.png')
    (ROOT / 'image/character/originals/xiao-centered-crops.json').write_text(json.dumps({
        'source': 'xiao.png', 'coordinates': 'normalized original image coordinates',
        'resampling': 'Lanczos', 'specs': specs,
        'review': 'Image previews at screenshot dimensions; not live game verification',
    }, indent=2) + '\n', encoding='utf8')
    board = Image.new('RGB', (700, 700), '#303438')
    for name, position, size in [
        ('xiao', (0, 25), (110, 160)),
        ('xiao-centered-20261027', (120, 25), (110, 160)),
        ('xiao-detail', (0, 210), (330, 465)),
        ('xiao-detail-centered-20261027', (350, 210), (330, 465)),
    ]:
        image = Image.open(ROOT / f'image/character/portraits/{name}.png').convert('RGB')
        board.paste(ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(.5, 0)), position)
    draw = ImageDraw.Draw(board)
    draw.text((0, 4), 'Before', fill='white'); draw.text((120, 4), 'After', fill='white')
    draw.text((0, 190), 'Before', fill='white'); draw.text((350, 190), 'After', fill='white')
    board.save(ROOT / 'image/character/originals/xiao-centered-review.png')

if __name__ == '__main__':
    main()
