from pathlib import Path
import json,urllib.request
base=Path('audio/itto');p=base/'originals/itto-damage-source.json';record=json.loads(p.read_text(encoding='utf8'));data=urllib.request.urlopen(urllib.request.Request(record['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read();assert len(data)>1000 and not data.startswith(b'<')
for sub in ['originals','skill']:(base/sub/'fan_guiwang_damage.mp3').write_bytes(data)
p=base/'originals/itto-sources.json';m=json.loads(p.read_text(encoding='utf8'));m['clips']['fan_guiwang_damage']=dict(**record,bytes=len(data),original='audio/itto/originals/fan_guiwang_damage.mp3',output='audio/itto/skill/fan_guiwang_damage.mp3',trim_seconds=None);p.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
