"""Reproduce requested sentence trims and update native audio manifests."""
from pathlib import Path
import json,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'audio/arlecchino/originals/arlecchino-sources.json'
data=json.loads(p.read_text(encoding='utf8'))
trims={'fan_luhuo_attack1':(14.65,18.95,'壁炉之家无需讨好他人，我们像蜘蛛那样狩猎。'),
       'fan_luhuo_attack2':(17.95,23.77,'我会把它垂死前的挣扎慢慢记下，一如我记下那些败者的结局。')}
for name,c in data['clips'].items():
 if name in trims:
  start,end,text=trims[name]
  subprocess.run(['D:/FormatFactory/ffmpeg.exe','-y','-hide_banner','-loglevel','error','-ss',str(start),'-i',str(ROOT/c['original']),'-t',str(end-start),'-c:a','libmp3lame','-q:a','2',str(ROOT/c['output'])],check=True)
  c['trim_seconds']=[start,end];c['text']=text
 c['output_bytes']=(ROOT/c['output']).stat().st_size
 c['sha256']=hashlib.sha256((ROOT/c['output']).read_bytes()).hexdigest()
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'))
catalog=[c for c in catalog if c['role']!='arlecchino']+[dict(role='arlecchino',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']) for c in data['clips'].values()]
p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'extension.js';s=p.read_text(encoding='utf8');paths=[c['output'] for c in data['clips'].values()]
missing=[path for path in paths if '"'+path+'"' not in s]
s=s.replace('skill: [], audio: [','skill: [], audio: [\n'+''.join('      '+json.dumps(path,ensure_ascii=False)+',\n' for path in missing),1);p.write_text(s,encoding='utf8')
