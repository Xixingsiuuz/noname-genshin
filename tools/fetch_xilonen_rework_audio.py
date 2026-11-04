import json,urllib.request
from pathlib import Path
p=Path('audio/xilonen/originals');items=json.loads((p/'rework-sources.json').read_text(encoding='utf8'))
for k,v in items.items():
 data=urllib.request.urlopen(urllib.request.Request(v['url'],headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=40).read();(p/(k+'.mp3')).write_bytes(data);v['bytes']=len(data)
(p/'rework-sources.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf8')
