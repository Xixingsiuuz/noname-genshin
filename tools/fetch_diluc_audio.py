"""Download the selected complete Chinese originals; no synthesis or speed changes."""
from pathlib import Path
import urllib.request, urllib.parse, json, re, html

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'audio/diluc'
def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(url, safe=':/?=&%'), headers={'User-Agent': 'Mozilla/5.0'}), timeout=40).read()

def main():
    url = 'https://api-takumi-static.mihoyo.com/common/blackboard/ys_obc/v1/content/info?app_sn=ys_obc&content_id=75'
    data = fetch(url)
    (BASE/'originals/diluc-official.json').write_bytes(data)
    content = json.loads(data)['data']['content']
    entries = []
    def walk(item):
        if isinstance(item, dict):
            if item.get('audio'): entries.append(item)
            for value in item.values(): walk(value)
        elif isinstance(item, list):
            for value in item: walk(value)
    for section in content['contents']:
        for encoded in re.findall(r'data-data="([^"]+)"', section['text']):
            walk(json.loads(urllib.parse.unquote(html.unescape(encoded))))
    labels = {'fan_niyan1':'元素战技·其一', 'fan_niyan2':'元素战技·其二', 'fan_niyan3':'元素战技·其三',
              'fan_chenxi1':'中午好…', 'fan_chenxi2':'闲聊·放松', 'fan_diluc':'倒下·其一'}
    clips = {}
    expected = {'fan_niyan1':'呵。', 'fan_niyan2':'哈。', 'fan_niyan3':'哈！——',
                'fan_chenxi1':'想试试隐藏菜单吗？', 'fan_chenxi2':'偶尔悠闲一下，也不错。', 'fan_diluc':'计划…出错了吗…'}
    for name, label in labels.items():
        choices = [entry for entry in entries if entry.get('name') == label]
        assert choices, (label, [entry.get('name') for entry in entries][-35:])
        entry = choices[0]  # The first language table is Chinese; validate its text below.
        assert entry.get('content') == expected[name], 'Chinese voice text changed; review source before downloading'
        print(name, entry)
        audio = fetch(entry['audio'])
        assert len(audio) > 1000 and not audio.lstrip().startswith(b'<')
        folder = 'die' if name == 'fan_diluc' else 'skill'
        output = BASE/folder/(name+'.mp3'); output.parent.mkdir(parents=True, exist_ok=True)
        original = BASE/'originals'/(name+'.mp3')
        output.write_bytes(audio); original.write_bytes(audio)
        clips[name] = {'name':label, 'content':entry.get('content'), 'audio_url':entry['audio'],
                       'bytes':len(audio), 'output_bytes':len(audio),
                       'output':output.relative_to(ROOT).as_posix(), 'original':original.relative_to(ROOT).as_posix(), 'trim_seconds':None}
    (BASE/'originals/diluc-sources.json').write_text(json.dumps({'page':'https://baike.mihoyo.com/ys/obc/content/75/detail', 'api':url, 'language':'zh-CN', 'clips':clips}, ensure_ascii=False, indent=2), encoding='utf8')

if __name__ == '__main__':
    main()
