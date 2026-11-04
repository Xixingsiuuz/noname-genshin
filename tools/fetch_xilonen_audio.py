"""Preserve complete Chinese game voice recordings and provenance; no trimming."""
from pathlib import Path
import html, json, re, urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {**{f'fan_duanyin{i}': '元素战技·其'+n for i,n in enumerate('一二三',1)}, **{f'fan_zhuhun{i}': '元素爆发·其'+n for i,n in enumerate('一二三',1)}, **{f'fan_xilonen{i}': '倒下·其'+n for i,n in enumerate('一二三',1)}}

def main():
    directory = ROOT / 'audio/xilonen'
    (directory/'originals').mkdir(parents=True,exist_ok=True)
    from urllib.parse import quote
    source = urllib.request.urlopen(urllib.request.Request('https://wiki.biligame.com/ys/'+quote('希诺宁语音'),headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode('utf8')
    (directory/'originals/xilonen-voice-page.html').write_text(source,encoding='utf8')
    clips = {}
    for name, label in ENTRIES.items():
        section = html.unescape(source[source.index('>' + label + '<'):])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
        text = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', section, re.S).group(1)
        text = re.sub('<[^>]+>', '', text.replace('<br />', '\n').replace('<br>', '\n')).strip()
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = f'audio/xilonen/originals/{name}.mp3'
        output = f'audio/xilonen/{"die" if name.startswith("fan_xilonen") else "skill"}/{name}.mp3'
        (ROOT/output).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/original).write_bytes(data)
        (ROOT/output).write_bytes(data)
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original,output=output,output_bytes=len(data),trim_seconds=None)
        print(name, text, len(data))
    (directory/'originals/xilonen-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/希诺宁语音',language='zh-CN',verified_date='2026-11-04',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')

if __name__ == '__main__': main()
