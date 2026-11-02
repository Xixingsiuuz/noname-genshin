"""Fetch Klee's confirmed Chinese voice pools; keep untouched source files."""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json, hashlib
ROOT = Path(__file__).resolve().parents[1]
PAGE = 'https://wiki.biligame.com/ys/可莉语音'
def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(url, safe=':/%?=&'), headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}), timeout=45).read()
def main():
    base = ROOT/'audio/klee'
    for folder in ['originals','skill','die']: (base/folder).mkdir(parents=True, exist_ok=True)
    saved = base/'originals/klee-voice-page.html'
    page = saved.read_text(encoding='utf8') if saved.exists() else fetch(PAGE).decode('utf8')
    saved.write_text(page, encoding='utf8')
    clips = {}
    entries = {'fan_huohua_blast1':'元素战技·其一', 'fan_huohua_blast2':'元素爆发·其一',
               'fan_taopao1':'冲刺开始·其一','fan_taopao2':'冲刺开始·其二','fan_taopao3':'生命值低·其二',
               'fan_klee':'倒下·其一'}
    for name,label in entries.items():
        start = page.index('>'+label+'<'); chunk = page[start:start+3500]
        url = html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0])
        text = html.unescape(re.sub('<[^>]+>', '', re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',chunk,re.S)[1])).strip()
        data = fetch(url)
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = base/'originals'/(name+'.mp3')
        original.write_bytes(data)
        output = base/('die' if name=='fan_klee' else 'skill')/(name+'.mp3')
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original.relative_to(ROOT).as_posix(),output=output.relative_to(ROOT).as_posix(),trim_seconds=None)
        print(name,label,len(data))
    local = Path(r'C:\Users\22697\Downloads\可莉语音\可莉，磅！.mp3')
    original = base/'originals/fan_huohua_blast3.mp3'
    original.write_bytes(local.read_bytes())
    clips['fan_huohua_blast3'] = dict(label='用户指定：可莉，磅！',text='可莉，磅！',url=None,source_path=str(local),bytes=original.stat().st_size,original=original.relative_to(ROOT).as_posix(),output='audio/klee/skill/fan_huohua_blast3.mp3',trim_seconds=None,text_verification='用户文件名，尚未人工试听')
    for clip in clips.values(): clip['original_sha256']=hashlib.sha256((ROOT/clip['original']).read_bytes()).hexdigest()
    (base/'originals/klee-sources.json').write_text(json.dumps(dict(page=PAGE,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__': main()
