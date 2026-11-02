# 神里绫华语音

`skill/`：技能播放文件；`die/`：阵亡语音；`originals/`：原始录音及来源、裁剪资料（按已有资料保留）。

## 播放文件

- `die/fan_ayaka.mp3`
- `skill/fan_bailu.mp3`
- `skill/fan_binghua_choice.mp3`
- `skill/fan_binghua_intro.mp3`
- `skill/fan_binghua_take.mp3`
- `skill/fan_moran1.mp3`
- `skill/fan_moran2.mp3`

## 来源及用途

来自《原神》游戏内神里绫华中文配音（小N），通过原神 BWIKI 角色语音页获取。不使用合成配音，不变速、不拼接；除明确注明的截取片段外，MP3 保持来源文件原样。

核实日期：2026-10-24。来源页：https://wiki.biligame.com/ys/神里绫华语音

| 用途 | 游戏内条目 | 台词 | MP3帧估算时长 | 来源文件 |
| --- | --- | --- | --- | --- |
| 白鹭 | 元素战技·其二 | 失礼了。 | 0.86秒 | https://patchwiki.biligame.com/images/ys/2/2c/9moyz93pctyky5llhlr5bcuxnt5oh9v.mp3 |
| 冰华发动 | 初次见面…（前段） | 稻妻神里流太刀术皆传——神里绫华，参上！ | 约4.7秒 | https://patchwiki.biligame.com/images/ys/5/51/hx23f7cf96qrxdedj1x8km0ksmc8fwq.mp3 |
| 冰华选择第二项 | 初次见面…（后段，保留笑声） | 请多指教哦。 | 约2.5秒 | 同上 |
| 冰华·用杀消耗蓄力拿牌 | 元素爆发·其一 | …拿下了！ | 约0.86秒 | https://patchwiki.biligame.com/images/ys/b/b2/ap0txbic0g2ct3grvn9xvy3zt4zoc7r.mp3 |
| 墨染·其一 | 闲聊·名刀 | 刀剑抱业，名工怀宝。 | 4.06秒 | https://patchwiki.biligame.com/images/ys/0/02/kax4y0sz4rieq9gkfpjhswd8yppur5e.mp3 |
| 墨染·其二 | 下雪的时候…（仅诗词段） | 「雪霁银妆素，桔高映琼枝。」 | 文件约4.30秒 | https://patchwiki.biligame.com/images/ys/8/87/g29plqd4oog40q9zuqjdo6xs3gn8nvj.mp3 |
| 阵亡 | 倒下·其一 | 失态了… | 1.42秒 | https://patchwiki.biligame.com/images/ys/9/9d/k64b8m8p95ndjax3m37ob5twkfgb37z.mp3 |

使用本地 v1.11.6 原生 audio / dieAudios 路径解析及音频开关。冰华内部 ID 为 fan_binghua。墨染计数退还与效果结束等内部结算不额外播放技能语音。

墨染两条语音由原生引擎随机播放。雪天语音保留源文件前4.25秒（编码后文件约4.30秒），在诗词后的停顿处截断，不包含约5.37秒起的后续对白。未经裁剪的源文件保存在 originals/。旧版“雪纷飞”和“今日运势不错”音频已删除。

初次见面原声保存为 originals/ayaka-hello.mp3。前段截取0–4.65秒，后段从5.5秒截取至结尾，保留后段开头笑声；不变速、不合成。第二项语音以绫华为说话者，由原生 trySkillAudio 播放。白鹭仍按每回合首次黑色牌目标取消并摸牌执行。
