"""Create 400x560 game portraits without modifying source illustrations.

Run from any directory with Python and Pillow installed.
Crop boxes are measured in the original image after EXIF orientation.
"""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "image" / "character"
OUTPUT = SOURCE / "portraits"
SIZE = (400, 560)

# Each box frames the character's head and main pose rather than poster margins.
PORTRAITS = {
    "albedo": ("originals/albedo.png", (920, 0, 2420, 2100)),
    "ajax": ("originals/ajax.png", (890, 195, 1120, 517)),
    "klee": ("originals/klee.png", (680, 60, 2280, 2300)),
    "eula": ("originals/eula.png", (500, 70, 2000, 2170)),
    "keqing": ("originals/keqing.png", (640, 180, 2240, 2420)),
    "diluc": ("originals/diluc.png", (885, 140, 1185, 560)),
    "shenhe": ("originals/shenhe.jpg", (1650, 0, 3070, 1988)),
    "yelan": ("originals/yelan.png", (1125, 75, 2925, 2595)),
    "ayato": ("originals/ayato.png", (400, 0, 1900, 2100)),
    "raiden": ("raiden-portrait.png", (0, 0, 1060, 1484)),
    "venti": ("originals/venti.png", (100, 60, 550, 690)),
    "nilou": ("originals/nilou.png", (170, 0, 820, 910)),
    "zibai": ("originals/zibai-2026.avif", (120, 0, 820, 980)),
    "varka": ("originals/varka.png", (230, 245, 610, 777)),
    "columbina": ("columbina.png", (250, 100, 1750, 2200)),
    "flins": ("flins.jpg", (40, 0, 1040, 1400)),
    "lauma": ("lauma.png", (180, 0, 830, 910)),
    "ineffa": ("ineffa.png", (145, 35, 795, 945)),
    "navia": ("navia.avif", (235, 0, 985, 1050)),
    "nahida": ("nahida.png", (60, 0, 560, 700)),
    "mizuki": ("mizuki.png", (115, 0, 615, 700)),
    "wriothesley": ("wriothesley.jpg", (100, 160, 1350, 1910)),
    "escoffier": ("escoffier.jpg", (50, 0, 550, 700)),
    "varesa": ("varesa.png", (190, 0, 890, 980)),
    "mualani": ("mualani-portrait.png", (0, 10, 750, 1060)),
    "emilie": ("emilie.png", (115, 0, 615, 700)),
    "sigewinne": ("sigewinne.jpg", (170, 0, 670, 700)),
    "clorinde": ("clorinde.png", (215, 90, 465, 440)),
    "chiori": ("chiori.jpg", (160, 30, 600, 646)),
    "xianyun": ("闲云2026.png", (120, 0, 820, 980)),
    "furina": ("furina.avif", (170, 0, 870, 980)),
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (filename, box) in PORTRAITS.items():
        with Image.open(SOURCE / filename) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            left, top, right, bottom = box
            assert 0 <= left < right <= image.width
            assert 0 <= top < bottom <= image.height
            assert (right - left) * SIZE[1] == (bottom - top) * SIZE[0]
            portrait = image.crop(box).resize(SIZE, Image.Resampling.LANCZOS)
            portrait.save(OUTPUT / f"{name}.png", optimize=True)
        print(f"{name}: {SIZE[0]}x{SIZE[1]}")


if __name__ == "__main__":
    main()
