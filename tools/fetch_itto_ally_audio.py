from pathlib import Path
import urllib.request,hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]; base=root/'audio/itto'; manifest=json.loads((base/'originals/itto-sources.json').read_text(encoding='utf8'))
for i in [1,2]:
 name=f'VO ZH Arataki Itto Ally at Low HP 0{i}.ogg'; normalized=name.replace(' ','_'); h=hashlib.md5(normalized.encode()).hexdigest()
 url=f'https://static.wikia.nocookie.net/gensin-impact/images/{h[0]}/{h[:2]}/{normalized}/revision/latest'
 req=urllib.request.Request(urllib.parse.quote(url,safe=':/'),headers={'User-Agent':'Mozilla/5.0'})
 data=urllib.request.urlopen(req,timeout=40).read(); assert data[:4]==b'OggS',data[:40]
 original=base/f'originals/fan_guiwang_move{i}.ogg'; original.write_bytes(data)
 manifest['clips'][f'fan_guiwang_move{i}']=dict(label=f'同伴生命值低·其{i}',text=['站在本大爷身后！','我不会让你倒下！'][i-1],url=url,bytes=len(data),original=original.relative_to(root).as_posix(),output=f'audio/itto/skill/fan_guiwang_move{i}.ogg',trim_seconds=None)
 (base/f'skill/fan_guiwang_move{i}.ogg').write_bytes(data)
 print(i,len(data))
(base/'originals/itto-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
