"""Preserve user recordings and BWIKI Chinese originals; prepare native skill audio.

Usage: python tools/fetch_zibai_audio.py --ffmpeg /path/to/ffmpeg.exe
"""
from pathlib import Path
import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PAGE = 'https://wiki.biligame.com/ys/兹白语音'
LOCAL = {
    'fan_yanjian_full_damage3': '兹踬，黄毛小儿！',
    'fan_sanxiang_leave_yun': '兹踞，再见...愿月光永远照耀你',
    'fan_sanxiang_leave_yan': '兹踬，是时候了，拿走你要的东西吧',
    'fan_sanxiang_leave_ren1': '兹蹻，水无定，花有尽，会相逢',
    'fan_sanxiang_leave_ren2': '兹蹻，不怕人生长在别离中',
    'fan_yunjian_form1': '兹踞，你看起来很困惑...',
    'fan_yunjian_form2': '兹踞，我一直也走不到头',
    'fan_yanjian_damage1': '兹踬，黄毛小儿！',
    'fan_yanjian_damage2': '兹踬，执迷不悟！',
    'fan_yanjian_control_voice1': '兹踬，来吧，向我展示你的决心！',
    'fan_yanjian_control_voice2': '兹踬，我将以时间的诅咒和此身的记忆回应你！',
    'fan_renjian_reveal1': '兹蹻，本仙就是白马仙人',
    'fan_renjian_reveal2': '兹蹻，我是真的白马仙人',
    'fan_renjian_gift': '兹蹻，你这人...倒也有几分趣味',
    'fan_yunjian_full2': '兹白，对应的折扣数为九，八，五',
    'fan_yunjian_full3': '兹白，折扣就应该是五折再减五折，零折',
    'fan_yunjian_full4': '兹白，你...可曾学习过语文？',
    'fan_yanjian_full_control_voice': '兹白，你是那不知天高地厚的黄毛小儿，屡次三番前来阻我',
    'fan_renjian_full_reveal1': '兹白，好了，看，它长大了',
    'fan_renjian_full_reveal2': '兹白，那这不就是白马仙人显灵吗',
    'fan_renjian_full_gift': '兹白，既然你想好了，那就放手去做吧',
}
WEB = {
    'fan_nichi1': '元素爆发·其一', 'fan_nichi2': '元素爆发·其二', 'fan_nichi3': '元素爆发·其三',
    'fan_yanjian_full_damage1': '元素战技·其二', 'fan_yanjian_full_damage2': '元素战技·其三',
    'fan_yunjian_full1': '闲聊·数理',
}

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://wiki.biligame.com/'})
    return urllib.request.urlopen(request, timeout=40).read()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--recordings', type=Path, default=Path('C:/Users/22697/Downloads/兹白各形象语音'))
    parser.add_argument('--ffmpeg')
    args = parser.parse_args()
    folder = ROOT / 'audio/zibai'
    originals = folder / 'originals'
    (folder / 'skill').mkdir(parents=True, exist_ok=True)
    originals.mkdir(parents=True, exist_ok=True)
    page = fetch('https://wiki.biligame.com/ys/' + urllib.parse.quote('兹白语音')).decode('utf8')
    (originals / 'zibai-voice-page.html').write_text(page, encoding='utf8')
    manifest = {'page': PAGE, 'language': 'zh-CN', 'verified_date': '2026-10-25', 'clips': {}}
    for name, label in {**LOCAL, **WEB}.items():
        trim = None
        if name in LOCAL:
            source = args.recordings / (label + '.mp3')
            original = originals / source.name
            shutil.copyfile(source, original)
            url = None
            origin = str(source)
        else:
            start = page.index('>' + label + '<')
            section = html.unescape(page[start:start + 2300])
            url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
            original = originals / (label + '.mp3')
            if not original.exists():
                data = fetch(url)
                assert len(data) > 1000 and not data.lstrip().startswith(b'<'), name
                original.write_bytes(data)
            origin = PAGE
        output = folder / 'skill' / (name + '.mp3')
        if name == 'fan_yunjian_full1':
            # Populate after inspecting the original's natural pauses.
            trim_file = originals / 'zibai-trims.json'
            if not trim_file.exists() or not args.ffmpeg:
                print('Awaiting trim:', name, original)
                continue
            trim = json.loads(trim_file.read_text(encoding='utf8'))[name]
            subprocess.run([args.ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(original),
                            '-ss', str(trim[0]), '-t', str(trim[1] - trim[0]), '-c:a', 'libmp3lame', '-q:a', '2', str(output)], check=True)
        else:
            shutil.copyfile(original, output)
        manifest['clips'][name] = {
            'label': label, 'source': origin, 'url': url, 'bytes': original.stat().st_size,
            'original': original.relative_to(ROOT).as_posix(), 'output': output.relative_to(ROOT).as_posix(),
            'output_bytes': output.stat().st_size, 'trim_seconds': trim,
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        }
        print(name, output.stat().st_size)
    (originals / 'zibai-sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
    if args.ffmpeg:
        from normalize_zibai_audio import prepare
        prepare(args.ffmpeg)

if __name__ == '__main__':
    main()
