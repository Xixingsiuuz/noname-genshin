"""Fetch Furina's Chinese originals; trim only the requested sunshine sentence."""
from pathlib import Path
import argparse, hashlib, html, json, re, subprocess, urllib.parse
from fetch_yelan_audio import fetch

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {
 **{'fan_shanyao_loss'+str(i):'元素战技·其'+n for i,n in enumerate(['一','二','三'],1)},
 **{'fan_shanyao_heal'+str(i):'元素战技·其'+n for i,n in enumerate(['四','五','六'],1)},
 **{'fan_huanyan'+str(i):'元素爆发·其'+n for i,n in enumerate(['一','二','三'],1)},
 'fan_shanyao_ally1':'同伴生命值低·其一','fan_shanyao_ally2':'同伴生命值低·其二',
 'fan_zhongyu_success':'初次见面…','fan_zhongyu_failure':'下雨的时候…',
 'fan_duqi1':'倒下·其一','fan_duqi2':'倒下·其二','fan_furina':'倒下·其三',
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg')
    parser.add_argument('--trim', nargs=2, type=float)
    args = parser.parse_args()
    base = ROOT/'audio/furina'
    for folder in ['skill', 'die', 'originals']: (base/folder).mkdir(parents=True, exist_ok=True)
    page = 'https://wiki.biligame.com/ys/' + urllib.parse.quote('芙宁娜语音')
    snapshot = base/'originals/furina-voice-page.html'
    if not snapshot.exists(): snapshot.write_text(fetch(page).decode('utf8'), encoding='utf8')
    source = snapshot.read_text(encoding='utf8')
    manifest = {'page':page, 'language':'zh-CN', 'verified_date':'2026-11-02', 'clips':{}}
    for name, label in ENTRIES.items():
        start = source.index('>'+label+'<')
        section = html.unescape(source[start:start+3000])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.(?:mp3|ogg))"', section).group(1)
        original = base/'originals'/(label+Path(url).suffix)
        if not original.exists(): original.write_bytes(fetch(url))
        data = original.read_bytes()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        output = base/('die' if name.startswith('fan_furina') else 'skill')/(name+'.mp3')
        trim = None
        if name == 'fan_zhongyu_success':
            if not args.trim: raise ValueError("success requires --trim and --ffmpeg")
            if args.trim:
                assert args.ffmpeg
                trim = args.trim
                subprocess.run([args.ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(trim[0]), '-i', str(original), '-t', str(trim[1]-trim[0]), '-c:a', 'libmp3lame', '-q:a', '2', str(output)], check=True)
        else: output.write_bytes(data)
        manifest['clips'][name] = {'label':label,'url':url,'bytes':len(data),'original':original.relative_to(ROOT).as_posix(),'output':output.relative_to(ROOT).as_posix(),'output_bytes':output.stat().st_size if output.exists() else None,'trim_seconds':trim}
        print(name, label, len(data))
    (base/'originals/furina-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    catalog_path=ROOT/'audio/catalog.json'
    catalog=[x for x in json.loads(catalog_path.read_text(encoding='utf8')) if x.get('role')!='furina']
    for path in sorted(base.rglob('*')):
        if path.suffix not in ('.mp3','.ogg'): continue
        data=path.read_bytes()
        catalog.append({'role':'furina','path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

if __name__ == '__main__': main()
