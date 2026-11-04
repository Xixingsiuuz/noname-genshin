"""Fetch untouched Ajax Chinese in-game voices; never overwrite existing playback."""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json, hashlib

ROOT = Path(__file__).resolve().parents[1]
PAGE = 'https://wiki.biligame.com/ys/白术语音'
ENTRIES = {'fan_wenbu1': '元素战技·其一', 'fan_wenbu2': '元素战技·其二', 'fan_wenbu3': '元素战技·其三', 'fan_shiqi1': '元素爆发·其一', 'fan_shiqi2': '元素爆发·其二', 'fan_shiqi3': '元素爆发·其三', 'fan_baizhu1': '倒下·其一', 'fan_baizhu2': '倒下·其二', 'fan_baizhu3': '倒下·其三', 'vision': '关于「神之眼」…', 'tao': '闲聊·天道'}
FANDOM_FILES = {'元素战技·其一': 'VO ZH Baizhu Elemental Skill 1 01.ogg', '元素战技·其二': 'VO ZH Baizhu Elemental Skill 1 02.ogg', '元素战技·其三': 'VO ZH Baizhu Elemental Skill 1 03.ogg', '元素爆发·其一': 'VO ZH Baizhu Elemental Burst 01.ogg', '元素爆发·其二': 'VO ZH Baizhu Elemental Burst 02.ogg', '元素爆发·其三': 'VO ZH Baizhu Elemental Burst 03.ogg', '倒下·其一': 'VO ZH Baizhu Fallen 01.ogg', '倒下·其二': 'VO ZH Baizhu Fallen 02.ogg', '倒下·其三': 'VO ZH Baizhu Fallen 03.ogg', '关于「神之眼」…': 'VO ZH Baizhu About the Vision.ogg', '闲聊·天道': 'VO ZH Baizhu Chat - Natural Laws.ogg'}

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
    base = ROOT / 'audio/baizhu'
    for folder in ['originals', 'skill', 'die']:
        (base / folder).mkdir(parents=True, exist_ok=True)
    saved = base / 'originals/baizhu-voice-page.html'
    if not saved.exists(): saved.write_bytes(fetch(PAGE))
    page = saved.read_text(encoding='utf8')
    path = base / 'originals/baizhu-sources.json'
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
            url = next(iter(media['query']['pages'].values()))['imageinfo'][0]['url'].split("/revision/")[0]
        text = html.unescape(re.sub('<[^>]+>', '', re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', chunk, re.S)[1])).strip()
        original = base / 'originals' / (name + ('.ogg' if filename else '.mp3'))
        if not original.exists(): original.write_bytes(fetch(url))
        data = original.read_bytes()
        assert len(data) > 1000 and not data.lstrip().startswith(b'<')
        output = base / ('die' if name.startswith('fan_baizhu') else 'skill') / (('fan_baizhu1' if name == 'fan_baizhu' else name) + '.mp3')
        previous = manifest['clips'].get(name, {})
        manifest['clips'][name] = dict(previous, label=label, text=text, url=url, bytes=len(data),
            original=original.relative_to(ROOT).as_posix(), output=output.relative_to(ROOT).as_posix(),
            trim_seconds=None, original_sha256=hashlib.sha256(data).hexdigest(),
            media_file=filename, media_source_page='https://genshin-impact.fandom.com/wiki/Baizhu/Voice-Overs/Chinese' if filename else PAGE)
        print(name, label, len(data))
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__': main()


