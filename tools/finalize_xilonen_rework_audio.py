from pathlib import Path
import re,json,subprocess,shutil,hashlib
root=Path.cwd();ff=r'D:/FormatFactory/ffmpeg.exe'
p=Path('character/translate.js');s=p.read_text(encoding='utf8')
texts={'fan_duanyin_info':'转换技，出牌阶段限一次，<br>阳：你可以重铸一张装备牌，令一名角色获得一项效果：摸牌阶段摸牌数+1；手牌上限+2；脱离濒死状态后回复1点体力。<br>阴：你可以摸一张牌，并回复1点体力。<br>其他角色的出牌阶段，若此技能状态为阴，其可以交给你一张装备牌，然后此技能状态变为阳。','fan_zhuhun_info':'限定技，当你进入濒死状态时，你可以选择一名角色，从武将牌堆随机观看三张武将牌，选择其中一张武将牌上的一个技能令该角色获得。'}
for k,v in texts.items():s=re.sub(r'    '+k+r': ".*?",',lambda m:'    '+k+': '+json.dumps(v,ensure_ascii=False)+',',s)
s=s.replace('    fan_duanyin_sha: "锻音·出杀",','    fan_duanyin_rescue: "锻音·脱离濒死",\n    fan_duanyin_gift: "锻音·交牌",\n    fan_duanyin_yin_voice: "锻音·阴",\n    fan_duanyin_change_voice: "锻音·转阳",').replace('    fan_zhuhun_dying: "铸魂",\n','');p.write_text(s,encoding='utf8')
p=Path('ui/skill-voices.js');s=p.read_text(encoding='utf8').replace('fan_duanyin: ["fan_duanyin"]','fan_duanyin: ["fan_duanyin", "fan_duanyin_yin_voice", "fan_duanyin_change_voice"]');p.write_text(s,encoding='utf8')
p=Path('audio/xilonen/originals/xilonen-sources.json');manifest=json.loads(p.read_text(encoding='utf8'));extra=json.loads(Path('audio/xilonen/originals/rework-sources.json').read_text(encoding='utf8'))
items=[('fan_duanyin_yin_voice1','rest',None,'忙活这么久，也该歇一歇了。你也来坐一会吧。'),('fan_duanyin_yin_voice2','sun',[0,4.35],'呼啊…睡个午觉吧。'),('fan_duanyin_change_voice1','worry',[1.95,9.1],'我最怕听见一句话：「这件事既不紧急，也不重要，听你安排，尽快就好。」'),('fan_duanyin_change_voice2','worry',[9.25,16.5],'哼，在我的工作经验中，这句话一般就等于说：「我随时都可能来催你。」')]
voices={}
for name,key,trim,text in items:
 original=f'audio/xilonen/originals/{key}.mp3';output=f'audio/xilonen/skill/{name}.mp3'
 if trim:subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-ss',str(trim[0]),'-i',original,'-t',str(trim[1]-trim[0]),'-c:a','libmp3lame','-q:a','2',output],check=True)
 else:shutil.copyfile(original,output)
 manifest['clips'][name]=dict(label=extra[key]['label'],text=text,url=extra[key]['url'],bytes=Path(original).stat().st_size,original=original,output=output,output_bytes=Path(output).stat().st_size,trim_seconds=trim)
 voices['#ext:原神/'+output[:-4]]=text
p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
p=Path('character/voices.js');s=p.read_text(encoding='utf8');s=s.replace('export default {','export default {\n'+'\n'.join('  '+json.dumps(k,ensure_ascii=False)+': '+json.dumps(v,ensure_ascii=False)+',' for k,v in voices.items()));p.write_text(s,encoding='utf8')
p=Path('extension.js');s=p.read_text(encoding='utf8');marker='      "audio/xilonen/die/fan_xilonen1.mp3",';s=s.replace(marker,'\n'.join('      '+json.dumps(manifest['clips'][n]['output'])+',' for n,_,_,_ in items)+'\n'+marker);p.write_text(s,encoding='utf8')
p=Path('audio/catalog.json');catalog=[x for x in json.loads(p.read_text(encoding='utf8')) if x.get('role')!='xilonen'];seen=set()
for c in manifest['clips'].values():
 for k in ['original','output']:
  path=c[k]
  if path in seen:continue
  seen.add(path);data=Path(path).read_bytes();catalog.append(dict(role='xilonen',path=path,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

