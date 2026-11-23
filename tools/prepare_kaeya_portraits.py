"""Re-export Kaeya from the preserved original and fixed-aspect crop boxes."""
from pathlib import Path
import json
from PIL import Image
from portrait_frames import export_frame
root = Path(__file__).resolve().parents[1] / 'image/character'
original = Image.open(root / 'originals/kaeya.png').convert('RGB')
boxes = json.loads((root / 'originals/kaeya-crops.json').read_text())
for kind, box in boxes.items():
    name = 'kaeya' + ('' if kind == 'arena' else '-' + kind) + '.png'
    export_frame(original, box, kind, root / 'portraits' / name, blur=.25)
