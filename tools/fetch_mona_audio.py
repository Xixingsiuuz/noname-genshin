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
 d=ROOT/'audio/mona/originals';d.mkdir(parents=True,exist_ok=True)
 page='https://wiki.biligame.com/ys/'+urllib.parse.quote('莫娜语音')
 saved=d/'mona-voice-page.html'
 if not saved.exists():saved.write_bytes(urllib.request.urlopen(urllib.request.Request(page,headers={'User-Agent':'Mozilla/5.0'})).read())
 source=saved.read_text(encoding='utf8');clips={};rows=[]
 selected={"fan_jiliu1":"元素战技·其一","fan_jiliu2":"元素战技·其二","fan_jiliu3":"重受击·其一","fan_shuijing1":"元素战技·其三","fan_shuijing2":"加入队伍·其一","fan_shuijing3":"加入队伍·其三",**{f"fan_mona{i}":f"倒下·其{n}" for i,n in enumerate("一二三",1)}}
 for name,label in selected.items():
  start=source.index('>'+label+'<');block=source[start:start+6000]
  urls=re.findall(r'https[^"<> ]+\.mp3',block)
  if urls:url=html.unescape(urls[0])
  else:
   if name.startswith('fan_jiliu'):filename='VO ZH Mona '+('Elemental Skill 1 '+name[-1].zfill(2) if name[-1]!='3' else 'Heavy Hit Taken 02')+'.ogg'
   elif name.startswith('fan_shuijing'):filename='VO ZH Mona '+('Elemental Skill 1 03' if name[-1]=='1' else 'Joining Party '+('01' if name[-1]=='2' else '03'))+'.ogg'
   else:filename='VO ZH Mona Fallen '+name[-1].zfill(2)+'.ogg'
   query='https://genshin-impact.fandom.com/api.php?'+urllib.parse.urlencode(dict(action='query',titles='File:'+filename,prop='imageinfo',iiprop='url',format='json'))
   cached=d/(name+('-spoken-media.json' if name=='fan_jiliu3' else '-media.json'))
   media=cached.read_bytes() if cached.exists() and b'imageinfo' in cached.read_bytes() else urllib.request.urlopen(urllib.request.Request(query,headers={'User-Agent':'Mozilla/5.0'})).read()
   cached.write_bytes(media)
   url=next(iter(json.loads(media)['query']['pages'].values()))['imageinfo'][0]['url'].split('/revision/')[0]
  m=re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)
  text=html.unescape(re.sub('<[^>]+>','',m[1])).strip()
  original=d/(name+('_spoken' if name=='fan_jiliu3' else '')+('.ogg' if '.ogg' in url else '.mp3'))
  if not original.exists():original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':page})).read())
  assert original.stat().st_size>1000
  out=ROOT/'audio/mona'/('die' if name.startswith('fan_mona') else 'skill')/(name+'.mp3');out.parent.mkdir(exist_ok=True)
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
 (d/'mona-sources.json').write_text(json.dumps(dict(page=page,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 (d/'mona-volume-report.json').write_text(json.dumps(dict(target_lufs=-14.25,reference='Eula playback median',clips=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'));catalog=[e for e in catalog if e['role']!='mona']
 for c in clips.values():catalog.append(dict(role='mona',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']))
 p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()


