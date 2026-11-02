"""Fetch untouched Ajax Chinese in-game voices; never overwrite existing playback."""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json, hashlib

ROOT = Path(__file__).resolve().parents[1]
PAGE = 'https://wiki.biligame.com/ys/达达利亚语音'
ENTRIES = {
    'fan_ajax2': '倒下·其二',
    'fan_jingwu_convert_voice2': '元素战技·其四',
    'fan_jingwu_gain_voice2': '打开宝箱·其三',
    'fan_jingwu_damage_voice2': '元素爆发·其四',
    'fan_jingwu_draw_voice2': '打开宝箱·其一',
    'fan_kuanglan2': '加入队伍·其二',
    'fan_kuanglan_repay_voice1': '生命值低·其一',
    'fan_kuanglan_repay_voice2': '生命值低·其三',
    'fan_jingwu_convert_voice': '元素战技·其一',
    'fan_jingwu_gain_voice': '元素爆发·其三',
    'fan_jingwu_damage_voice': '元素爆发·其二',
    'fan_jingwu_draw_voice': '打开宝箱·其二',
    'fan_kuanglan': '元素战技·其三',
    'fan_ajax': '倒下·其一',
}
FANDOM_FILES = {
    '倒下·其二': 'VO ZH Tartaglia Fallen 02.ogg',
    '倒下·其三': 'VO ZH Tartaglia Fallen 03.ogg',
    '元素战技·其四': 'VO ZH Tartaglia Elemental Skill 1 04.ogg',
    '打开宝箱·其三': 'VO ZH Tartaglia Opening Treasure Chest 03.ogg',
    '元素爆发·其四': 'VO ZH Tartaglia Elemental Burst 04.ogg',
    '打开宝箱·其一': 'VO ZH Tartaglia Opening Treasure Chest 01.ogg',
    '加入队伍·其二': 'VO ZH Tartaglia Joining Party 02.ogg',
    '生命值低·其一': 'VO ZH Tartaglia Low HP 01.ogg',
    '生命值低·其三': 'VO ZH Tartaglia Low HP 03.ogg',
    '元素战技·其一': 'VO ZH Tartaglia Elemental Skill 1 01.ogg',
    '元素战技·其三': 'VO ZH Tartaglia Elemental Skill 1 03.ogg',
    '元素爆发·其二': 'VO ZH Tartaglia Elemental Burst 02.ogg',
    '元素爆发·其三': 'VO ZH Tartaglia Elemental Burst 03.ogg',
    '打开宝箱·其二': 'VO ZH Tartaglia Opening Treasure Chest 02.ogg',
    '倒下·其一': 'VO ZH Tartaglia Fallen 01.ogg',
}

def fetch(url):
    request = urllib.request.Request(urllib.parse.quote(url, safe=':/%?=&+'),
        headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://wiki.biligame.com/'})
    try:
        return urllib.request.urlopen(request, timeout=45).read()
    except urllib.error.HTTPError as error:
        if error.code != 403 or 'static.wikia.nocookie.net' not in url: raise
        alternative = url.split('/revision/')[0] + '/revision/latest?format=original'
        request = urllib.request.Request(alternative, headers={'User-Agent': 'Mozilla/5.0'})
        return urllib.request.urlopen(request, timeout=45).read()

def main():
    base = ROOT / 'audio/ajax'
    for folder in ['originals', 'skill', 'die']:
        (base / folder).mkdir(parents=True, exist_ok=True)
    saved = base / 'originals/ajax-voice-page.html'
    if not saved.exists(): saved.write_bytes(fetch(PAGE))
    page = saved.read_text(encoding='utf8')
    path = base / 'originals/ajax-sources.json'
    manifest = json.loads(path.read_text(encoding='utf8')) if path.exists() else dict(page=PAGE, clips={})
    for name, label in ENTRIES.items():
        chunk = page[page.index('>' + label + '<'):][:3500]
        urls = re.findall(r'https[^"<> ]+\.mp3', chunk)
        filename = None
        if urls:
            url = html.unescape(urls[0])
        else:
            filename = FANDOM_FILES[label].replace(' ', '_')
            query = 'https://genshin-impact.fandom.com/api.php?' + urllib.parse.urlencode(dict(
                action='query', titles='File:' + FANDOM_FILES[label], prop='imageinfo', iiprop='url', format='json'))
            query_path = base / 'originals' / (name + '-media.json')
            if not query_path.exists(): query_path.write_bytes(fetch(query))
            media = json.loads(query_path.read_text(encoding='utf8'))
            if 'imageinfo' not in next(iter(media['query']['pages'].values())):
                query_path.write_bytes(fetch(query))
                media = json.loads(query_path.read_text(encoding='utf8'))
            url = next(iter(media['query']['pages'].values()))['imageinfo'][0]['url']
        text = html.unescape(re.sub('<[^>]+>', '', re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', chunk, re.S)[1])).strip()
        original = base / 'originals' / (name + ('.ogg' if filename else '.mp3'))
        if not original.exists(): original.write_bytes(fetch(url))
        data = original.read_bytes()
        assert len(data) > 1000 and not data.lstrip().startswith(b'<')
        output = base / ('die' if name.startswith('fan_ajax') else 'skill') / (('fan_ajax1' if name == 'fan_ajax' else name) + '.mp3')
        previous = manifest['clips'].get(name, {})
        manifest['clips'][name] = dict(previous, label=label, text=text, url=url, bytes=len(data),
            original=original.relative_to(ROOT).as_posix(), output=output.relative_to(ROOT).as_posix(),
            trim_seconds=None, original_sha256=hashlib.sha256(data).hexdigest(),
            media_file=filename, media_source_page='https://genshin-impact.fandom.com/wiki/Tartaglia/Voice-Overs/Chinese' if filename else PAGE)
        print(name, label, len(data))
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__': main()
