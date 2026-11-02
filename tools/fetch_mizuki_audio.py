"""Preserve Emilie's Chinese originals and source entry metadata."""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'audio/mizuki/originals'
LABELS = ['加入队伍·其一','加入队伍·其二','元素战技·其一','元素战技·其二','元素爆发·其一','元素爆发·其二','元素爆发·其三','打开宝箱·其一','打开宝箱·其二','倒下·其一','倒下·其二','倒下·其三']

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://wiki.biligame.com/'}), timeout=45).read()

def main():
    BASE.mkdir(parents=True, exist_ok=True)
    url = 'https://wiki.biligame.com/ys/' + urllib.parse.quote('梦见月瑞希语音')
    page = BASE / 'voice-page.html'
    if not page.exists(): page.write_bytes(fetch(url))
    source = page.read_text(encoding='utf8')
    entries = {}
    for index, label in enumerate(LABELS):
        start = source.index('>' + label + '<')
        block = source[start:start+6500]
        audio_url = html.unescape(re.findall(r'https[^"<> ]+\.mp3', block)[0])
        match = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', block, re.S)
        text = html.unescape(re.sub('<[^>]+>', '', match[1])).strip()
        original = BASE / f'source-{index+1:02}.mp3'
        if not original.exists(): original.write_bytes(fetch(audio_url))
        assert original.stat().st_size > 1000
        entries[label] = dict(url=audio_url, text=text, original=original.relative_to(ROOT).as_posix(), bytes=original.stat().st_size)
    (BASE/'entries.json').write_text(json.dumps(dict(page=url, entries=entries), ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(entries, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
