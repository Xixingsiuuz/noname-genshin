"""Preserve complete Chinese game voice recordings and provenance; no trimming."""
from pathlib import Path
import html, json, re, urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {
    'fan_xuanlie_sha_voice1': '元素战技·其四',
    'fan_xuanlie_sha_voice2': '元素战技·其五',
    'fan_xuanlie_gain_voice1': '打开宝箱·其一',
    'fan_xuanlie_gain_voice2': '打开宝箱·其二',
    'fan_shouxing_yang_voice1': '元素战技·其六',
    'fan_shouxing_yang_voice2': '加入队伍·其二',
    'fan_shouxing_yin_voice1': '加入队伍·其一',
    'fan_shouxing_yin_voice2': '加入队伍·其三',
    'fan_kinich1': '倒下·其一',
    'fan_kinich2': '倒下·其二',
}

def main():
    directory = ROOT / 'audio/kinich'
    source = (directory / 'originals/kinich-voice-page.html').read_text(encoding='utf8')
    clips = {}
    for name, label in ENTRIES.items():
        section = html.unescape(source[source.index('>' + label + '<'):])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
        text = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', section, re.S).group(1)
        text = re.sub('<[^>]+>', '', text.replace('<br />', '\n').replace('<br>', '\n')).strip()
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = f'audio/kinich/originals/{name}.mp3'
        output = f'audio/kinich/{"die" if name.startswith("fan_kinich") else "skill"}/{name}.mp3'
        (ROOT/output).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/original).write_bytes(data)
        (ROOT/output).write_bytes(data)
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original,output=output,output_bytes=len(data),trim_seconds=None)
        print(name, text, len(data))
    (directory/'originals/kinich-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/基尼奇语音',language='zh-CN',verified_date='2026-11-01',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')

if __name__ == '__main__': main()
