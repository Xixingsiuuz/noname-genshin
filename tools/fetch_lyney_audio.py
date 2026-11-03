"""Preserve complete Chinese game voice recordings and provenance; no trimming."""
from pathlib import Path
import html, json, re, urllib.request, urllib.parse, hashlib

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = {'fan_huanxi1': '元素战技·其一', 'fan_huanxi2': '元素战技·其二', 'fan_huanxi_wrong1': '元素爆发·其一', 'fan_huanxi_wrong2': '元素爆发·其二', 'fan_huanxi_wrong3': '元素爆发·其三', 'fan_huanxi_right1': '生命值低·其一', 'fan_huanxi_right2': '生命值低·其二', 'fan_moshu1': '元素战技·其三', 'fan_moshu2': '打开宝箱·其二', 'fan_moshu3': '打开宝箱·其三', 'fan_lyney1': '倒下·其一', 'fan_lyney2': '倒下·其二', 'fan_lyney3': '倒下·其三'}

def main():
    directory = ROOT / 'audio/lyney'
    (directory/'originals').mkdir(parents=True,exist_ok=True)
    source = urllib.request.urlopen(urllib.request.Request('https://wiki.biligame.com/ys/'+urllib.parse.quote('林尼语音'),headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode('utf8')
    (directory/'originals/lyney-voice-page.html').write_text(source,encoding='utf8')
    clips = {}
    for name, label in ENTRIES.items():
        section = html.unescape(source[source.index('>' + label + '<'):])
        category = {'元素战技':'Elemental Skill','元素爆发':'Elemental Burst','生命值低':'Low HP','打开宝箱':'Opening Treasure Chest','倒下':'Fallen'}[label.split('·')[0]]
        if category == 'Elemental Skill': category += ' 1'
        filename = f'VO ZH Lyney {category} {"一二三".index(label[-1])+1:02}.ogg'.replace(' ', '_')
        digest = hashlib.md5(filename.encode()).hexdigest()
        url = f'https://static.wikia.nocookie.net/gensin-impact/images/{digest[0]}/{digest[:2]}/{filename}'
        text = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', section, re.S).group(1)
        text = re.sub('<[^>]+>', '', text.replace('<br />', '\n').replace('<br>', '\n')).strip()
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = f'audio/lyney/originals/{name}.ogg'
        output = f'audio/lyney/{"die" if name.startswith("fan_lyney") else "skill"}/{name}.mp3'
        (ROOT/output).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/original).write_bytes(data)
        (ROOT/output).write_bytes(data)
        clips[name] = dict(label=label,text=text,url=url,bytes=len(data),original=original,output=output,output_bytes=len(data),trim_seconds=None)
        print(name, text, len(data))
    (directory/'originals/lyney-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/林尼语音',language='zh-CN',verified_date='2026-11-03',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')

if __name__ == '__main__': main()
