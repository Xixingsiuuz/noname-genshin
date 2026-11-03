"""Refresh character introductions from the two BWIKI profile fields."""
import concurrent.futures
import html
import json
from pathlib import Path
import re
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / 'character/translate.js').read_text(encoding='utf-8')
names = dict(re.findall(r'(fan_\w+):\s*"([^"]+)"', text))
names.update(dict(re.findall(r'characterTranslate\.(fan_\w+)\s*=\s*"([^"]+)"', text)))
ids = re.findall(r'^\s*(fan_\w+):', (ROOT / 'character/character.js').read_text(encoding='utf-8'), re.M)

def fetch(id):
    name = {'fan_varesa': '瓦雷莎', 'fan_ajax': '达达利亚', 'fan_raiden': '雷电将军'}.get(id, names[id])
    url = 'https://wiki.biligame.com/ys/' + name
    response = requests.get(url, timeout=45)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'html.parser')
    fields = {}
    for cell in soup.select('th,td'):
        key = cell.get_text(strip=True)
        if key not in ('介绍', '昵称/外号') or not cell.find_next_sibling():
            continue
        value = cell.find_next_sibling()
        for tag in value.select('s,del'):
            tag.replace_with('__STRIKE_START__' + tag.get_text() + '__STRIKE_END__')
        fields[key] = html.escape(value.get_text('', strip=True)).replace('__STRIKE_START__', '<s>').replace('__STRIKE_END__', '</s>')
    if not all(fields.get(key) for key in ('介绍', '昵称/外号')):
        raise ValueError(f'{id} {name}: missing fields {fields}')
    return id, {'name': name, 'url': url, 'intro': fields['介绍'], 'nicknames': fields['昵称/外号']}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        data = dict(pool.map(fetch, ids))
    (ROOT / 'character/intro-sources.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    entries = {id: row['intro'] + '<br>昵称：' + row['nicknames'].rstrip('。') + '。' for id, row in data.items()}
    (ROOT / 'character/intro.js').write_text('// BWIKI profile introduction and nicknames; see intro-sources.json.\nexport default ' + json.dumps(entries, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    print(f'Updated {len(entries)} introductions')


