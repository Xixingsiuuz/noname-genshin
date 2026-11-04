from pathlib import Path
import json,subprocess,hashlib
R=Path('.');p=R/'audio/kazuha/originals/kazuha-sources.json';d=json.loads(p.read_text(encoding='utf8'));c=d['clips'];c['fan_jilv3']=dict(c['fan_jilv2']);c['fan_jilv3']['output']='audio/kazuha/skill/fan_jilv3.mp3'
trims={'fan_jilv1':(0.25,4.0,'飘摇风雨中，睹物思故乡。'),'fan_jilv2':(0,4.1,'深山踏红叶，耳畔闻鹿鸣。'),'fan_jilv3':(5.25,10.8,'我很喜欢枫叶，可惜枫叶红时总多离别。'),'fan_zhenxiu1':(29.85,36.2,'没有任何人有资格剥夺他人的愿望，即便是「神」也不行。'),'fan_zhenxiu2':(6.1,14.8,'神之眼象征的是凡人继续向前的愿望，而我们武士的底气，一直都是手里的刀。')}
for name,v in c.items():
 if name in trims:
  start,end,text=trims[name];subprocess.run(['D:/FormatFactory/ffmpeg.exe','-y','-loglevel','error','-ss',str(start),'-i',v['original'],'-t',str(end-start),'-c:a','libmp3lame','-q:a','2',v['output']],check=True);v.update(trim_seconds=[start,end],text=text)
 v['output_bytes']=Path(v['output']).stat().st_size;v['sha256']=hashlib.sha256(Path(v['output']).read_bytes()).hexdigest()
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
p=Path('audio/catalog.json');a=json.loads(p.read_text(encoding='utf8'));a=[v for v in a if v.get('role',v['path'].split('/')[1])!='kazuha']+[dict(role='kazuha',path=v['output'],bytes=v['output_bytes'],sha256=v['sha256']) for v in c.values()];p.write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf8')
p=Path('extension.js');s=p.read_text(encoding='utf8').replace('skill: [], audio: [','skill: [], audio: [\n'+''.join('      '+json.dumps(v['output'])+',\n' for v in c.values()),1);p.write_text(s,encoding='utf8')
p=Path('character/skills/kazuha.js');s=p.read_text(encoding='utf8');
for skill,count in [('fan_jilv',3),('fan_zhenxiu',2),('fan_huanlei',3)]:s=s.replace('  '+skill+': {','  '+skill+': {\n    audio: "ext:原神/audio/kazuha/skill:'+str(count)+'",',1)
s=s.replace('      give: {','      give: {\n        audio: false,',1).replace('if (result.bool && result.targets[0].isIn() && remaining.length) await result.targets[0].gain(remaining, "gain2");','''if (result.bool && result.targets[0].isIn() && remaining.length) {
            game.trySkillAudio("fan_jilv_give_voice", player, true, true);
            await result.targets[0].gain(remaining, "gain2");
          }''');s=s.replace('export default {','export default {\n  fan_jilv_give_voice: { audio: [1,2,3].map(i => `ext:原神/audio/kazuha/skill/fan_jilv_give${i}.mp3`) },',1);p.write_text(s,encoding='utf8')
p=Path('character/character.js');s=p.read_text(encoding='utf8').replace('"ext:原神/image/character/portraits/kazuha.png"]','"ext:原神/image/character/portraits/kazuha.png", "die:ext:原神/audio/kazuha/die:3"]');p.write_text(s,encoding='utf8')
p=Path('ui/skill-voices.js');s=p.read_text(encoding='utf8').replace('export const skillVoiceGroups = {','export const skillVoiceGroups = {\n  fan_jilv: ["fan_jilv", "fan_jilv_give_voice"], fan_zhenxiu: ["fan_zhenxiu"], fan_huanlei: ["fan_huanlei"],',1);p.write_text(s,encoding='utf8')

