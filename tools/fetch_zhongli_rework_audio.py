"""Download original Chinese Zhongli voice clips without transcoding."""
from pathlib import Path
import hashlib
import html
import json
import re
import urllib.parse
from fetch_yelan_audio import fetch

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {'fan_re_dixin_give1': '元素战技·其四', 'fan_re_dixin_give2': '元素战技·其五', 'fan_re_dixin_give3': '元素战技·其六', 'fan_re_dixin_remove1': '元素爆发·其一', 'fan_re_dixin_remove2': '元素爆发·其二', 'fan_re_dixin_remove3': '元素爆发·其三', 'fan_re_xianyou1': '闲聊·游览', 'fan_re_xianyou2': '闲聊·旅程', 'fan_re_zhongli1': '倒下·其一', 'fan_re_zhongli2': '倒下·其二', 'fan_re_zhongli3': '倒下·其三'}

def main():
    base = ROOT / 'audio/zhongli_rework'
    previous = base / 'originals/zhongli_rework-sources.json'
    if previous.exists() and any('volume' in c for c in json.loads(previous.read_text(encoding='utf8'))['clips'].values()):
        raise RuntimeError('Calibrated playback exists; do not overwrite it with raw source audio.')
    for folder in ['skill', 'die', 'originals']:
        (base / folder).mkdir(parents=True, exist_ok=True)
    page = 'https://wiki.biligame.com/ys/钟离语音'
    snapshot = base / 'originals/zhongli_rework-voice-page.html'
    if not snapshot.exists():
        snapshot.write_bytes(fetch('https://wiki.biligame.com/ys/' + urllib.parse.quote('钟离语音')))
    source = html.unescape(snapshot.read_text(encoding='utf8'))
    manifest = {'page': page, 'language': 'zh-CN', 'verified_date': '2026-11-04', 'clips': {}}
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
        output = base / ('die' if name.startswith('fan_re_zhongli') else 'skill') / (name + '.mp3')
        output.write_bytes(data)
        manifest['clips'][name] = {'label': label, 'text': text, 'url': url, 'bytes': len(data),
            'original': original.relative_to(ROOT).as_posix(), 'output': output.relative_to(ROOT).as_posix(),
            'output_bytes': len(data), 'trim_seconds': None, 'container': 'ogg' if data.startswith(b'OggS') else 'mp3'}
        print(name, len(data))
    (base / 'originals/zhongli_rework-sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
    catalog_path = ROOT / 'audio/catalog.json'
    catalog = [x for x in json.loads(catalog_path.read_text(encoding='utf8')) if x.get('role') != 'zhongli_rework']
    for path in sorted(base.rglob('*')):
        if path.suffix not in ['.ogg', '.mp3']:
            continue
        data = path.read_bytes()
        catalog.append({'role': 'zhongli_rework', 'path': path.relative_to(ROOT).as_posix(),
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__':
    main()
