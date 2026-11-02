"""Fetch Eula's Chinese originals; trim only the requested sunshine sentence."""
from pathlib import Path
import argparse, hashlib, html, json, re, subprocess, urllib.parse
from fetch_yelan_audio import fetch

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {
    'fan_langhua_start': '阳光很好…',
    'fan_langhua_low1': '元素战技·其二', 'fan_langhua_low2': '元素战技·其三',
    'fan_langhua_mid1': '元素战技·其一', 'fan_langhua_mid2': '元素战技·其六',
    'fan_langhua_high1': '元素爆发·其一', 'fan_langhua_high2': '元素爆发·其三',
    'fan_eula': '倒下·其一',
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg')
    parser.add_argument('--trim', nargs=2, type=float)
    args = parser.parse_args()
    base = ROOT/'audio/eula'
    for folder in ['skill', 'die', 'originals']: (base/folder).mkdir(parents=True, exist_ok=True)
    page = 'https://wiki.biligame.com/ys/' + urllib.parse.quote('优菈语音')
    snapshot = base/'originals/eula-voice-page.html'
    if not snapshot.exists(): snapshot.write_text(fetch(page).decode('utf8'), encoding='utf8')
    source = snapshot.read_text(encoding='utf8')
    manifest = {'page':page, 'language':'zh-CN', 'verified_date':'2026-10-26', 'clips':{}}
    for name, label in ENTRIES.items():
        start = source.index('>'+label+'<')
        section = html.unescape(source[start:start+3000])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.(?:mp3|ogg))"', section).group(1)
        original = base/'originals'/(name+Path(url).suffix)
        if not original.exists(): original.write_bytes(fetch(url))
        data = original.read_bytes()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        output = base/('die' if name=='fan_eula' else 'skill')/(name+'.mp3')
        trim = None
        if name == 'fan_langhua_start':
            if args.trim:
                assert args.ffmpeg
                trim = args.trim
                subprocess.run([args.ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(trim[0]), '-i', str(original), '-t', str(trim[1]-trim[0]), '-c:a', 'libmp3lame', '-q:a', '2', str(output)], check=True)
        else: output.write_bytes(data)
        manifest['clips'][name] = {'label':label,'url':url,'bytes':len(data),'original':original.relative_to(ROOT).as_posix(),'output':output.relative_to(ROOT).as_posix(),'output_bytes':output.stat().st_size if output.exists() else None,'trim_seconds':trim}
        print(name, label, len(data))
    (base/'originals/eula-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    catalog_path=ROOT/'audio/catalog.json'
    catalog=[x for x in json.loads(catalog_path.read_text(encoding='utf8')) if x['role']!='eula']
    for path in sorted(base.rglob('*')):
        if path.suffix not in ('.mp3','.ogg'): continue
        data=path.read_bytes()
        catalog.append({'role':'eula','path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

if __name__ == '__main__': main()
