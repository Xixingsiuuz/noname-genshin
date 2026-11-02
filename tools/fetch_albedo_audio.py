"""Fetch Albedo Chinese originals and apply measured per-clip static gain."""
from pathlib import Path
import urllib.request,urllib.parse,re,html,json,hashlib,subprocess,statistics
from normalize_itto_audio import measure,run
ROOT=Path(__file__).resolve().parents[1]
PAGE='https://wiki.biligame.com/ys/阿贝多语音'
ENTRIES={'fan_xiansheng':'元素战技·其三','fan_baie':'元素战技·其一','fan_albedo':'倒下·其一','fan_xiansheng_burst':'元素爆发·其二','fan_baie_ascension':'突破的感受·承'}
def main():
 import argparse
 ap=argparse.ArgumentParser();ap.add_argument('--ffmpeg',required=True);ap.add_argument('--download-only',action='store_true');args=ap.parse_args()
 base=ROOT/'audio/albedo'
 for f in ['skill','die','originals']:(base/f).mkdir(parents=True,exist_ok=True)
 saved=base/'originals/albedo-voice-page.html'
 if not saved.exists():
  saved.write_bytes(urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(PAGE,safe=':/'),headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read())
 s=saved.read_text(encoding='utf8')
 refs=[dict(path=p.relative_to(ROOT).as_posix(),**measure(args.ffmpeg,p)) for folder in ['skill','die'] for p in sorted((ROOT/'audio/eula'/folder).glob('*'))]
 target=round(statistics.median(x['lufs'] for x in refs),2)
 manifest_path=base/'originals/albedo-sources.json'
 clips=json.loads(manifest_path.read_text(encoding='utf8'))['clips'] if manifest_path.exists() else {}
 for name,label in ENTRIES.items():
  if name in clips and (ROOT/clips[name]['output']).exists():continue
  start=s.index('>'+label+'<');chunk=s[start:start+3500]
  filename={'fan_xiansheng':'VO ZH Albedo Elemental Skill 1 03.ogg','fan_baie':'VO ZH Albedo Elemental Skill 1 01.ogg','fan_albedo':'VO ZH Albedo Fallen 01.ogg','fan_xiansheng_burst':'VO ZH Albedo Elemental Burst 02.ogg','fan_baie_ascension':'VO ZH Albedo Feelings About Ascension - 02.ogg'}[name]
  query='https://genshin-impact.fandom.com/api.php?'+urllib.parse.urlencode(dict(action='query',titles='File:'+filename,prop='imageinfo',iiprop='url',format='json'))
  media=urllib.request.urlopen(urllib.request.Request(query,headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read()
  (base/'originals'/(name+'-media.json')).write_bytes(media)
  url=next(iter(json.loads(media)['query']['pages'].values()))['imageinfo'][0]['url'];text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',chunk,re.S)[1])).strip()
  original=base/'originals'/(name+'.ogg');out=base/('die' if name=='fan_albedo' else 'skill')/(name+'.mp3')
  data=original.read_bytes() if original.exists() else urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read();assert len(data)>1000 and not data.lstrip().startswith(b'<');original.write_bytes(data)
  if args.download_only:
   print(name,len(data));continue
  trim=[0,2.8] if name=='fan_baie_ascension' else None
  filters=f'atrim=start={trim[0]}:end={trim[1]},asetpts=PTS-STARTPTS' if trim else 'anull'
  source_text=text
  if trim:text='「白垩」，即是变化的开始。'
  before=measure(args.ffmpeg,original,filters);gain=round(min(target-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  for attempt in range(4):
   run(args.ffmpeg,['-y','-i',str(original),'-af',filters+f',volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
   after=measure(args.ffmpeg,out)
   if after['true_peak_dbtp']<=-1:break
   gain=round(gain-after['true_peak_dbtp']-1.5,2)
  assert after['true_peak_dbtp']<=-1
  clips[name]=dict(label=label,text=text,source_text=source_text,trim_verification="text and silence detection; no manual listening" if trim else "untrimmed",url=url,bytes=len(data),original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=trim,original_sha256=hashlib.sha256(data).hexdigest(),media_source_page="https://genshin-impact.fandom.com/wiki/Albedo/Voice-Overs/Chinese",output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),volume=dict(gain_db=gain,before=before,after=after))
 if args.download_only:return
 report=dict(page=PAGE,loudness_reference=dict(target_lufs=target,references=refs,method='static gain only; no speed change or compression; originals retained; per-clip trim_seconds'),clips=clips)
 (base/'originals/albedo-volume-report.json').write_text(json.dumps(dict(target_lufs=target,method='static gain only; no manual listening or live game test',clips={k:dict(text=c['text'],**c['volume']) for k,c in clips.items()}),ensure_ascii=False,indent=2),encoding='utf8')
 (base/'originals/albedo-sources.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 catalog_path=ROOT/'audio/catalog.json';catalog=json.loads(catalog_path.read_text(encoding='utf8'));catalog=[e for e in catalog if e['role']!='albedo']
 for clip in clips.values():
  for key in ['original','output']:
   p=ROOT/clip[key];data=p.read_bytes();catalog.append(dict(role='albedo',path=clip[key],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
 catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps({k:v['volume'] for k,v in clips.items()},ensure_ascii=False))
if __name__=='__main__':main()
