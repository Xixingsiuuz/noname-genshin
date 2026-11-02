"""Fetch user-selected Chinese originals; static gain only, preserve source files."""
from pathlib import Path
import argparse, hashlib, html, json, re, urllib.request, urllib.parse
from fetch_mona_audio import measure
from normalize_itto_audio import run
ROOT = Path(__file__).resolve().parents[1]
SELECTED = {
 'fan_yingxin_start': '突破的感受·合',
 'fan_yingxin_draw1': '加入队伍·其三', 'fan_yingxin_draw2': '关于欧洛伦…',
 'fan_zhuyao_lose1': '元素战技·其一', 'fan_zhuyao_lose2': '元素战技·其三',
 'fan_zhuyao_draw1': '元素战技·其四', 'fan_zhuyao_draw2': '元素战技·其五',
 'fan_zhuyao_chengshi': '元素战技·其二',
 'fan_citlali_lianying1': '打开宝箱·其二', 'fan_citlali_lianying2': '打开宝箱·其一',
 'fan_miyan_use1': '元素爆发·其二', 'fan_miyan_use2': '元素爆发·其三',
 'fan_miyan_turn1': '闲聊·喝酒', 'fan_miyan_turn2': '下雨的时候…',
 **{f'fan_citlali{i}': f'倒下·其{n}' for i,n in enumerate('一二三',1)},
}
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--inspect',action='store_true'); ap.add_argument('--intro-end',type=float); args=ap.parse_args()
 directory=ROOT/'audio/citlali/originals'; directory.mkdir(parents=True,exist_ok=True)
 page='https://wiki.biligame.com/ys/'+urllib.parse.quote('茜特菈莉语音')
 source=(directory/'citlali-voice-page.html').read_text(encoding='utf8'); clips={}; rows=[]
 for name,label in SELECTED.items():
  start=source.index('>'+label+'<'); block=source[start:start+7000]
  url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
  text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)[1])).strip()
  print(name,label,text,flush=True)
  if args.inspect: continue
  original=directory/(name+'.mp3')
  if not original.exists(): original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':page})).read())
  assert original.stat().st_size>1000
  if name=='fan_yingxin_start' and args.intro_end is None: continue
  trim=[0,args.intro_end] if name=='fan_yingxin_start' else None
  filters=f'atrim=start=0:end={trim[1]},asetpts=PTS-STARTPTS' if trim else 'anull'
  if trim: text='从今以后，我会一直与你同行。'
  out=ROOT/'audio/citlali'/('die' if name.startswith('fan_citlali') and 'lianying' not in name else 'skill')/(name+'.mp3'); out.parent.mkdir(exist_ok=True)
  ff='D:/FormatFactory/ffmpeg.exe'; before=measure(ff,original) if not trim else __import__('normalize_itto_audio').measure(ff,original,filters)
  gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  for attempt in range(4):
   run(ff,['-y','-i',str(original),'-af',filters+f',volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
   after=measure(ff,out)
   if after['true_peak_dbtp']<=-1: break
   gain=round(gain-after['true_peak_dbtp']-1.5,2)
  assert after['true_peak_dbtp']<=-1
  row=dict(id=name,gain_db=gain,before=before,after=after); rows.append(row)
  clips[name]=dict(label=label,url=url,text=text,bytes=original.stat().st_size,original=original.relative_to(ROOT).as_posix(),original_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),output=out.relative_to(ROOT).as_posix(),trim_seconds=trim,trim_review='waveform/silence boundary; no human listening performed' if trim else None,volume=row,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),output_bytes=out.stat().st_size)
 if args.inspect: return
 (directory/'citlali-sources.json').write_text(json.dumps(dict(page=page,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 (directory/'citlali-volume-report.json').write_text(json.dumps(dict(target_lufs=-14.25,reference='Eula playback median',clips=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 p=ROOT/'audio/catalog.json'; catalog=json.loads(p.read_text(encoding='utf8')); catalog=[e for e in catalog if e['role']!='citlali']
 for c in clips.values(): catalog.append(dict(role='citlali',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']))
 p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__': main()
