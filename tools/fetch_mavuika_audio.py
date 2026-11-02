"""Fetch untouched Chinese Mavuika voice clips, with per-file provenance."""
from pathlib import Path
import hashlib
import html
import json
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PAGE = 'https://wiki.biligame.com/ys/玛薇卡语音'
ENTRIES = {
    'fan_chihun_gain1': ('元素战技·其一', '战意实际增加'),
    'fan_chihun_gain2': ('元素战技·其三', '战意实际增加'),
    'fan_chihun_gain3': ('元素战技·其二', '战意实际增加'),
    'fan_chihun_overflow1': ('打开宝箱·其三', '满额改为摸牌'),
    'fan_chihun_overflow2': ('元素战技·其四', '满额改为摸牌'),
    'fan_chihun_convert1': ('加入队伍·其二', '确认换用基本牌'),
    'fan_chihun_convert2': ('加入队伍·其三', '确认换用基本牌'),
    'fan_fentian_charge1': ('元素战技·其五', '支付战意增加出杀额度'),
    'fan_fentian_charge2': ('元素战技·其六', '支付战意增加出杀额度'),
    'fan_fentian_fire1': ('元素爆发·其一', '确认阶段末火焰伤害'),
    'fan_fentian_fire2': ('元素爆发·其二', '确认阶段末火焰伤害'),
    'fan_fentian_fire3': ('元素爆发·其三', '确认阶段末火焰伤害'),
    'fan_zailin': ('生命值低·其三', '确认濒死发动再临'),
    'fan_mavuika': ('倒下·其一', '阵亡'),
}

def fetch(url):
    request = urllib.request.Request(urllib.parse.quote(url, safe=':/%?=&'),
        headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://wiki.biligame.com/'})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()

def main():
    base = ROOT / 'audio/mavuika'
    for folder in ['originals', 'skill', 'die']:
        (base / folder).mkdir(parents=True, exist_ok=True)
    saved = base / 'originals/mavuika-voice-page.html'
    if not saved.exists():
        saved.write_bytes(fetch(PAGE))
    page = saved.read_text(encoding='utf8')
    manifest = base / 'originals/mavuika-sources.json'
    previous = json.loads(manifest.read_text(encoding='utf8')) if manifest.exists() else {'clips': {}}
    by_label = {clip['label']: clip for clip in previous['clips'].values()}
    assert set(by_label).issubset({label for label, _ in ENTRIES.values()}), 'Recycle unused audio explicitly first'
    # Stage renamed files before moving, so pool-number changes never overwrite a clip.
    moves = []
    for name, (label, _) in ENTRIES.items():
        old = by_label.get(label)
        if not old:
            continue
        for key, folder in [('original', 'originals'), ('output', 'die' if name == 'fan_mavuika' else 'skill')]:
            source = ROOT / old[key]
            destination = base / folder / (name + '.mp3')
            if source != destination and source.exists():
                staging = source.with_suffix('.pool-move')
                assert not staging.exists(), staging
                moves.append((source, staging, destination))
    for source, staging, _ in moves:
        source.rename(staging)
    for _, staging, destination in moves:
        assert not destination.exists(), destination
        staging.rename(destination)
    # Commit moved paths before downloading, so a network failure can be resumed.
    moved_clips = {}
    for name, (label, purpose) in ENTRIES.items():
        if label not in by_label:
            continue
        old = by_label[label]
        old.update(purpose=purpose,
            original=f'audio/mavuika/originals/{name}.mp3',
            output=f'audio/mavuika/{"die" if name == "fan_mavuika" else "skill"}/{name}.mp3')
        if 'volume' in old:
            old['volume'] = dict(old['volume'], id=name)
        moved_clips[name] = old
    if manifest.exists():
        manifest.write_text(json.dumps(dict(page=PAGE, clips=moved_clips), ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    clips = {}
    for name, (label, purpose) in ENTRIES.items():
        start = page.index('>' + label + '<')
        chunk = page[start:start + 3500]
        url = html.unescape(re.findall(r'https[^"<> ]+\.mp3', chunk)[0])
        match = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', chunk, re.S)
        text = html.unescape(re.sub('<[^>]+>', '', match[1])).strip()
        original = base / 'originals' / (name + '.mp3')
        if not original.exists():
            data = fetch(url)
            assert len(data) > 1000 and not data.lstrip().startswith(b'<'), name
            original.write_bytes(data)
        data = original.read_bytes()
        output = base / ('die' if name == 'fan_mavuika' else 'skill') / (name + '.mp3')
        old = by_label.get(label, {})
        clips[name] = dict(old, label=label, text=text, purpose=purpose, url=url,
            bytes=len(data), original_sha256=hashlib.sha256(data).hexdigest(),
            original=original.relative_to(ROOT).as_posix(),
            output=output.relative_to(ROOT).as_posix(), trim_seconds=None)
        if 'volume' in clips[name]:
            clips[name]['volume'] = dict(clips[name]['volume'], id=name)
        print(name, label, text, len(data))
    manifest.write_text(json.dumps(dict(page=PAGE, clips=clips), ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__':
    main()
