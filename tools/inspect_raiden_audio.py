from pathlib import Path
import urllib.request,urllib.parse,re,html
p=Path('audio/raiden/originals');p.mkdir(parents=True,exist_ok=True)
u='https://wiki.biligame.com/ys/雷电将军语音'
s=urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(u,safe=':/'),headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode('utf8');(p/'raiden-voice-page.html').write_text(s,encoding='utf8')
for m in re.finditer(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',s,re.S):
 text=html.unescape(re.sub('<[^>]+>','',m[1])).strip()
 if len(text)<42: print(text)
