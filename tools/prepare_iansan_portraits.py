"""Iansan portrait adjustments from the preserved original; selection stays unchanged."""
from pathlib import Path
from PIL import Image
from portrait_frames import export_frame
ROOT=Path(__file__).resolve().parents[1]
im=Image.open(ROOT/'image/character/originals/iansan.png').convert('RGB')
# Arena 2:3: 710px -> 500px source width, about 42% larger.
export_frame(im,(100,470,600,1220),'arena',ROOT/'image/character/portraits/iansan.png',blur=.25)
# Detail 5:7: shift the same-size frame down 240 source pixels.
export_frame(im,(0,420,750,1470),'detail',ROOT/'image/character/portraits/iansan-detail.png',blur=.25)
