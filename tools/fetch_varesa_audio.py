"""Preserve complete Chinese game voice recordings and provenance; no trimming."""
from pathlib import Path
import html, json, re, urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {'fan_shanlie_damage_voice1': '元素战技·其一', 'fan_shanlie_damage_voice2': '元素战技·其二', 'fan_shanlie_damage_voice3': '元素战技·其三', 'fan_shanlie_recover_voice1': '元素战技·其五', 'fan_shanlie_recover_voice2': '元素战技·其六', 'fan_haoyan_full': '突破的感受·承', 'fan_varesa1': '倒下·其一', 'fan_varesa2': '倒下·其二', 'fan_varesa3': '倒下·其三'}

def main():
    directory = ROOT / 'audio/varesa'
    source = (directory / 'originals/varesa-voice-page.html').read_text(encoding='utf8')
    clips = {}
    for name, label in ENTRIES.items():
        section = html.unescape(source[source.index('>' + label + '<'):])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
        text = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', section, re.S).group(1)
        text = re.sub('<[^>]+>', '', text.replace('<br />', '\n').replace('<br>', '\n')).strip()
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = f'audio/varesa/originals/{name}.mp3'
        output = f'audio/varesa/{"die" if name.startswith("fan_varesa") else "skill"}/{name}.mp3'
        (ROOT/output).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/original).write_bytes(data)
        (ROOT/output).write_bytes(data)
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original,output=output,output_bytes=len(data),trim_seconds=None)
        print(name, text, len(data))
    (directory/'originals/varesa-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/瓦雷莎语音',language='zh-CN',verified_date='2026-11-04',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')

if __name__ == '__main__': main()
