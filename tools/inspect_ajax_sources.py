from pathlib import Path
import re, html

page = (Path(__file__).resolve().parents[1] / 'audio/ajax/originals/ajax-voice-page.html').read_text(encoding='utf8')
for label in ['元素战技·其一','元素战技·其二','元素战技·其三','元素战技·其四','元素爆发·其一','元素爆发·其二','元素爆发·其三','元素爆发·其四','打开宝箱·其一','打开宝箱·其二','打开宝箱·其三','生命值低·其一','生命值低·其二','生命值低·其三','加入队伍·其一','加入队伍·其二','倒下·其一']:
    chunk = page[page.index('>'+label+'<'):]
    match = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', chunk, re.S)
    print(label, html.unescape(re.sub('<[^>]+>', '', match[1])))

for label in ['倒下·其二', '倒下·其三']:
    chunk = page[page.index('>'+label+'<'):]
    match = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>', chunk, re.S)
    print(label, html.unescape(re.sub('<[^>]+>', '', match[1])))
