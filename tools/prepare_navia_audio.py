from pathlib import Path
import json,hashlib,argparse
from normalize_itto_audio import measure,run
ROOT=Path(__file__).resolve().parents[1]
WORK=Path(r'C:/Users/22697/.codex/visualizations/2026/10/18/01a14dac-a388-7572-a32b-ceefa8495d67')
FF='D:/FormatFactory/ffmpeg.exe'
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--only',nargs='*');args=parser.parse_args()
 d=ROOT/'audio/navia/originals';p=d/'navia-sources.json';manifest=json.loads(p.read_text(encoding='utf8'));rows=[]
 for name,c in manifest['clips'].items():
  original=ROOT/c['original'];src=original
  if args.only and name not in args.only:
   rows.append(c['volume']);continue
  c.pop('separation',None);c.pop('processed_source',None)
  if name in ('fan_cijue_start1','fan_cijue_start2','fan_cijue_start3'):
   c['processing']='Original recording with BGM retained: rejected separation suppressed speech; static gain only.'
  out=ROOT/'audio/navia'/('die' if name.startswith('fan_navia') else 'skill')/(name+'.mp3');out.parent.mkdir(parents=True,exist_ok=True)
  before=measure(FF,src);gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  for _ in range(4):
   run(FF,['-y','-i',str(src),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
   after=measure(FF,out)
   if after['true_peak_dbtp']<=-1:break
   gain=round(gain-after['true_peak_dbtp']-1.5,2)
  assert after['true_peak_dbtp']<=-1
  row=dict(id=name,gain_db=gain,before=before,after=after,original_before_separation=measure(FF,original) if src != original else None);rows.append(row)
  data=out.read_bytes();c.update(output=out.relative_to(ROOT).as_posix(),output_bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),trim_seconds=None,volume=row)
  print(name,gain,after['lufs'],after['true_peak_dbtp'],flush=True)
 manifest['processing_notes']='Full original sources preserved. All playback clips use original recordings with static gain only; three question clips retain BGM because separation suppressed speech. No trimming, no speed change, no synthesis. No human listening or in-game listening test.'
 p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 (d/'navia-volume-report.json').write_text(json.dumps(dict(target_lufs=-14.25,reference='Eula playback median',clips=rows,human_listening=False),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 lines=['# 娜维娅逐条音量报告','','优菈参考 −14.25 LUFS；逐条固定增益，编码后真峰值不高于 −1 dBTP。三段说服问句已恢复完整原声并保留BGM；弃用误削人声的分离版本。未人工试听。','', '|文件|增益 dB|处理后源 LUFS|输出 LUFS|源 dBTP|输出 dBTP|','|---|---:|---:|---:|---:|---:|']
 for r in rows:lines.append(f"|{r['id']}|{r['gain_db']:+.2f}|{r['before']['lufs']:.2f}|{r['after']['lufs']:.2f}|{r['before']['true_peak_dbtp']:.2f}|{r['after']['true_peak_dbtp']:.2f}|")
 (ROOT/'audio/navia/volume.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
 p=ROOT/'audio/catalog.json';cat=json.loads(p.read_text(encoding='utf8'));cat=[x for x in cat if x['role']!='navia']
 cat.extend(dict(role='navia',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']) for c in manifest['clips'].values());p.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
