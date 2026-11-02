from pathlib import Path
import urllib.request,urllib.parse,re,html,json,hashlib,argparse,subprocess,math
from normalize_itto_audio import measure as raw_measure,run
def measure(ffmpeg,path):
 result=raw_measure(ffmpeg,path)
 if not math.isfinite(result["lufs"]):
  result=raw_measure(ffmpeg,path,"apad=pad_dur=1")
  result["measurement_padding_seconds"]=1
 assert math.isfinite(result["lufs"])
 return result
ROOT=Path(__file__).resolve().parents[1]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--ffmpeg',required=True);args=ap.parse_args()
 d=ROOT/'audio/jean/originals';d.mkdir(parents=True,exist_ok=True)
 page='https://wiki.biligame.com/ys/'+urllib.parse.quote('琴语音')
 saved=d/'jean-voice-page.html'
 if not saved.exists():saved.write_bytes(urllib.request.urlopen(urllib.request.Request(page,headers={'User-Agent':'Mozilla/5.0'})).read())
 source=saved.read_text(encoding='utf8');clips={};rows=[]
 selected={**{f'fan_fengya_voice{i}':f'元素战技·其{n}' for i,n in enumerate('一二三',1)},**{f'fan_shiya_heal{i}':f'元素爆发·其{n}' for i,n in enumerate('一二三',1)},**{f'fan_jean{i}':f'倒下·其{n}' for i,n in enumerate('一二三',1)}}
 for name,label in selected.items():
  start=source.index('>'+label+'<');block=source[start:start+6000]
  urls=re.findall(r'https[^"<> ]+\.mp3',block)
  if urls:url=html.unescape(urls[0])
  else:
   if 'fengya_voice' in name:filename='VO ZH Jean Elemental Skill 1 '+name[-1].zfill(2)+'.ogg'
   elif 'shiya_heal' in name:filename='VO ZH Jean Elemental Burst '+name[-1].zfill(2)+'.ogg'
   elif 'fan_jean' in name:filename='VO ZH Jean Fallen '+name[-1].zfill(2)+'.ogg'
   else:filename='VO ZH Jean Chat - '+('Wandering Spirits' if name.endswith('1') else 'Corruption')+'.ogg'
   query='https://genshin-impact.fandom.com/api.php?'+urllib.parse.urlencode(dict(action='query',titles='File:'+filename,prop='imageinfo',iiprop='url',format='json'))
   cached=d/(name+'-media.json')
   media=cached.read_bytes() if cached.exists() else urllib.request.urlopen(urllib.request.Request(query,headers={'User-Agent':'Mozilla/5.0'})).read()
   (d/(name+'-media.json')).write_bytes(media)
   url=next(iter(json.loads(media)['query']['pages'].values()))['imageinfo'][0]['url'].split('/revision/')[0]
  m=re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)
  text=html.unescape(re.sub('<[^>]+>','',m[1])).strip()
  original=d/(name+('.ogg' if '.ogg' in url else '.mp3'))
  if not original.exists():original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':page})).read())
  assert original.stat().st_size>1000
  out=ROOT/'audio/jean'/('die' if name.startswith('fan_jean') else 'skill')/(name+'.mp3');out.parent.mkdir(exist_ok=True)
  before=measure(args.ffmpeg,original);gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  for attempt in range(4):
   run(args.ffmpeg,['-y','-i',str(original),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
   after=measure(args.ffmpeg,out)
   if after['true_peak_dbtp']<=-1:break
   gain=round(gain-after['true_peak_dbtp']-1.5,2)
  assert after['true_peak_dbtp']<=-1
  row=dict(id=name,gain_db=gain,before=before,after=after);rows.append(row)
  clips[name]=dict(label=label,url=url,text=text,bytes=original.stat().st_size,original=original.relative_to(ROOT).as_posix(),original_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),output=out.relative_to(ROOT).as_posix(),trim_seconds=None,volume=row,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),output_bytes=out.stat().st_size)
  print(name,label,text,flush=True)
 (d/'jean-sources.json').write_text(json.dumps(dict(page=page,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 (d/'jean-volume-report.json').write_text(json.dumps(dict(target_lufs=-14.25,reference='Eula playback median',clips=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'));catalog=[e for e in catalog if e['role']!='jean']
 for c in clips.values():catalog.append(dict(role='jean',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']))
 p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
