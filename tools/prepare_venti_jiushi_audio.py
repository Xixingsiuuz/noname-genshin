from pathlib import Path
import json, hashlib, urllib.request, html, re
from normalize_itto_audio import run, measure
ROOT=Path(__file__).resolve().parents[1]; base=ROOT/'audio/venti'
p=base/'originals/sources.json'; data=json.loads(p.read_text('utf8')); clips=data['clips']
page=(base/'originals/voice-page.html').read_text('utf8')
block=html.unescape(page[page.index('>收到赠礼·其一<'):][:6000])
url=re.findall(r'https[^"<> ]+\.mp3',block)[0]
original=base/'originals/fan_jiushi2.mp3'
if not original.exists(): original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read())
out=base/'skill/fan_jiushi2.mp3'; ff='D:/FormatFactory/ffmpeg.exe'; before=measure(ff,original)
gain=min(-19.61-before['lufs'],-1.5-before['true_peak_dbtp'])
run(ff,['-y','-i',str(original),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
hobby=dict(clips['fan_qingzhan2']); hobby['output']='audio/venti/skill/fan_jiushi1.mp3'
(ROOT/hobby['output']).write_bytes((ROOT/clips['fan_qingzhan2']['output']).read_bytes())
morning=dict(clips['fan_qingzhan3']); morning['output']='audio/venti/skill/fan_qingzhan2.mp3'
(ROOT/morning['output']).write_bytes((ROOT/clips['fan_qingzhan3']['output']).read_bytes())
clips['fan_jiushi1']=hobby; clips['fan_qingzhan2']=morning; del clips['fan_qingzhan3']
clips['fan_jiushi2']=dict(label='收到赠礼·其一',text='啊，好满足！明天也会有吧？后天也会有吧？',url=url,original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),bytes=original.stat().st_size,trim_seconds=None,gain_db=gain,before=before,after=measure(ff,out))
for c in clips.values():
 file=ROOT/c['output'];c.update(output_bytes=file.stat().st_size,sha256=hashlib.sha256(file.read_bytes()).hexdigest())
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),'utf8')
p=ROOT/'character/voices.js'; s=p.read_text('utf8');i=s.index('{'); voices=json.loads(s[i:s.rfind('}')+1]); voices.pop('#ext:原神/audio/venti/skill/fan_qingzhan3',None)
for c in clips.values():voices['#ext:原神/'+c['output'][:-4]+(':die' if '/die/' in c['output'] else '')]=c['text']
p.write_text(s[:i]+json.dumps(voices,ensure_ascii=False,indent=2)+';\n','utf8')
p=ROOT/'audio/catalog.json'; catalog=[r for r in json.loads(p.read_text('utf8')) if r.get('role')!='venti'];catalog += [dict(role='venti',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']) for c in clips.values()];p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2),'utf8')
