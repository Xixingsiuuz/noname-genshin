"""Fetch untouched Chinese in-game Itto voice clips and record provenance."""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json, hashlib
ROOT = Path(__file__).resolve().parents[1]
PAGE = 'https://wiki.biligame.com/ys/荒泷一斗语音'
def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(url, safe=':/%?=&'), headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}), timeout=45).read()
def main():
    base = ROOT/'audio/itto'
    for folder in ['originals','skill','die']: (base/folder).mkdir(parents=True, exist_ok=True)
    saved = base/'originals/itto-voice-page.html'
    page = saved.read_text(encoding='utf8') if saved.exists() else fetch(PAGE).decode('utf8')
    (base/'originals/itto-voice-page.html').write_text(page, encoding='utf8')
    entries = {'fan_guiwang_damage':'元素战技·其二','fan_guiwang1':'元素爆发·其一','fan_guiwang2':'元素爆发·其二',
        'fan_guiwang_hurt1':'普通受击·其一','fan_guiwang_hurt2':'普通受击·其二',
        
        'fan_yongyi1':'加入队伍·其一','fan_yongyi2':'加入队伍·其二',
        'fan_yongyi3':'元素战技·其三','fan_yongyi4':'元素战技·其一',
        'fan_yongyi_lose1':'打雷的时候…','fan_yongyi_lose2':'生命值低·其二','fan_yongyi_lose3':'加入队伍·其三',
        'fan_itto':'倒下·其一'}
    manifest_path = base/'originals/itto-sources.json'
    clips = json.loads(manifest_path.read_text(encoding='utf8')).get('clips', {}) if manifest_path.exists() else {}
    for name,label in entries.items():
        start = page.index('>'+label+'<'); chunk = page[start:start+3500]
        url = html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0])
        text = html.unescape(re.sub('<[^>]+>', '', re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',chunk,re.S)[1])).strip()
        data = fetch(url)
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = base/'originals'/(name+'.mp3'); output = base/('die' if name=='fan_itto' else 'skill')/(name+'.mp3')
        original.write_bytes(data); output.write_bytes(data)
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original.relative_to(ROOT).as_posix(),output=output.relative_to(ROOT).as_posix(),trim_seconds=None)
        if name == 'fan_yongyi_lose1':
            import subprocess, os
            ffmpeg = os.environ.get('ITTO_FFMPEG', 'ffmpeg')
            subprocess.run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-ss', '3.10', '-i', str(original), '-t', '2.4', '-c:a', 'copy', str(output)], check=True)
            clips[name].update(text='听着，本大爷就是不服！', trim_seconds=[3.10, 5.50])
        print(name,label,text,len(data))
    (base/'originals/itto-sources.json').write_text(json.dumps(dict(page=PAGE,clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__': main()
