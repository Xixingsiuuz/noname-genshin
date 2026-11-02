# 哥伦比娅语音

`skill/`：技能播放文件；`die/`：阵亡语音；`originals/`：原始录音及来源、裁剪资料（按已有资料保留）。

## 播放文件

- `die/fan_columbina.mp3`
- `skill/fan_sulv1.mp3`
- `skill/fan_sulv2.mp3`
- `skill/fan_xiangchou1.mp3`
- `skill/fan_xiangchou2.mp3`
- `skill/fan_xiangchou3.mp3`
- `skill/fan_xiayin1.mp3`
- `skill/fan_xiayin2.mp3`
- `skill/fan_xiayin_flip1.mp3`
- `skill/fan_xiayin_flip2.mp3`
- `skill/fan_xiayin_use1.mp3`
- `skill/fan_xiayin_use2.mp3`
- `skill/fan_zhenyue_reveal.mp3`

## 来源及用途

来源：[哥伦比娅语音](https://wiki.biligame.com/ys/哥伦比娅语音)，核实日期：2026-10-24。沿用宵宫和神里绫华的原生技能及阵亡音频方式，不合成、不变速，MP3保持源文件字节。

- 乡愁：突破的感受·起、承、转，三条随机。
- 遐音第一项：打开宝箱·其一、其二，两条随机；确认指定明置牌后以哥伦比娅为说话者播放。
- 遐音第二项：元素战技·其一、其二，两条随机；只在实际反转时播放。
- 溯旅：元素爆发·其二、其三，两条随机；整次发动仅播放一次，不随每张重放重复。
- 真月：不播放语音（包括其他魏势力角色明置手牌时）。
- 阵亡：倒下·其一。
- 内部记录及资格刷新不额外播音。精确来源及字节数见 `originals/columbina-sources.json`，下载脚本为 `tools/fetch_columbina_audio.py`。
- 来源文件以 `.mp3` 命名，部分实际封装为 Ogg；保留来源字节与原生 `.mp3` 路径约定，由浏览器识别内容格式，不额外转码。游戏内实际播放尚需验证。
