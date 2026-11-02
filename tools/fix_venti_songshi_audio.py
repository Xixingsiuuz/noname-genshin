"""Apply user-confirmed transcripts and +4 dB over the previous playback gain."""
from pathlib import Path
import json, hashlib
from normalize_itto_audio import measure, run
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'audio/venti/originals/sources.json'
data=json.loads(p.read_text('utf8'))
texts={
 'fan_songshi2':'阳光驱散灰烬，林间的风唱着往昔的旋律，归乡之路洒满果香。',
 'fan_songshi3':'靠着铭刻在祭礼、诗歌、遗迹和古籍中的记忆，被视作微不足道的生灵们一次次【见】到了时间。',
}
ff='D:/FormatFactory/ffmpeg.exe'
for name,text in texts.items():
 c=data['clips'][name]; c['text']=text; c['transcript_source']='用户确认，2026-11-01'
 gain=c.setdefault('previous_gain_db',c['gain_db'])+4
 out=ROOT/c['output']
 run(ff,['-y','-i',str(ROOT/c['original']),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
 after=measure(ff,out); assert after['true_peak_dbtp'] < -1
 c.update(gain_db=gain,after=after,output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest())
 print(name,after)
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf8')
p=ROOT/'character/voices.js';s=p.read_text('utf8');i=s.index('{');voices=json.loads(s[i:s.rfind('}')+1])
for name,text in texts.items(): voices['#ext:原神/'+data['clips'][name]['output'][:-4]]=text
p.write_text(s[:i]+json.dumps(voices,ensure_ascii=False,indent=2)+';\n','utf8')
p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text('utf8'))
for row in catalog:
 for name in texts:
  c=data['clips'][name]
  if row.get('path')==c['output']: row.update(bytes=c['output_bytes'],sha256=c['sha256'])
p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n','utf8')
