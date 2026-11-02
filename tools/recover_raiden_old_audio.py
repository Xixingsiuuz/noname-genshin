from pathlib import Path
import sys,urllib.request,re,html
sys.path.insert(0,str(Path('tools').resolve()))
from normalize_itto_audio import measure,run
s=Path('audio/raiden/originals/raiden-voice-page.html').read_text(encoding='utf8');a=s.index('>元素战技·其一<');url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',s[a:a+3500])[0])
p=Path('audio/raiden/originals/fan_suoguo_voice.mp3');o=Path('audio/raiden/skill/fan_suoguo_voice.mp3')
assert not p.exists() and not o.exists()
data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read();assert len(data)>1000 and not data.lstrip().startswith(b'<');p.write_bytes(data)
f='D:/FormatFactory/ffmpeg.exe';before=measure(f,p);gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
for i in range(4):
 run(f,['-y','-i',str(p),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(o)])
 after=measure(f,o)
 if after['true_peak_dbtp']<=-1:break
 gain=round(gain-after['true_peak_dbtp']-1.5,2)
assert after['true_peak_dbtp']<=-1
print('Rebuilt old source and playback files:',p.stat().st_size,o.stat().st_size)
