import json, shutil, subprocess
from pathlib import Path
import requests
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1]
base = root / 'audio/nefer'
for folder in ['originals', 'skill', 'die']:
    (base / folder).mkdir(parents=True, exist_ok=True)
page = 'https://wiki.biligame.com/ys/奈芙尔语音'
html = (base / 'originals/voice-page.html').read_bytes()
soup = BeautifulSoup(html, 'html.parser')
entries = []
subtitles = {}
for category, prefix, folder in [('元素战技', 'fan_huanwu', 'skill'), ('元素爆发', 'fan_miwen', 'skill'), ('倒下', 'fan_nefer', 'die')]:
    for i, number in enumerate('一二三', 1):
        title = category + '·其' + number
        row = next(r for r in soup.select('tr') if r.get_text(strip=True) == title)
        audio_row = row.find_next_sibling('tr').find_next_sibling('tr')
        url = audio_row.select_one('[data-src]')['data-src']
        text_row = audio_row.find_next_sibling('tr')
        text = text_row.select_one('.voice_text_chs').get_text(strip=True)
        response = requests.get(url, timeout=60); response.raise_for_status()
        original = base / 'originals' / f'{prefix}{i}.mp3'
        original.write_bytes(response.content)
        output = base / folder / original.name
        shutil.copy2(original, output)
        entries.append(dict(entry=title, text=text, url=url, bytes=original.stat().st_size, original=str(original.relative_to(root)), output=str(output.relative_to(root)), trim=None))
        subtitles[f'#{prefix}{i}' + (':die' if folder == 'die' else '')] = text
for i, source in enumerate(sorted(Path('C:/Users/22697/Downloads/奈芙尔开E重击语音').glob('*.ogg')), 1):
    original = base / 'originals' / source.name
    shutil.copy2(source, original)
    output = base / 'skill' / f'fan_huanwu_use_voice{i}.mp3'
    subprocess.run(['D:/FormatFactory/ffmpeg.exe', '-y', '-loglevel', 'error', '-i', str(original), '-c:a', 'libmp3lame', '-q:a', '2', str(output)], check=True)
    entries.append(dict(entry='用户提供开E重击', source=str(source), bytes=original.stat().st_size, original=str(original.relative_to(root)), output=str(output.relative_to(root)), trim=None))
(base / 'originals/entries.json').write_text(json.dumps(dict(page=page, entries=entries), ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps(subtitles, ensure_ascii=True))
