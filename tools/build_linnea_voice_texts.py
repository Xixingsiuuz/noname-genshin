"""Map saved source text and recorded cuts to the actual native playback paths."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
directory = ROOT / 'audio/linnea/originals'
sources = json.loads((directory / 'sources.json').read_text('utf8'))
cuts = json.loads((directory / 'cuts.json').read_text('utf8'))
fragments = {
    'fan_bowen_reveal1': '哇，你的脑袋里到底是装了多少奇妙的见闻呀！',
    'fan_bowen_reveal2': '要不干脆让我推荐你当冒险家协会的顾问吧？',
    'fan_bowen_convert1': '感受得到力量的流动…',
    'fan_bowen_convert2': '知识正在转化为直觉…',
    'fan_shizhi_cancel1': '黄金的梦乡在召唤流浪的沙子，',
    'fan_shizhi_cancel2': '在这里不必将那苦涩的盐水掬饮，',
    'fan_shizhi_cancel3': '在这里不会再有明日的愁肠…',
}
entries = {}
for cut in cuts:
    name = cut['name']
    playback = name
    for branch in ['fan_bowen_reveal', 'fan_bowen_convert', 'fan_shizhi_draw', 'fan_shizhi_cancel']:
        if name.startswith(branch):
            playback = name.replace(branch, branch + '_voice', 1)
    area = 'die' if name.startswith('fan_linnea') else 'skill'
    output = f'audio/linnea/{area}/{playback}.mp3'
    assert (ROOT / output).is_file(), output
    text = fragments.get(name, sources[cut['source'] - 1]['text'])
    cut.update(text=text, output=output)
    entries['#ext:原神/' + output[:-4] + (':die' if area == 'die' else '')] = text
(directory / 'cuts.json').write_text(json.dumps(cuts, ensure_ascii=False, indent=2) + '\n', 'utf8')
path = ROOT / 'character/voices.js'
source = path.read_text('utf8')
start = source.index('{')
voices = json.loads(source[start:source.rfind('}') + 1])
voices.update(entries)
path.write_text(source[:start] + json.dumps(voices, ensure_ascii=False, indent=2) + ';\n', 'utf8')
print(f'Updated {len(entries)} Linnea subtitle paths')
