import { get, game } from "../../../../noname.js";

export default {
  fan_polang: {
    trigger: { player: "useCardToPlayered" },
    forced: true,
    audio: false,
    // 直接询问选项，取消即跳过本次，不再询问是否发动。
    popup: false,
    filter(event) { return get.tag(event.card, "damage") > 0; },
    marktext: "浪",
    onremove: true,
    intro: { name: "浪势", content: "mark" },
    async content(event, trigger, player) {
      const count = player.countMark("fan_polang");
      const result = await player.chooseControl("选项一", "选项二", "背水", "cancel2")
        .set("prompt", `破浪：${get.translation(trigger.card)}指定${get.translation(trigger.target)}为目标（浪势：${count}）`)
        .set("displayIndex", false)
        .set("choiceList", [
          "选项一：获得1个“浪势”标记（至多3个）",
          "选项二：移除所有“浪势”标记，摸等量的牌，并令此牌造成的伤害增加等量点数",
          "背水：依次执行前两项，然后失去3-X点体力（X为此次移除的标记数）",
        ])
        .set("ai", () => {
          const value = trigger.targets.reduce((sum, target) => sum + get.effect(target, trigger.card, player, player), 0);
          if (value > 0 && count >= 2) return 2;
          if (count < 3) return 0;
          return value > 0 ? 1 : 3;
        })
        .forResult();
      // 引擎 chooseControl 按 controls 顺序返回 index，结算不依赖按钮文案。
      const choice = result.index;
      if (![0, 1, 2].includes(choice)) return;
      player.logSkill("fan_polang", trigger.target);
      const both = choice === 2;
      if (choice === 0 || both) {
        game.trySkillAudio("fan_polang_gain_voice", player, true, true);
        if (player.countMark("fan_polang") < 3) player.addMark("fan_polang", 1);
      }
      let removed = 0;
      if (choice === 1 || both) {
        removed = player.countMark("fan_polang");
        if (removed > 0) {
          player.removeMark("fan_polang", removed);
          if (removed === 3) game.trySkillAudio("fan_polang_release_voice", player, true, true);
          else if (removed === 1 || removed === 2) game.trySkillAudio("fan_polang_heavy_voice", player, true, true);
          await player.draw(removed);
          // 本次整张牌共用基础伤害，逐目标发动时可以累加。
          trigger.getParent("useCard").baseDamage += removed;
        }
      }
      // 背水始终可选，前两项执行后再按实际移除数计算代价。
      if (both && removed < 3) await player.loseHp(3 - removed);
    },
  },
  fan_polang_gain_voice: { audio: "ext:原神/audio/mualani/skill:6", charlotte: true },
  fan_polang_release_voice: { audio: "ext:原神/audio/mualani/skill:3", charlotte: true },
  fan_polang_heavy_voice: { audio: "ext:原神/audio/mualani/skill:3", charlotte: true },
};
