# 交互超时源码核查（2026-11-22）

范围：extension.js、character/、card/、ui/ 的现用 JavaScript。下表逐项列出显式原生选择调用；技能定义中的 enable、chooseButton、viewAs 入口另外由原生 chooseToUse/chooseToRespond 展开。此为源码核查和模拟回归，不是逐项联机实测。

## 修复

- 欧洛伦【藏蜜】分配：保留选牌后点击场上角色的紧凑分配界面，接入原生 chooseControl 的 addDialog 回调、countChoose 与远端派发。全部安排完一次确认；switchToAuto 保留有效分配，仅补全未分配及接收者离场的牌。关闭或提交清理监听，防止旧事件及重复提交。无目标时安全返回。
- 赛诺衍生牌【天帝】：本地自定义操作按钮使 filterOk 恒为 false，新增 processAI 直接提交合法选牌结果，避免自动决策受禁用确认条件阻挡。后续原生选择使用或弃置，保留已有流程。

## 特殊交互逐项核对

| 入口 | 源码结论 |
| --- | --- |
| 藏蜜自建暂停 | 已接入原生 chooseControl，恢复点击场上角色分配 |
| 天帝自建操作按钮 | 已补独立 processAI；finally 关闭控件 |
| 重拳出击鸭 | 原生 chooseCard；已有 processAI；finally 关闭自建控件 |
| 测试武将 localDialog | 原生 chooseControl；AI 选择取消，取消不执行编辑；原生关闭 controlbar |
| 转化素材联合选择 | 原生 chooseButton；ui/conversion-material.js 提供素材与牌名联合 processAI |
| 千织飞刃、闲云仙助 | 联合选牌已有独立 processAI；结算前复核素材 |
| 赛诺、黛愫、莉奈娅等转化入口 | 通过原生选择事件或 backup 运行，非自建 Promise 等待 |
| 白术、莫娜、宵宫及赛诺换牌 | 原生 chooseToMove；各有 processAI 与最终布局检查 |
| 哥伦比娅遐音、甘雨、归终机等手动确认 | 原生选择事件；filterOk 校验最终结果；手动确认标志不关闭引擎托管 |
| ui/confirm.js 确认及按钮布局 | 包装原生控件，不自行暂停；不替换原生超时入口 |
| extension.js 自动提交钩子 | 微任务内重查当前事件与合法性，避免同步提交后原生再次暂停 |
| 瓦雷莎语音等待 | 非选牌等待，有10秒退出兜底 |
| 魈语音队列 | 仅客户端音频 Promise，不阻塞规则结算 |

## 引擎依据

- noname/library/element/gameEvent.js：send 重建原生选择事件并重放 set 字段，addDialog 回调不依赖闭包。
- noname/library/element/player.js：原生选择事件创建；wait 通过 choose_timeout 建立远端超时并以 ai 返回（异常连接另有关闭处理）。
- noname/library/element/content.js：chooseToMove 本地调用 countChoose，switchToAuto 对未完成的强制选择返回 ai；最终调用 processAI；远端使用 sendAsync。
- 同文件 chooseCard/chooseButton 等：收到 ai 后执行 processAI 或原生选牌、选目标 AI。
- noname/ui/click/index.js：托管调用当前事件 switchToAuto，或恢复原生事件进入 AI 流程。

## 验证范围与限制

本轮新增界面回归覆盖选牌、点击角色、确认门槛、保留部分方案、离场补分配、关闭清理、旧事件及重复提交；替换上一轮 chooseToMove 专属测试。tests/interaction-timeout.mjs 覆盖两处修复的自动决策、手动分配、非法/重复牌、离场后补分配及无合法牌结束。并运行原有欧洛伦、帝王与全扩展测试。完整输出见 interaction-timeout-results.json。全量126项运行中115项通过、11项失败；失败包括已有测试动态编译未处理新增 import、资源尺寸/字幕断言、胡桃测试替身缺少 hasCard，以及浏览器启动环境问题。这些测试不能计作通过。本次不修改这些无关资源与测试契约。

尚未进行真实联机倒计时、房主/远端断线、自动确认开关及不同布局的游戏界面实测。接入原生流程与模拟通过不能证明每个技能所有网络边界均无问题。

## 原生选择调用清单

