"""Fetch Raiden Chinese originals and apply measured per-clip static gain."""
from pathlib import Path
import urllib.request,urllib.parse,re,html,json,hashlib,subprocess,statistics
from normalize_itto_audio import measure,run
ROOT=Path(__file__).resolve().parents[1]
PAGE='https://wiki.biligame.com/ys/雷电将军语音'
ENTRIES={'fan_wuxiang_ready_voice':'加入队伍·其三','fan_wuxiang_hurt_voice':'重受击·其一','fan_wuxiang_sha_voice':'元素战技·其三','fan_wuxiang_duel_voice':'元素战技·其二','fan_wuxiang_thunder_voice1':'元素爆发·其一','fan_wuxiang_thunder_voice2':'元素爆发·其二','fan_wuxiang_thunder_voice3':'元素爆发·其三','fan_suoguo_voice1':'关于雷电将军自己·须臾','fan_suoguo_voice2':'关于雷电将军自己·永恒','fan_suoguo_voice3':'关于荒泷一斗…','fan_yushen_voice':'打开宝箱·其一','fan_yushen_voice_hm':'打开宝箱·其三','fan_yushen_voice_cooking':'影的烦恼…','fan_yushen_awaken_voice':'想要了解影·其四','fan_raiden':'倒下·其一'}
def main():
 import argparse
 ap=argparse.ArgumentParser();ap.add_argument('--ffmpeg',required=True);ap.add_argument('--only');args=ap.parse_args()
 base=ROOT/'audio/raiden'
 for f in ['skill','die','originals']:(base/f).mkdir(parents=True,exist_ok=True)
 s=(base/'originals/raiden-voice-page.html').read_text(encoding='utf8')
 refs=[dict(path=p.relative_to(ROOT).as_posix(),**measure(args.ffmpeg,p)) for folder in ['skill','die'] for p in sorted((ROOT/'audio/eula'/folder).glob('*'))]
 target=round(statistics.median(x['lufs'] for x in refs),2);manifest=base/'originals/raiden-sources.json';clips=json.loads(manifest.read_text(encoding='utf8'))['clips'] if manifest.exists() else {}
 clips.pop("fan_suoguo_voice", None)
 for name,label in ENTRIES.items():
  if args.only and name != args.only: continue
  start=s.index('>'+label+'<');chunk=s[start:start+3500]
  url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0]);text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',chunk,re.S)[1])).strip()
  original=base/'originals'/(name+'.mp3');out=base/('die' if name=='fan_raiden' else 'skill')/(name+'.mp3')
  data=original.read_bytes() if original.exists() else urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read();assert len(data)>1000 and not data.lstrip().startswith(b'<');original.write_bytes(data)
  trims = {'fan_yushen_awaken_voice': ([0.60,4.65], '追求「永恒」可能也只是一种逃避罢了。'), 'fan_suoguo_voice1': ([0.55,3.95], '雷鸣闪电，一瞬即逝。'), 'fan_suoguo_voice2': ([0.45,3.55], '「磨损」是一件很可怕的事情。')}
  trim, selected_text = trims.get(name, (None, None))
  if selected_text: text = selected_text
  filters = f'atrim=start={trim[0]}:end={trim[1]},asetpts=PTS-STARTPTS' if trim else 'anull'
  before=measure(args.ffmpeg,original,filters);gain=round(min(target-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  for attempt in range(4):
   run(args.ffmpeg,['-y','-i',str(original),'-af',filters+f',volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
   after=measure(args.ffmpeg,out)
   if after['true_peak_dbtp']<=-1:break
   gain=round(gain-after['true_peak_dbtp']-1.5,2)
  assert after['true_peak_dbtp']<=-1
  clips[name]=dict(label=label,text=text,url=url,bytes=len(data),original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=trim,output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),volume=dict(gain_db=gain,before=before,after=after))
 report=dict(page=PAGE,loudness_reference=dict(target_lufs=target,references=refs,method='static gain only; no speed change or compression; original sources retained; trim ranges per clip'),clips=clips)
 (base/'originals/raiden-sources.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 catalog_path=ROOT/'audio/catalog.json';catalog=json.loads(catalog_path.read_text(encoding='utf8'));catalog=[e for e in catalog if e['role']!='raiden']
 for clip in clips.values():
  for key in ['original','output']:
   p=ROOT/clip[key];data=p.read_bytes();catalog.append(dict(role='raiden',path=clip[key],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
 catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps({k:v['volume'] for k,v in clips.items()},ensure_ascii=False))
if __name__=='__main__':main()
