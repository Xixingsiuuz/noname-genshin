"""Register Chiori audio assets in the existing package and integrity catalog."""
from pathlib import Path
import hashlib, json
ROOT = Path(__file__).resolve().parents[1]
clips = json.loads((ROOT/'audio/chiori/originals/chiori-sources.json').read_text(encoding='utf8'))['clips']
path = ROOT/'extension.js'
text = path.read_text(encoding='utf8')
marker = '      "audio/yelan/die/fan_yelan1.mp3",'
assert marker in text
missing = [c['output'] for c in clips.values() if '"'+c['output']+'"' not in text]
text = text.replace(marker, ''.join('      '+json.dumps(v)+',\n' for v in missing)+marker)
path.write_text(text,encoding='utf8')
path = ROOT/'audio/catalog.json'
catalog = [c for c in json.loads(path.read_text(encoding='utf8')) if c.get('role') != 'chiori']
for clip in clips.values():
    for key in ('original','output'):
        data = (ROOT/clip[key]).read_bytes()
        catalog.append(dict(role='chiori',path=clip[key],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
path = ROOT/'tests/audio-layout.mjs'
text = path.read_text(encoding='utf8').replace("const roles=['citlali'", "const roles=['chiori','citlali'")
path.write_text(text,encoding='utf8')
path = ROOT/'character/voices.js'
text = path.read_text(encoding='utf8')
values = {}
for clip in clips.values():
    key = '#ext:原神/' + clip['output'][:-4]
    if '/die/' in key: key += ':die'
    values[key] = clip['text']
missing = {k:v for k,v in values.items() if json.dumps(k,ensure_ascii=False) not in text}
text = text.replace('export default {', 'export default {\n' + '\n'.join('  '+json.dumps(k,ensure_ascii=False)+': '+json.dumps(v,ensure_ascii=False)+',' for k,v in missing.items()))
path.write_text(text,encoding='utf8')
