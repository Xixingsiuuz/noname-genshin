from pathlib import Path
import json,hashlib,re
r=Path(__file__).resolve().parents[1]
e=json.loads((r/'audio/lauma/originals/entries.json').read_text(encoding='utf8'))['entries']
clips={}
for name,labels in [('fan_shengyong',['元素战技·其四','元素战技·其五','元素战技·其六']),('fan_shengyong_draw',['元素战技·其一','元素战技·其二','元素战技·其三']),('fan_daoge',['元素爆发·其一','元素爆发·其二','元素爆发·其三']),('fan_lauma',['倒下·其一','倒下·其二','倒下·其三'])]:
 for i,label in enumerate(labels,1):
  output=f'audio/lauma/{"die" if name=="fan_lauma" else "skill"}/{name}{i}.mp3'
  clips[name+str(i)]={**e[label],'label':label,'output':output}
p=r/'audio/lauma/originals/lauma-sources.json';p.write_text(json.dumps({'clips':clips},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
p=r/'character/voices.js';s=p.read_text(encoding='utf8');v=json.loads(re.sub(r',\s*}', '}', s.split('export default ',1)[1].strip().removesuffix(';')))
for c in clips.values():
 key='#ext:原神/'+c['output'][:-4]+(':die' if '/die/' in c['output'] else '')
 v[key]=c['text']
p.write_text(s.split('export default ',1)[0]+'export default '+json.dumps(v,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
p=r/'audio/catalog.json';catalog=[x for x in json.loads(p.read_text(encoding='utf8')) if x.get('role')!='lauma']
for c in clips.values():
 for key in ['original','output']:
  data=(r/c[key]).read_bytes();catalog.append(dict(role='lauma',path=c[key],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
p=r/'extension.js';s=p.read_text(encoding='utf8');marker='      "audio/yelan/die/fan_yelan1.mp3",';assert marker in s
s=s.replace(marker,''.join('      '+json.dumps(c['output'])+',\n' for c in clips.values() if json.dumps(c['output']) not in s)+marker);p.write_text(s,encoding='utf8')
print('Registered 12 Lauma subtitles, sources and packaged clips')
