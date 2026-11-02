"""Fetch Nilou Chinese originals and apply measured per-clip static gain."""
from pathlib import Path
import urllib.request,urllib.parse,re,html,json,hashlib,subprocess,statistics
from normalize_itto_audio import measure,run
ROOT=Path(__file__).resolve().parents[1]
PAGE='https://wiki.biligame.com/ys/妮露语音'
ENTRIES={'fan_pianzhuan_yang_voice':'元素战技·其二','fan_pianzhuan_yin_voice':'元素爆发·其二','fan_pianzhuan_repeat_voice':'元素战技·其三','fan_pianzhuan_guard_voice':'元素战技·其一','fan_chuchen':'元素爆发·其一','fan_nilou':'倒下·其一','fan_chuchen_extra':'元素爆发·其三','fan_nilou_extra2':'倒下·其二','fan_nilou_extra3':'倒下·其三'}

def main():
 import argparse
 ap=argparse.ArgumentParser();ap.add_argument('--ffmpeg',required=True);ap.add_argument('--only');args=ap.parse_args()
 base=ROOT/'audio/nilou'
 for f in ['skill','die','originals']:(base/f).mkdir(parents=True,exist_ok=True)
 page_path=base/'originals/nilou-voice-page.html'
 if not page_path.exists():
  page_path.write_bytes(urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(PAGE,safe=':/'),headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read())
 s=page_path.read_text(encoding='utf8')
 refs=[dict(path=p.relative_to(ROOT).as_posix(),**measure(args.ffmpeg,p)) for folder in ['skill','die'] for p in sorted((ROOT/'audio/eula'/folder).glob('*'))]
 target=round(statistics.median(x['lufs'] for x in refs),2);manifest=base/'originals/nilou-sources.json';clips=json.loads(manifest.read_text(encoding='utf8'))['clips'] if manifest.exists() else {}
 for name,label in ENTRIES.items():
  if args.only and name != args.only: continue
  start=s.index('>'+label+'<');chunk=s[start:start+3500]
  url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0]);text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',chunk,re.S)[1])).strip()
  original=base/'originals'/(name+'.mp3');out=base/('die' if name.startswith('fan_nilou') else 'skill')/(name+'.mp3')
  data=original.read_bytes() if original.exists() else urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read();assert len(data)>1000 and not data.lstrip().startswith(b'<');original.write_bytes(data)
  trim=None;filters='anull'
  before=measure(args.ffmpeg,original,filters);gain=round(min(target-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  for attempt in range(4):
   run(args.ffmpeg,['-y','-i',str(original),'-af',filters+f',volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
   after=measure(args.ffmpeg,out)
   if after['true_peak_dbtp']<=-1:break
   gain=round(gain-after['true_peak_dbtp']-1.5,2)
  assert after['true_peak_dbtp']<=-1
  clips[name]=dict(label=label,text=text,url=url,original_sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=trim,output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),volume=dict(gain_db=gain,before=before,after=after))
 report=dict(page=PAGE,loudness_reference=dict(target_lufs=target,references=refs,method='static gain only; no speed change or compression; original sources retained; trim ranges per clip'),clips=clips)
 (base/'originals/nilou-sources.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 (base/'originals/nilou-volume-report.json').write_text(json.dumps(dict(target_lufs=target,method='static gain only; untrimmed; no manual listening or live game test',clips={k:v['volume'] for k,v in clips.items()}),ensure_ascii=False,indent=2),encoding='utf8')
 catalog_path=ROOT/'audio/catalog.json';catalog=json.loads(catalog_path.read_text(encoding='utf8'));catalog=[e for e in catalog if e.get('role')!='nilou']
 for clip in clips.values():
  for key in ['original','output']:
   p=ROOT/clip[key];data=p.read_bytes();catalog.append(dict(role='nilou',path=clip[key],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
 catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps({k:v['volume'] for k,v in clips.items()},ensure_ascii=False))
if __name__=='__main__':main()

