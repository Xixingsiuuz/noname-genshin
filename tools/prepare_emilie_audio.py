"""Reproduce requested clips and register playback files and captions."""
from pathlib import Path
import json, subprocess, hashlib
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'audio/emilie'
data=json.loads((base/'originals/entries.json').read_text(encoding='utf8'))
entries=list(data['entries'].items())
clips={}
for folder in ['skill','die']: (base/folder).mkdir(exist_ok=True)
plans=[('fan_xiecui_voice'+str(i+1),i,None,None,'skill') for i in range(3)]
plans += [('fan_yuxun_record_voice1',3,[0,1.6],'突然有了新的灵感…','skill'),('fan_yuxun_record_voice2',3,[1.8,4.73],'请稍等片刻，容我记录下来。','skill')]
plans += [('fan_yuxun_convert_voice'+str(i-3),i,None,None,'skill') for i in range(4,7)]
plans += [('fan_emilie'+str(i-6),i,None,None,'die') for i in range(7,10)]
voices={}
for name,index,trim,text,folder in plans:
 label,row=entries[index];original=ROOT/row['original'];output=base/folder/(name+'.mp3')
 args=['D:/FormatFactory/ffmpeg.exe','-y','-hide_banner','-loglevel','error']
 if trim: args+=['-ss',str(trim[0])]
 args+=['-i',str(original)]
 if trim: args+=['-t',str(trim[1]-trim[0])]
 subprocess.run(args+['-c:a','libmp3lame','-q:a','2',str(output)],check=True)
 clips[name]=dict(row,label=label,output=output.relative_to(ROOT).as_posix(),output_bytes=output.stat().st_size,trim_seconds=trim,text=text or row['text'])
 voices['#ext:原神/audio/emilie/'+folder+'/'+name+(':die' if folder=='die' else '')]=text or row['text']
(base/'originals/emilie-sources.json').write_text(json.dumps(dict(page=data['page'],clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'character/voices.js';s=p.read_text(encoding='utf8');s=s.replace('export default {','export default {\n'+''.join('  '+json.dumps(k,ensure_ascii=False)+': '+json.dumps(v,ensure_ascii=False)+',\n' for k,v in voices.items()));p.write_text(s,encoding='utf8')
p=ROOT/'extension.js';s=p.read_text(encoding='utf8');s=s.replace('skill: [], audio: [','skill: [], audio: [\n'+''.join('      '+json.dumps(c['output'],ensure_ascii=False)+',\n' for c in clips.values()));p.write_text(s,encoding='utf8')
p=ROOT/'audio/catalog.json';rows=json.loads(p.read_text(encoding='utf8'));rows=[r for r in rows if not r['path'].startswith('audio/emilie/')]
for c in clips.values():
 b=(ROOT/c['output']).read_bytes();rows.append(dict(path=c['output'],bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
p.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print('Prepared',len(clips),'clips with provenance and captions')
