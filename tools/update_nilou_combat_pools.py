from pathlib import Path
import json,hashlib,shutil,sys
sys.path.insert(0,'tools')
from normalize_itto_audio import measure,run
root=Path.cwd();base=root/'audio/nilou';folder=Path('C:/Users/22697/Downloads/Nilou_Combat_ZH');ff='C:/Users/22697/AppData/Local/Temp/nilou-audio-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
p=base/'originals/nilou-sources.json';m=json.loads(p.read_text(encoding='utf8'));media=json.loads((folder/'media-list.json').read_text(encoding='utf8'))['query']['allimages'];target=m['loudness_reference']['target_lufs'];new=[]
for family,stem,label in [('Mid_Attack','fan_pianzhuan_repeat_voice','中攻击'),('Deploying_Wind_Glider','fan_pianzhuan_guard_voice','打开风之翼')]:
 for i in range(1,4):
  filename=f'VO_ZH_Nilou_{family}_{i:02}.ogg';src=folder/filename;key=f'{stem}{i}';original=base/'originals'/filename;shutil.copyfile(src,original);out=base/'skill'/f'{key}.ogg';before=measure(ff,original,"aloop=loop=15:size=48000");gain=round(min(target-before['lufs'],-1.5-before['true_peak_dbtp']),2)
  for attempt in range(4):
   run(ff,['-y','-i',str(original),'-af',f'volume={gain}dB','-c:a','libvorbis','-q:a','5',str(out)]);after=measure(ff,out,"aloop=loop=15:size=48000")
   if after['true_peak_dbtp']<=-1:break
   gain=round(gain-after['true_peak_dbtp']-1.5,2)
  assert after['true_peak_dbtp']<=-1
  info=next((e for e in media if e['name']==filename),{})
  m['clips'][key]=dict(label=f'{label}·其{i}',text=f'（{label}语气声·其{i}，无文字台词）',original=original.relative_to(root).as_posix(),output=out.relative_to(root).as_posix(),url=info.get('url'),provided_by_user=str(src),bytes=original.stat().st_size,original_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),trim_seconds=None,volume=dict(gain_db=gain,before=before,after=after));new.append(key)
p.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
(base/'originals/nilou-volume-report.json').write_text(json.dumps(dict(target_lufs=target,method='static gain only; originals retained; no manual listening or live test',clips={k:c['volume'] for k,c in m['clips'].items()}),ensure_ascii=False,indent=2),encoding='utf8')

p=root/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'))
for entry in catalog:
 if entry.get('role')=='nilou':
  f=root/entry['path'];entry.update(bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest())
p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
