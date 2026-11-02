from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'audio/ajax/originals/ajax-sources.json').read_text(encoding='utf8'))
p=ROOT/'character/voices.js'; text=p.read_text(encoding='utf8'); start=text.index('export default ')
voices=json.loads(text[start+15:].strip().rstrip(';'))
voices.pop('#ext:原神/audio/ajax/die/fan_ajax:die', None)
for clip in manifest['clips'].values():
    key='#ext:原神/'+str(Path(clip['output']).with_suffix('')).replace('\\','/')
    if '/die/' in clip['output']: key+=':die'
    voices[key]=clip['text']
p.write_text(text[:start]+'export default '+json.dumps(voices,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
p=ROOT/'extension.js'; text=p.read_text(encoding='utf8'); marker='"audio/ajax/skill/fan_jingwu_convert_voice.mp3"'
added=[c['output'] for c in manifest['clips'].values() if c['output'] not in text]
text=text.replace(marker, ''.join(json.dumps(x,ensure_ascii=False)+',\n      ' for x in added)+marker)
p.write_text(text,encoding='utf8')
report=json.loads((ROOT/'audio/ajax/originals/ajax-volume-report.json').read_text(encoding='utf8'))
section='## 阿贾克斯语音接入（2026-11-01）\n\n保留完整中文原声，不裁剪、不变速、不合成。源文件、URL、字节数及哈希见 `ajax/originals/ajax-sources.json`。\n\n'
section+='转化杀与精武附加效果分别播音；获得手牌、伤害、摸牌各为独立两条池。狂澜发动即播一次，回合末每次独立失血结算播一次；同次多点失血不重复，取消及重复通知不播。\n\n'
section+='阵亡池为两条：倒下·其一「怎能这样…得而复失…」、倒下·其二「失手了…」，由原生阵亡接口随机播放。倒下·其三的媒体链接返回403，尚未取得，不接入、不配置占位。\n\n'
section+='| 文件/用途 | 来源条目 | 完整台词 | 增益 dB | LUFS 前→后 | dBTP 前→后 |\n| --- | --- | --- | ---: | ---: | ---: |\n'
for row in report['clips']:
    clip=manifest['clips'][row['id']]; before=row['before']; after=row['after']
    section+=f"| {row['id']} | {clip['label']} | {clip['text']} | {row['gain_db']:+.2f} | {before['lufs']:.2f}→{after['lufs']:.2f} | {before['true_peak_dbtp']:.2f}→{after['true_peak_dbtp']:.2f} |\n"
section+='\n以优菈中位数 −14.25 LUFS 为参考逐条固定增益，受峰值约束时保留较低响度；编码后全部真峰值不高于 −1 dBTP。未人工试听、未真实对局验证。\n\n'
p=ROOT/'audio/README.md'; text=p.read_text(encoding='utf8'); begin=text.index('## 阿贾克斯语音接入'); end=text.find('\n## ',begin+4)
p.write_text(text[:begin]+section+(text[end:] if end>=0 else ''),encoding='utf8')
