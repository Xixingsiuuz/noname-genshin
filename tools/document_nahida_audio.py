from pathlib import Path
import json, re
root=Path(__file__).resolve().parents[1]
clips=json.loads((root/'audio/nahida/originals/sources.json').read_text(encoding='utf8'))['clips']
p=root/'extension.js'
s=p.read_text(encoding='utf8')
s=re.sub(r'\s*"audio/nahida/[^"\n]+",', '', s)
if 'audio/nahida/skill/' not in s:
    marker='"audio/chasca/skill/fan_tiaoting1.mp3"'
    entries=',\n      '.join(json.dumps(c['output']) for c in clips)
    assert marker in s
    s=s.replace(marker, entries+',\n      '+marker,1)
    p.write_text(s,encoding='utf8')
p=root/'character/translate.js'
s=p.read_text(encoding='utf8')
s=re.sub(r'^\s*"#(?:fan_huaqiu_|fan_wenshou_|fan_huanjing_voice|fan_nahida)[^"\n]*":.*\n', '', s, flags=re.M)
lines=''.join('    '+json.dumps('#'+c['id'],ensure_ascii=False)+': '+json.dumps(c['text'],ensure_ascii=False)+',\n' for c in clips)
if '"#fan_huaqiu_start_voice1"' not in s:
    s=s.replace('    fan_huaqiu: "花囚",',lines+'    fan_huaqiu: "花囚",')
    p.write_text(s,encoding='utf8')
p=root/'audio/README.md'
s=p.read_text(encoding='utf8')
s=s.split('## 纳西妲语音（2026-11-02）')[0].rstrip()
if '## 纳西妲语音（2026-11-02）' not in s:
    s+='\n\n## 纳西妲语音（2026-11-02）\n八个技能时机各两句，阵亡三句。均为中文游戏原声，完整保留、未裁剪、未变速；来源条目、完整台词、URL、字节数及哈希记录于 nahida/originals/sources.json，原文件同目录保留。通过原生 audio、trySkillAudio 及 dieAudios 接入，尊重语音开关。兰荫（用户称兰护）不添加语音。\n\n|语音池|原声条目与台词|\n|---|---|\n'
    for c in clips:s+='|'+c['id']+'|'+c['label']+'：'+c['text']+'|\n'
    s+='\n花囚分别于实际初始翻面、防止伤害、第二轮解除时播放。闻授选牌确认后播放，取消不播；红黑分支于合格使用事件执行时播放，收牌仅在实际可获得时播放。幻景在最终用牌确认后的 precontent 播放，打开菜单与取消不播。记录、刷新、失效及无牌可收不播。未人工试听及游戏对局实测。\n'
    p.write_text(s,encoding='utf8')
