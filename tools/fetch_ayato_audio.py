"""Fetch official Chinese originals and reproduce the selected clips.
Usage: python tools/fetch_ayato_audio.py --ffmpeg /path/to/ffmpeg
"""
from pathlib import Path
import argparse,json,urllib.request,subprocess
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--ffmpeg',default='ffmpeg')
args=parser.parse_args()
manifest_path=ROOT/'audio/ayato/originals/ayato-sources.json'
manifest=json.loads(manifest_path.read_text(encoding='utf8'))
for name,clip in manifest['clips'].items():
    data=urllib.request.urlopen(urllib.request.Request(clip['audio_url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
    assert len(data)>1000 and not data.lstrip().startswith(b'<')
    original=ROOT/clip['original'];original.write_bytes(data)
    output=ROOT/clip['output']
    if clip['trim_seconds']:
        start,end=clip['trim_seconds']
        subprocess.run([args.ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(start),'-i',str(original),'-t',str(end-start),'-c:a','copy',str(output)],check=True)
    else:
        output.write_bytes(data)
    clip['bytes']=len(data);clip['output_bytes']=output.stat().st_size
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
