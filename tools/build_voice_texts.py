"""Build native subtitle keys from local provenance and saved Chinese voice pages."""
from pathlib import Path
import html
import json
import re
import argparse

ROOT = Path(__file__).resolve().parents[1]
overrides = {
    'fan_bailu': '失礼了。', 'fan_binghua_intro': '稻妻神里流太刀术皆传——神里绫华，参上！',
    'fan_binghua_choice': '请多指教哦。', 'fan_binghua_take': '…拿下了！',
    'fan_moran1': '刀剑抱业，名工怀宝。', 'fan_moran2': '雪霁银妆素，桔高映琼枝。',
    'fan_ayaka': '失态了…', 'fan_sanxing2': '万事皆有代价。',
    'fan_yunjian_full1': '数理是世间之基。', 'fan_langhua_start': '视野不错！',
    # 核对 https://wiki.biligame.com/ys/宵宫语音 （2026-10-26）。
    'fan_xiaji': '想看烟花吗？', 'fan_huahuo1': '点燃引信！', 'fan_huahuo2': '小心火烛~',
    'fan_xiaji_burst1': '祭典重现！', 'fan_xiaji_burst2': '金鱼来啦！',
    'fan_xiaji_burst3': '烟花来喽！', 'fan_yoimiya': '一不小心就…',
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--role', help='Update one role while preserving other verified subtitles')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'audio/catalog.json').read_text(encoding='utf8'))
    for entry in catalog:
        entry.setdefault('role', entry['path'].split('/')[1])
    result = {}
    if args.role:
        existing = (ROOT / 'character/voices.js').read_text(encoding='utf8')
        result = json.loads(existing.split('export default ', 1)[1].rstrip().removesuffix(';'))
        result = {k: v for k, v in result.items() if not k.startswith('#ext:原神/audio/' + args.role + '/')}
    for role in sorted({entry['role'] for entry in catalog}):
        if args.role and role != args.role:
            continue
        directory = ROOT / 'audio' / role / 'originals'
        manifests = list(directory.glob('*sources.json'))
        records = {}
        if manifests:
            data = json.loads(manifests[0].read_text(encoding='utf8'))
            clips = data.get('clips', data)
            records = clips if isinstance(clips, dict) else {Path(c.get('output') or c['path']).stem: c for c in clips}
        pages = list(directory.glob('*voice-page.html'))
        page = pages[0].read_text(encoding='utf8') if pages else ''
        for entry in [e for e in catalog if e['role'] == role and '/originals/' not in e['path']]:
            path = Path(entry['path'])
            name = path.stem
            lookup = name.replace('fan_xiayin1', 'fan_xiayin_flip1').replace('fan_xiayin2', 'fan_xiayin_flip2')
            record = next((c for c in records.values() if c.get('output') == entry['path']), records.get(lookup, {}))
            text = overrides.get(name) or record.get('text') or record.get('content')
            label = record.get('label', '')
            if not text and label.startswith(('兹白，', '兹踞，', '兹踬，', '兹蹻，')):
                text = label.split('，', 1)[1].replace('...', '…')
            if not text and label and page:
                start = page.index('>' + label + '<')
                match = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', page[start:], re.S)
                if match:
                    text = html.unescape(re.sub('<[^>]+>', '', match[1])).strip()
            if not text:
                raise ValueError((role, name, label))
            key = '#ext:原神/' + str(path.with_suffix('')).replace('\\', '/')
            if path.parent.name == 'die':
                key += ':die'
            result[key] = text
    output = '// 原生 Audio 按完整扩展路径读取台词；由 tools/build_voice_texts.py 生成。\nexport default ' + json.dumps(result, ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'character/voices.js').write_text(output, encoding='utf8')
    print(f'Built {len(result)} native voice subtitles')

if __name__ == '__main__':
    main()
