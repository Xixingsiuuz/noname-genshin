from pathlib import Path
import sys,json,re,html,hashlib
from normalize_itto_audio import measure,run
from normalize_mavuika_audio import recycle
ROOT=Path(__file__).resolve().parents[1]
F='C:/Users/22697/AppData/Local/Temp/zibai-audio-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
p=ROOT/'audio/mavuika/originals/mavuika-sources.json';m=json.loads(p.read_text(encoding='utf8'));clips=m['clips']
old=clips.pop('fan_zailin');recycle(ROOT/old['output'])
# The retired recording is unused; recycle it while retaining all recordings still used.
src=ROOT/old['original'];literal=str(src).replace("'","''")
import subprocess
subprocess.run(['powershell.exe','-NoProfile','-Command',"Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('"+literal+"','OnlyErrorDialogs','SendToRecycleBin')"],check=True)
page=(p.parent/'mavuika-voice-page.html').read_text(encoding='utf8')
items=[('fan_zailin1','introduction','初次见面…','追寻火焰在时间长河中的足迹，我们将至黑之地以血泪铸成家园。',[0,7.1]),('fan_zailin2','introduction','初次见面…','而今，长路向前延续，旅途正待新篇。',[7.1,12.2]),('fan_zailin3','introduction','初次见面…','现任火神玛薇卡，助你的视野中再无漆黑。',[12.2,16.7]),('fan_mavuika2','death2','倒下·其二','传承，终结了吗？',None),('fan_mavuika3','death3','倒下·其三','命运，如此？',None)]
c=clips.pop('fan_mavuika')
for key in ['original','output']:
 a=ROOT/c[key];b=a.with_name('fan_mavuika1.mp3');a.rename(b);c[key]=b.relative_to(ROOT).as_posix()
c['volume']['id']='fan_mavuika1';clips['fan_mavuika1']=c
for name,source,label,text,trim in items:
 original=p.parent/(source+'.mp3');out=ROOT/'audio/mavuika'/('die' if source.startswith('death') else 'skill')/(name+'.mp3')
 chunk=page[page.index('>'+label+'<'):][:3500];url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0])
 filters=f'atrim=start={trim[0]}:end={trim[1]},asetpts=PTS-STARTPTS' if trim else 'anull'
 before=measure(F,original,filters);gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
 for _ in range(4):
  run(F,['-i',str(original),'-af',filters+f',volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
  after=measure(F,out)
  if after['true_peak_dbtp']<=-1:break
  recycle(out);gain=round(gain-max(.5,after['true_peak_dbtp']+1.5),2)
 assert after['true_peak_dbtp']<=-1
 clips[name]=dict(label=label,text=text,url=url,original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),bytes=original.stat().st_size,original_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),trim_seconds=trim,output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),volume=dict(id=name,text=text,gain_db=gain,before=before,after=after))
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for filename,a,b in [('character/skills/mavuika.js','fan_zailin: {\n    audio: "ext:原神/audio/mavuika/skill:true"','fan_zailin: {\n    audio: "ext:原神/audio/mavuika/skill:3"'),('character/character.js','die:ext:原神/audio/mavuika/die:true','die:ext:原神/audio/mavuika/die:3')]:
 f=ROOT/filename;s=f.read_text(encoding='utf8');assert a in s;f.write_text(s.replace(a,b),encoding='utf8')
f=ROOT/'extension.js';s=f.read_text(encoding='utf8').replace('"audio/mavuika/skill/fan_zailin.mp3"',', '.join('"audio/mavuika/skill/fan_zailin'+str(i)+'.mp3"' for i in range(1,4))).replace('"audio/mavuika/die/fan_mavuika.mp3"',', '.join('"audio/mavuika/die/fan_mavuika'+str(i)+'.mp3"' for i in range(1,4)));f.write_text(s,encoding='utf8')
