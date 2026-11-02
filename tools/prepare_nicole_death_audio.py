"""Prepare Nicole's uncut Chinese death lines, preserving originals and static-gain provenance."""
from pathlib import Path
import json,hashlib
from fetch_mona_audio import measure
from normalize_itto_audio import run
ROOT=Path(__file__).resolve().parents[1];base=ROOT/'audio/nicole';rows=json.loads((base/'originals/death-entries.json').read_text(encoding='utf8'));p=base/'originals/nicole-sources.json';data=json.loads(p.read_text(encoding='utf8'));(base/'die').mkdir(exist_ok=True);ff='D:/FormatFactory/ffmpeg.exe'
for i,row in rows.items():
 id='fan_nicole'+i;src=base/'originals'/f'death-source-{i}.mp3';out=base/'die'/(id+'.mp3');before=measure(ff,src);gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
 run(ff,['-y','-i',str(src),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)]);after=measure(ff,out);assert after['true_peak_dbtp']<=-1
 data['clips'][id]=dict(**row,original=src.relative_to(ROOT).as_posix(),bytes=src.stat().st_size,original_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),output=out.relative_to(ROOT).as_posix(),output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),trim_seconds=None,gain_db=gain,measurement=after,review='uncut original; not human-listened')
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'));catalog=[c for c in catalog if not(c['role']=='nicole' and '/die/' in c['path'])];catalog += [dict(role='nicole',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']) for id,c in data['clips'].items() if id.startswith('fan_nicole')];p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
