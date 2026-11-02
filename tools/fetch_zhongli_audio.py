"""Download original Chinese Zhongli voice clips without transcoding."""
from pathlib import Path
import hashlib
import html
import json
import re
import urllib.parse
from fetch_yelan_audio import fetch

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {
    'fan_dixin_give1': '元素战技·其五',
    'fan_dixin_give2': '元素战技·其六',
    'fan_dixin_remove': '元素战技·其三',
    'fan_qianyan_armor': '元素战技·其四',
    'fan_xianyou': '闲聊·旅程',
    'fan_zhongli': '倒下·其三',
}

def main():
    base = ROOT / 'audio/zhongli'
    for folder in ['skill', 'die', 'originals']:
        (base / folder).mkdir(parents=True, exist_ok=True)
    page = 'https://wiki.biligame.com/ys/钟离语音'
    snapshot = base / 'originals/zhongli-voice-page.html'
    if not snapshot.exists():
        snapshot.write_bytes(fetch('https://wiki.biligame.com/ys/' + urllib.parse.quote('钟离语音')))
    source = html.unescape(snapshot.read_text(encoding='utf8'))
    manifest = {'page': page, 'language': 'zh-CN', 'verified_date': '2026-10-26', 'clips': {}}
    for name, label in ENTRIES.items():
        start = source.index('>' + label + '<')
        section = source[start:start + 5000]
        url = re.search(r'data-src="(https://patchwiki[^"<>]+\.(?:ogg|mp3))"', section).group(1)
        text = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', section, re.S).group(1)
        text = re.sub('<[^>]+>', '', text).strip()
        original = base / 'originals' / (name + Path(url).suffix)
        data = original.read_bytes() if original.exists() else fetch(url)
        assert len(data) > 1000 and not data.lstrip().startswith(b'<'), name
        original.write_bytes(data)
        output = base / ('die' if name == 'fan_zhongli' else 'skill') / (name + '.mp3')
        output.write_bytes(data)
        manifest['clips'][name] = {'label': label, 'text': text, 'url': url, 'bytes': len(data),
            'original': original.relative_to(ROOT).as_posix(), 'output': output.relative_to(ROOT).as_posix(),
            'output_bytes': len(data), 'trim_seconds': None, 'container': 'ogg' if data.startswith(b'OggS') else 'mp3'}
        print(name, len(data))
    (base / 'originals/zhongli-sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
    catalog_path = ROOT / 'audio/catalog.json'
    catalog = [x for x in json.loads(catalog_path.read_text(encoding='utf8')) if x['role'] != 'zhongli']
    for path in sorted(base.rglob('*')):
        if path.suffix not in ['.ogg', '.mp3']:
            continue
        data = path.read_bytes()
        catalog.append({'role': 'zhongli', 'path': path.relative_to(ROOT).as_posix(),
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__':
    main()
