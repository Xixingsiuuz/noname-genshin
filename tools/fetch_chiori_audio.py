"""Preserve complete Chinese game voice recordings and provenance; no trimming."""
from pathlib import Path
import html, json, re, urllib.request, urllib.parse

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {'fan_yuxiu1': '闲聊·评价', 'fan_yuxiu2': '闲聊·裁缝刀', 'fan_yuxiu3': '闲聊·模特', 'fan_yuxiu_use1': '元素战技·其一', 'fan_yuxiu_use2': '元素战技·其二', 'fan_yuxiu_use3': '元素战技·其三', 'fan_feiren1': '元素爆发·其一', 'fan_feiren2': '元素爆发·其二', 'fan_feiren3': '元素爆发·其三', 'fan_chiori1': '倒下·其一', 'fan_chiori2': '倒下·其二', 'fan_chiori3': '倒下·其三'}

def main():
    directory = ROOT / 'audio/chiori'
    (directory/'originals').mkdir(parents=True,exist_ok=True)
    source = urllib.request.urlopen(urllib.request.Request('https://wiki.biligame.com/ys/'+urllib.parse.quote('千织语音'),headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode('utf8')
    (directory/'originals/chiori-voice-page.html').write_text(source,encoding='utf8')
    clips = {}
    for name, label in ENTRIES.items():
        section = html.unescape(source[source.index('>' + label + '<'):])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
        text = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', section, re.S).group(1)
        text = re.sub('<[^>]+>', '', text.replace('<br />', '\n').replace('<br>', '\n')).strip()
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = f'audio/chiori/originals/{name}.mp3'
        output = f'audio/chiori/{"die" if name.startswith("fan_chiori") else "skill"}/{name}.mp3'
        (ROOT/output).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/original).write_bytes(data)
        (ROOT/output).write_bytes(data)
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original,output=output,output_bytes=len(data),trim_seconds=None)
        print(name, text, len(data))
    (directory/'originals/chiori-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/千织语音',language='zh-CN',verified_date='2026-11-03',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')

if __name__ == '__main__': main()