| 文件 | 行 | 接口 | 超时接入 |
| --- | ---: | --- | --- |
| card/aino.js | 42 | chooseCard | 原生事件（源码核查） |
| card/blackwing.js | 28 | chooseToDiscard | 原生事件（源码核查） |
| card/cyber-dragon.js | 31 | chooseControl | 原生事件（源码核查） |
| card/cyber-dragon.js | 48 | chooseTarget | 原生事件（源码核查） |
| card/cyber-dragon.js | 51 | chooseToUse | 原生事件（源码核查） |
| card/cyberse.js | 35 | chooseToDiscard | 原生事件（源码核查） |
| card/cyberse.js | 40 | chooseTarget | 原生事件（源码核查） |
| card/cyberse.js | 82 | chooseToUse | 原生事件（源码核查） |
| card/cyno-skills.js | 151 | chooseToMove | 原生事件（源码核查） |
| card/heroes.js | 61 | chooseTarget | 原生事件（源码核查） |
| card/heroes.js | 81 | chooseTarget | 原生事件（源码核查） |
| card/heroes.js | 95 | chooseCard | 原生事件（源码核查） |
| card/heroes.js | 104 | chooseControl | 原生事件（源码核查） |
| card/mechanism-skills.js | 31 | chooseButton | 原生事件（源码核查） |
| card/mechanism-skills.js | 39 | chooseToUse | 原生事件（源码核查） |
| card/mechanism-skills.js | 69 | chooseCard | 原生事件（源码核查） |
| card/monarch.js | 22 | chooseButton | 原生事件（源码核查） |
| card/monarch.js | 61 | chooseButton | 原生事件（源码核查） |
| card/monarch.js | 67 | chooseUseTarget | 原生事件（源码核查） |
| card/pendulum.js | 23 | chooseControl | 原生事件（源码核查） |
| card/pile-text-search.js | 26 | chooseButton | 原生事件（源码核查） |
| card/red-eyes.js | 23 | chooseToDiscard | 原生事件（源码核查） |
| card/sky-striker.js | 64 | chooseToDiscard | 原生事件（源码核查） |
| card/sky-striker.js | 115 | chooseToUse | 原生事件（源码核查） |
| card/stardust-sync.js | 14 | chooseToDiscard | 原生事件（源码核查） |
| card/stardust.js | 45 | chooseControl | 原生事件（源码核查） |
| card/stardust.js | 53 | chooseButton | 原生事件（源码核查） |
| card/stardust.js | 94 | chooseToUse | 原生事件（源码核查） |
| card/trains.js | 22 | chooseToDiscard | 原生事件（源码核查） |
| card/trains.js | 58 | chooseCard | 原生事件（源码核查） |
| card/utopia.js | 50 | chooseToDiscard | 原生事件（源码核查） |
| card/utopia.js | 79 | chooseToDiscard | 原生事件（源码核查） |
| card/utopia.js | 93 | chooseToUse | 原生事件（源码核查） |
| card/yaemiko.js | 18 | chooseCard | 原生事件（源码核查） |
| character/skills/ajax.js | 253 | chooseUseTarget | 原生事件（源码核查） |
| character/skills/albedo.js | 53 | chooseBool | 原生事件（源码核查） |
| character/skills/arlecchino.js | 67 | chooseControl | 原生事件（源码核查） |
| character/skills/arlecchino.js | 126 | chooseControl | 原生事件（源码核查） |
| character/skills/ayaka.js | 122 | chooseControl | 原生事件（源码核查） |
| character/skills/ayaka.js | 158 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/ayaka.js | 203 | chooseBool | 原生事件（源码核查） |
| character/skills/ayato.js | 59 | chooseCard | 原生事件（源码核查） |
| character/skills/ayato.js | 74 | chooseButton | 原生事件（源码核查） |
| character/skills/ayato.js | 82 | chooseCard | 原生事件（源码核查） |
| character/skills/ayato.js | 122 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/baizhu.js | 61 | chooseToMove | 原生事件（源码核查） |
| character/skills/charlotte.js | 51 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/charlotte.js | 61 | chooseTarget | 原生事件（源码核查） |
| character/skills/charlotte.js | 68 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/charlotte.js | 97 | chooseButton | 原生事件（源码核查） |
| character/skills/charlotte.js | 127 | chooseCardOL | 原生事件（源码核查） |
| character/skills/chasca.js | 42 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/chasca.js | 86 | chooseBool | 原生事件（源码核查） |
| character/skills/chiori.js | 31 | chooseCard | 原生事件（源码核查） |
| character/skills/chiori.js | 118 | chooseButton | 原生事件（源码核查） |
| character/skills/citlali.js | 97 | chooseButton | 原生事件（源码核查） |
| character/skills/citlali.js | 114 | chooseToUse | 原生事件（源码核查） |
| character/skills/citlali.js | 158 | chooseTarget | 原生事件（源码核查） |
| character/skills/citlali.js | 261 | chooseTarget | 原生事件（源码核查） |
| character/skills/citlali.js | 289 | chooseBool | 原生事件（源码核查） |
| character/skills/citlali.js | 302 | chooseButtonTarget | 原生事件（源码核查） |
| character/skills/citlali.js | 339 | chooseButton | 原生事件（源码核查） |
| character/skills/citlali.js | 346 | chooseToUse | 原生事件（源码核查） |
| character/skills/columbina.js | 51 | chooseCard | 原生事件（源码核查） |
| character/skills/columbina.js | 85 | chooseButton | 原生事件（源码核查） |
| character/skills/columbina.js | 108 | chooseToUse | 原生事件（源码核查） |
| character/skills/columbina.js | 194 | chooseUseTarget | 原生事件（源码核查） |
| character/skills/cyno.js | 112 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/cyno.js | 159 | chooseButton | 原生事件（源码核查） |
| character/skills/dahlia.js | 36 | chooseCard | 原生事件（源码核查） |
| character/skills/dehya.js | 19 | chooseUseTarget | 原生事件（源码核查） |
| character/skills/dehya.js | 30 | chooseBool | 原生事件（源码核查） |
| character/skills/diluc.js | 49 | chooseBool | 原生事件（源码核查） |
| character/skills/diluc.js | 109 | chooseButton | 原生事件（源码核查） |
| character/skills/durin.js | 38 | chooseBool | 原生事件（源码核查） |
| character/skills/durin.js | 62 | chooseButton | 原生事件（源码核查） |
| character/skills/durin.js | 106 | chooseTarget | 原生事件（源码核查） |
| character/skills/durin.js | 123 | chooseCard | 原生事件（源码核查） |
| character/skills/emilie.js | 27 | chooseCardTarget | 原生事件（源码核查） |
| character/skills/escoffier.js | 13 | chooseCardTarget | 原生事件（源码核查） |
| character/skills/flins.js | 27 | chooseToUse | 原生事件（源码核查） |
| character/skills/furina.js | 77 | chooseTarget | 原生事件（源码核查） |
| character/skills/gaming.js | 30 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/gaming.js | 40 | chooseButton | 原生事件（源码核查） |
| character/skills/gaming.js | 50 | chooseToUse | 原生事件（源码核查） |
| character/skills/gaming.js | 71 | chooseBool | 原生事件（源码核查） |
| character/skills/ganyu.js | 73 | chooseButton | 原生事件（源码核查） |
| character/skills/ganyu.js | 120 | chooseButton | 原生事件（源码核查） |
| character/skills/iansan.js | 31 | chooseTarget | 原生事件（源码核查） |
| character/skills/ifa.js | 9 | chooseTarget | 原生事件（源码核查） |
| character/skills/ifa.js | 20 | chooseCard | 原生事件（源码核查） |
| character/skills/illuga.js | 19 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/illuga.js | 68 | chooseBool | 原生事件（源码核查） |
| character/skills/illuga.js | 94 | chooseBool | 原生事件（源码核查） |
| character/skills/ineffa.js | 19 | chooseButtonTarget | 原生事件（源码核查） |
| character/skills/ineffa.js | 53 | chooseUseTarget | 原生事件（源码核查） |
| character/skills/itto.js | 34 | chooseButton | 原生事件（源码核查） |
| character/skills/itto.js | 54 | chooseTarget | 原生事件（源码核查） |
| character/skills/itto.js | 76 | chooseToCompare | 原生事件（源码核查） |
| character/skills/itto.js | 96 | chooseControl | 原生事件（源码核查） |
| character/skills/itto.js | 98 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/jahoda.js | 46 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/jahoda.js | 57 | chooseToUse | 原生事件（源码核查） |
| character/skills/jean.js | 42 | chooseBool | 原生事件（源码核查） |
| character/skills/jean.js | 97 | chooseControl | 原生事件（源码核查） |
| character/skills/kachina.js | 9 | chooseTarget | 原生事件（源码核查） |
| character/skills/kachina.js | 37 | chooseButton | 原生事件（源码核查） |
| character/skills/kachina.js | 48 | chooseButton | 原生事件（源码核查） |
| character/skills/kazuha.js | 37 | chooseTarget | 原生事件（源码核查） |
| character/skills/keqing.js | 17 | chooseBool | 原生事件（源码核查） |
| character/skills/keqing.js | 24 | chooseButton | 原生事件（源码核查） |
| character/skills/kinich.js | 16 | chooseBool | 原生事件（源码核查） |
| character/skills/kinich.js | 26 | chooseToUse | 原生事件（源码核查） |
| character/skills/klee.js | 86 | chooseCardTarget | 原生事件（源码核查） |
| character/skills/kokomi.js | 15 | chooseTarget | 原生事件（源码核查） |
| character/skills/kokomi.js | 70 | chooseTarget | 原生事件（源码核查） |
| character/skills/kokomi.js | 105 | chooseTarget | 原生事件（源码核查） |
| character/skills/lauma.js | 26 | chooseCard | 原生事件（源码核查） |
| character/skills/lauma.js | 83 | chooseTarget | 原生事件（源码核查） |
| character/skills/lauma.js | 113 | chooseControl | 原生事件（源码核查） |
| character/skills/lauma.js | 125 | chooseTarget | 原生事件（源码核查） |
| character/skills/linnea.js | 38 | chooseTarget | 原生事件（源码核查） |
| character/skills/linnea.js | 42 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/linnea.js | 136 | chooseControl | 原生事件（源码核查） |
| character/skills/lyney.js | 42 | chooseControl | 原生事件（源码核查） |
| character/skills/mavuika.js | 186 | chooseControl | 原生事件（源码核查） |
| character/skills/mavuika.js | 221 | chooseTarget | 原生事件（源码核查） |
| character/skills/mavuika.js | 257 | chooseTarget | 原生事件（源码核查） |
| character/skills/mizuki.js | 104 | chooseToUse | 原生事件（源码核查） |
| character/skills/mona.js | 24 | chooseToMove | 原生事件（源码核查） |
| character/skills/mona.js | 66 | chooseControl | 原生事件（源码核查） |
| character/skills/mualani.js | 16 | chooseControl | 原生事件（源码核查） |
| character/skills/nahida.js | 102 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/nahida.js | 143 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/nahida.js | 230 | chooseBool | 原生事件（源码核查） |
| character/skills/navia.js | 42 | chooseToCompare | 原生事件（源码核查） |
| character/skills/navia.js | 88 | chooseCardButton | 原生事件（源码核查） |
| character/skills/navia.js | 103 | chooseUseTarget | 原生事件（源码核查） |
| character/skills/nefer.js | 128 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/nefer.js | 142 | chooseButton | 原生事件（源码核查） |
| character/skills/neuvillette.js | 60 | chooseButtonTarget | 原生事件（源码核查） |
| character/skills/neuvillette.js | 85 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/neuvillette.js | 101 | chooseTarget | 原生事件（源码核查） |
| character/skills/nicole.js | 58 | chooseButton | 原生事件（源码核查） |
| character/skills/nicole.js | 276 | chooseControl | 原生事件（源码核查） |
| character/skills/nicole.js | 300 | chooseToUse | 原生事件（源码核查） |
| character/skills/nilou.js | 157 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/prune.js | 21 | chooseBool | 原生事件（源码核查） |
| character/skills/prune.js | 50 | chooseBool | 原生事件（源码核查） |
| character/skills/prune.js | 58 | chooseTarget | 原生事件（源码核查） |
| character/skills/qiqi.js | 20 | chooseBool | 原生事件（源码核查） |
| character/skills/qiqi.js | 37 | chooseTarget | 原生事件（源码核查） |
| character/skills/qiqi.js | 82 | chooseBool | 原生事件（源码核查） |
| character/skills/raiden.js | 234 | chooseTarget | 原生事件（源码核查） |
| character/skills/sandrone.js | 33 | chooseControl | 原生事件（源码核查） |
| character/skills/sandrone.js | 62 | chooseControl | 原生事件（源码核查） |
| character/skills/sandrone.js | 70 | chooseControl | 原生事件（源码核查） |
| character/skills/sandrone.js | 87 | chooseTarget | 原生事件（源码核查） |
| character/skills/sandrone.js | 98 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/sandrone.js | 99 | chooseCard | 原生事件（源码核查） |
| character/skills/sethos.js | 33 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/sethos.js | 35 | chooseBool | 原生事件（源码核查） |
| character/skills/sethos.js | 99 | chooseTarget | 原生事件（源码核查） |
| character/skills/shenhe.js | 32 | chooseTarget | 原生事件（源码核查） |
| character/skills/shenhe.js | 38 | chooseControl | 原生事件（源码核查） |
| character/skills/shenhe.js | 106 | chooseControl | 原生事件（源码核查） |
| character/skills/sigewinne.js | 54 | chooseTarget | 原生事件（源码核查） |
| character/skills/sigewinne.js | 66 | chooseControl | 原生事件（源码核查） |
| character/skills/skirk.js | 33 | chooseToUse | 原生事件（源码核查） |
| character/skills/sp_sandrone.js | 29 | chooseButton | 原生事件（源码核查） |
| character/skills/sp_sandrone.js | 34 | chooseControl | 原生事件（源码核查） |
| character/skills/tester.js | 12 | chooseControl | 原生事件（源码核查） |
| character/skills/tester.js | 198 | chooseControl | 原生事件（源码核查） |
| character/skills/tester.js | 202 | chooseControl | 原生事件（源码核查） |
| character/skills/tester.js | 209 | chooseButton | 原生事件（源码核查） |
| character/skills/tester.js | 214 | chooseButton | 原生事件（源码核查） |
| character/skills/tester.js | 233 | chooseCardTarget | 原生事件（源码核查） |
| character/skills/tester.js | 294 | chooseBool | 原生事件（源码核查） |
| character/skills/tighnari.js | 19 | chooseTarget | 原生事件（源码核查） |
| character/skills/tighnari.js | 26 | choosePlayerCard | 原生事件（源码核查） |
| character/skills/varesa.js | 32 | chooseControl | 原生事件（源码核查） |
| character/skills/varesa.js | 52 | chooseTarget | 原生事件（源码核查） |
| character/skills/varka.js | 134 | chooseTarget | 原生事件（源码核查） |
| character/skills/varka.js | 144 | chooseBool | 原生事件（源码核查） |
| character/skills/venti.js | 19 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/venti.js | 33 | chooseButton | 原生事件（源码核查） |
| character/skills/venti.js | 51 | chooseTarget | 原生事件（源码核查） |
| character/skills/venti.js | 57 | chooseCooperationFor | 原生事件（源码核查） |
| character/skills/venti.js | 157 | chooseTarget | 原生事件（源码核查） |
| character/skills/wanderer.js | 9 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/wanderer.js | 85 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/wriothesley.js | 33 | chooseControl | 原生事件（源码核查） |
| character/skills/xianyun.js | 38 | chooseTarget | 原生事件（源码核查） |
| character/skills/xianyun.js | 50 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/xianyun.js | 76 | chooseButton | 原生事件（源码核查） |
| character/skills/xianyun.js | 98 | chooseTarget | 原生事件（源码核查） |
| character/skills/xiao.js | 46 | chooseBool | 原生事件（源码核查） |
| character/skills/xilonen.js | 65 | chooseControl | 原生事件（源码核查） |
| character/skills/xilonen.js | 133 | chooseTarget | 原生事件（源码核查） |
| character/skills/xilonen.js | 144 | chooseButton | 原生事件（源码核查） |
| character/skills/xilonen.js | 147 | chooseButton | 原生事件（源码核查） |
| character/skills/yaemiko.js | 24 | chooseBool | 原生事件（源码核查） |
| character/skills/yaemiko.js | 42 | chooseBool | 原生事件（源码核查） |
| character/skills/yaemiko.js | 70 | chooseCard | 原生事件（源码核查） |
| character/skills/yelan.js | 98 | chooseCard | 原生事件（源码核查） |
| character/skills/yelan.js | 225 | chooseBool | 原生事件（源码核查） |
| character/skills/yoimiya.js | 102 | chooseToMove | 原生事件（源码核查） |
| character/skills/yoimiya.js | 150 | chooseControl | 原生事件（源码核查） |
| character/skills/yoimiya.js | 192 | chooseBool | 原生事件（源码核查） |
| character/skills/zhongli.js | 96 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/zhongli_rework.js | 100 | chooseCardTarget | 原生事件（源码核查） |
| character/skills/zibai.js | 79 | chooseCard | 原生事件（源码核查） |
| character/skills/zibai.js | 127 | chooseControl | 原生事件（源码核查） |
| character/skills/zibai.js | 134 | chooseBool | 原生事件（源码核查） |
| character/skills/zibai.js | 141 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/zibai.js | 169 | chooseControl | 原生事件（源码核查） |
| character/skills/zibai.js | 401 | chooseTarget | 原生事件（源码核查） |
| character/skills/zibai.js | 423 | chooseBool | 原生事件（源码核查） |
| character/skills/zibai.js | 442 | chooseControl | 原生事件（源码核查） |
| ui/crown-path.js | 35 | chooseTarget | 原生事件（源码核查） |
| ui/crown-path.js | 70 | chooseControl | 原生事件（源码核查） |
| ui/crown-path.js | 104 | chooseToDiscard | 原生事件（源码核查） |
| character/skills/ororon.js | 110 | chooseControl | 原生事件（源码核查） |
| character/skills/ororon.js | 154 | chooseCard | 原生事件（源码核查） |
| character/skills/ororon.js | 191 | chooseTarget | 原生事件（源码核查） |
| character/skills/ororon.js | 200 | chooseToDiscard | 原生事件（源码核查） |
