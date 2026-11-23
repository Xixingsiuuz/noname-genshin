from pathlib import Path
import json
from PIL import Image
from portrait_frames import export_frame
root = Path(__file__).resolve().parents[1] / 'image/character'
boxes = json.loads((root / 'originals/dahlia-crops.json').read_text(encoding='utf-8'))
im = Image.open(root / 'originals/dahlia.png').convert('RGB')
for kind in ('select', 'arena'):
    name = 'dahlia' + ('' if kind == 'arena' else '-' + kind) + '.png'
    export_frame(im, boxes[kind], kind, root / 'portraits' / name, blur=.3)
# Detail crop is intentionally retained unchanged.
