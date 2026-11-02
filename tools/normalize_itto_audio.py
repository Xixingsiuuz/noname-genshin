"""Calibrate Itto to the median integrated loudness of existing Eula playback files."""
from pathlib import Path
import argparse,subprocess,json,re,statistics,hashlib
ROOT=Path(__file__).resolve().parents[1]
def run(ffmpeg,args):
 return subprocess.run([ffmpeg,'-hide_banner','-nostats',*args],capture_output=True,text=True,encoding='utf8',errors='replace',check=True).stderr
def measure(ffmpeg,path,filters='anull'):
 log=run(ffmpeg,['-i',str(path),'-af',filters+',volumedetect,loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json','-f','null','-'])
 data=json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}',log)[0])
 return dict(lufs=float(data['input_i']),true_peak_dbtp=float(data['input_tp']),mean_dbfs=float(re.search(r'mean_volume: (-?[\d.]+)',log)[1]),peak_dbfs=float(re.search(r'max_volume: (-?[\d.]+)',log)[1]))
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg',required=True);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 refs=[dict(path=p.relative_to(ROOT).as_posix(),**measure(args.ffmpeg,p)) for p in sorted((ROOT/'audio/eula').glob('skill/*'))]+[dict(path=p.relative_to(ROOT).as_posix(),**measure(args.ffmpeg,p)) for p in sorted((ROOT/'audio/eula').glob('die/*'))]
 target=round(statistics.median(e['lufs'] for e in refs),2)
 path=ROOT/'audio/itto/originals/itto-sources.json';manifest=json.loads(path.read_text(encoding='utf8'));rows=[]
 for name,clip in manifest['clips'].items():
  source=ROOT/clip['original'];out=ROOT/clip['output'];trim=clip['trim_seconds'];filters=f'atrim=start={trim[0]}:end={trim[1]},asetpts=PTS-STARTPTS' if trim else 'anull'
  before=measure(args.ffmpeg,source,filters);previous=measure(args.ffmpeg,out)
  gain=round(min(target-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  row=dict(id=name,text=clip['text'],gain_db=gain,previous=previous,before=before)
  if args.apply:
   original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
   codec=['-c:a','libvorbis','-q:a','5'] if out.suffix=='.ogg' else ['-c:a','libmp3lame','-q:a','2']
   for attempt in range(3):
    run(args.ffmpeg,['-y','-i',str(source),'-af',filters+f',volume={gain}dB',*codec,str(out)])
    after=measure(args.ffmpeg,out)
    if after['true_peak_dbtp']<=-1:break
    gain=round(gain-after['true_peak_dbtp']-1.5,2)
   assert after['true_peak_dbtp']<=-1,(name,after)
   assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
   row.update(gain_db=gain,after=after)
   clip.update(volume=row,output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest())
  rows.append(row)
 report=dict(reference='Eula current skill and death playback files',target_lufs=target,method='per-clip static gain; target Eula median integrated LUFS; true peak headroom -1.5 dBTP before encoding; verified encoded true peaks <= -1 dBTP; no compression or speed changes',references=refs,clips=rows)
 print(json.dumps(report,ensure_ascii=False,indent=2))
 if args.apply:
  manifest['loudness_reference']={k:v for k,v in report.items() if k!='clips'};path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
  (ROOT/'audio/itto/originals/itto-volume-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
  catalog_path=ROOT/'audio/catalog.json';catalog=json.loads(catalog_path.read_text(encoding='utf8'))
  for e in catalog:
   if e['role']=='itto':
    data=(ROOT/e['path']).read_bytes();e.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
  catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
