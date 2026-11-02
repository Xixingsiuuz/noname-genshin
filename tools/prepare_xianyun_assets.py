"""Keep supplied originals; extract illustrations for the engine's native card frame."""
from pathlib import Path
from PIL import Image
import shutil
ROOT = Path(__file__).resolve().parents[1]
TEMP = Path('C:/Users/22697/AppData/Local/Temp')
FILES = {
 'fan_pengrenshenji': 'codex-clipboard-e3526846-33cc-4162-9561-5c105c049d23.png',
 'fan_zhuxing': 'codex-clipboard-b65ac723-b5e6-4663-9b73-c95c00a59b54.png',
 'fan_guizhongji': 'codex-clipboard-8ee1ae68-dadd-4143-903d-0627c1dd8e10.png',
 'fan_chengehu': 'codex-clipboard-23789288-016f-4d4b-9c22-82386a0b0c63.png',
}
def main():
    directory = ROOT/'image/card/originals'; directory.mkdir(parents=True,exist_ok=True)
    for name,file in FILES.items():
        original = directory/(name+'-20261027.png')
        if not original.exists(): shutil.copy2(TEMP/file,original)
        # Exclude the supplied card's text/frame; native UI supplies suit, rank and title.
        image = Image.open(original).convert('RGB').crop((205,305,900,985))
        output = ROOT/'image/card'/(name+'-mechanism.png')
        image.resize((360,352),Image.Resampling.LANCZOS).save(output)
    directory = ROOT/'image/character/originals'; directory.mkdir(parents=True,exist_ok=True)
    source = directory/'xianyun-20261027.png'
    if not source.exists(): shutil.copy2(TEMP/'codex-clipboard-10024142-227e-4075-a50f-2753b737435b.png',source)
    Image.open(source).convert('RGB').crop((215,35,715,735)).resize((400,560),Image.Resampling.LANCZOS).save(ROOT/'image/character/portraits/xianyun-20261027.png')
if __name__=='__main__': main()
