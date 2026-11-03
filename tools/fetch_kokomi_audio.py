"""Preserve complete Chinese game voice recordings and provenance; no trimming."""
from pathlib import Path
import html, json, re, urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {'fan_miaosuan_select_voice1': '加入队伍·其一', 'fan_miaosuan_select_voice2': '加入队伍·其二', 'fan_miaosuan_select_voice3': '加入队伍·其三', 'fan_miaosuan_gain_voice1': '闲聊·准备', 'fan_miaosuan_gain_voice2': '初次见面…', 'fan_miaosuan_chengshi_voice1': '突破的感受·承', 'fan_miaosuan_chengshi_voice2': '突破的感受·转', 'fan_haiji1': '元素爆发·其一', 'fan_haiji2': '元素爆发·其二', 'fan_haiji3': '元素爆发·其三', 'fan_kokomi1': '倒下·其一', 'fan_kokomi2': '倒下·其二', 'fan_kokomi3': '倒下·其三'}

def main():
    directory = ROOT / 'audio/kokomi'
    source = (directory / 'originals/kokomi-voice-page.html').read_text(encoding='utf8')
    clips = {}
    for name, label in ENTRIES.items():
        section = html.unescape(source[source.index('>' + label + '<'):])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
        text = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', section, re.S).group(1)
        text = re.sub('<[^>]+>', '', text.replace('<br />', '\n').replace('<br>', '\n')).strip()
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = f'audio/kokomi/originals/{name}.mp3'
        output = f'audio/kokomi/{"die" if name.startswith("fan_kokomi") else "skill"}/{name}.mp3'
        (ROOT/output).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/original).write_bytes(data)
        (ROOT/output).write_bytes(data)
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original,output=output,output_bytes=len(data),trim_seconds=None)
        print(name, text, len(data))
    (directory/'originals/kokomi-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/珊瑚宫心海语音',language='zh-CN',verified_date='2026-11-01',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')

if __name__ == '__main__': main()
