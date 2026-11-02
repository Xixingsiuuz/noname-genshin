from pathlib import Path
import json, shutil, hashlib, statistics
from normalize_itto_audio import measure, run
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'audio/venti'; manifest=base/'originals/sources.json'
data=json.loads(manifest.read_text('utf8')); clips=data['clips']
ff='D:/FormatFactory/ffmpeg.exe'
for i,label in enumerate(['温迪，阳光驱散灰烬','温迪，见到了【时间】'],2):
 name=f'fan_songshi{i}'; original=base/'originals'/f'{name}.mp3'
 src=Path('C:/Users/22697/Downloads/温迪语音')/(label+'.mp3'); shutil.copyfile(src,original)
 text=clips[name]['text']
 assert clips[name].get('transcript_source'), 'Confirm full transcript before preparing local clips'
 clips[name].update(label=label,text=text,url=src.as_uri(),original=original.relative_to(ROOT).as_posix(),output=f'audio/venti/skill/fan_songshi_voice{i}.mp3',bytes=original.stat().st_size,trim_seconds=None)
target=statistics.median(measure(ff,ROOT/c['original'])['lufs'] for c in list(clips.values())[:9])
for c in clips.values():
 original=ROOT/c['original']; out=ROOT/c['output']; before=measure(ff,original)
 gain=min(target-before['lufs'],-1.5-before['true_peak_dbtp'])
 if c.get('transcript_source'): gain=min(gain+4,-1.5-before['true_peak_dbtp'])
 run(ff,['-y','-i',str(original),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
 c.update(gain_db=gain,before=before,after=measure(ff,out),output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest())
data['target_lufs']=target
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),'utf8')
p=ROOT/'character/voices.js'; s=p.read_text('utf8'); entries={('#ext:原神/'+c['output'][:-4]+(':die' if '/die/' in c['output'] else '')):c['text'] for c in clips.values()}
index=s.index('{'); voices=json.loads(s[index:s.rfind('}')+1]); voices.update(entries)
p.write_text(s[:index]+json.dumps(voices,ensure_ascii=False,indent=2)+';\n','utf8')
print('Prepared',len(clips),'clips; target LUFS',target)
