"""Re-export Sethos at the approved crops, with mild smoothing from the full original."""
from pathlib import Path
import json
from PIL import Image
from portrait_frames import export_frame
root = Path(__file__).resolve().parents[1]
original = root / 'image/character/originals/sethos.png'
boxes = json.loads(original.with_name('sethos-crops.json').read_text(encoding='utf-8'))
im = Image.open(original).convert('RGB')
for kind, radius in [('select', .45), ('arena', .45), ('detail', .55)]:
    name = 'sethos' + ('' if kind == 'arena' else '-' + kind) + '.png'
    export_frame(im, boxes[kind], kind, root / 'image/character/portraits' / name, blur=radius)
