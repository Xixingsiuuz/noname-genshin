from pathlib import Path
import json, sys
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from portrait_frames import export_frame
root = Path(__file__).resolve().parents[1]
original = root / 'image/character/originals/charlotte.png'
im = Image.open(original).convert('RGB')
boxes = json.loads(original.with_name('charlotte-crops.json').read_text(encoding='utf-8'))
for kind, box in boxes.items():
    if kind not in ("select", "arena", "detail"): continue
    name = 'charlotte' + ('' if kind == 'arena' else '-' + kind) + '.png'
    export_frame(im, box, kind, root / 'image/character/portraits' / name, blur=.3 if kind == "select" else .2)
