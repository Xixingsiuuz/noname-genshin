# 夜兰语音

`skill/`：技能播放文件；`die/`：阵亡语音；`originals/`：原始录音及来源、裁剪资料（按已有资料保留）。

## 播放文件

- `die/fan_yelan.mp3`
- `skill/fan_kuanghuo1.mp3`
- `skill/fan_kuanghuo2.mp3`
- `skill/fan_yuantu1.mp3`
- `skill/fan_yuantu2.mp3`

## 来源及用途

来源：[夜兰语音](https://wiki.biligame.com/ys/夜兰语音)，核实日期：2026-10-25，中文配音徐慧。使用游戏内中文原声，保留原始字节，不裁剪、不变速、不合成。

- 诓惑：元素爆发·其二、其三，原生随机播放；对应布置丝线与点数布局。
- 渊图：元素战技·其二、元素爆发·其一，原生随机播放；对应捕获与收工。
- 阵亡：倒下·其一，原生 `dieAudios` 路由。
- 仅实际发动布惑、确认收网时播放；征税、弃惑、失血、刷新、取消及内部记录不额外播音，尊重原生语音开关。

来源页面快照、五条完整原声与逐条URL/字节数位于 `originals/yelan-voice-page.html`、`originals/fan_*.mp3`、`originals/yelan-sources.json`；重现脚本为 `tools/fetch_yelan_audio.py`。未裁剪，`trim_seconds` 为 null。已校验来源与输出字节一致，未进行游戏内听音实测。
