import { get } from "../../../../noname.js";

const care = "fan_jingyang_hehu";

export default {
  fan_jingyang: {
    enable: "phaseUse",
    usable: 1,
    position: "h",
    filterCard: true,
    selectCard: 1,
    filterTarget(card, player, target) {
      return !target.hasMark(care);
    },
    async content(event, trigger, player) {
      event.target.addSkill(care);
      event.target.addMark(care, 1);
    },
    ai: {
      order: 6,
      check(card) { return 7 - get.value(card); },
      result: {
        target(player, target) { return target.isDamaged() ? 2 : 1; },
      },
    },
  },
  // 标记效果归持有者所有，不依赖施加标记的希格雯仍在场或仍有静养。
  fan_jingyang_hehu: {
    charlotte: true,
    marktext: "护",
    intro: { content: "准备阶段回复1点体力；此标记不可叠加。" },
    onremove: true,
    trigger: { player: "phaseZhunbeiBegin" },
    forced: true,
    filter(event, player) { return player.hasMark(care) && player.isDamaged(); },
    async content(event, trigger, player) {
      await player.recover();
    },
  },
  fan_jiyu: {
    trigger: { global: "damageEnd" },
    direct: true,
    filter(event, player) {
      // 与遗计同为伤后时机：若伤害引发濒死，先完成濒死结算。
      return event.num > 0 && !event.unreal
        && event.player.isIn() && event.player.hasMark(care);
    },
    async content(event, trigger, player) {
      const target = trigger.player;
      const num = trigger.num;
      const result = await player.chooseTarget(get.prompt("fan_jiyu", target),
        `移除一名角色的“呵护”，令${get.translation(target)}回复或失去${num}点体力`,
        (card, player, current) => current.hasMark(care)
      ).set("ai", current => {
        const attitude = get.attitude(player, target);
        const effect = attitude > 0 ? get.recoverEffect(target, player, player)
          : get.effect(target, { name: "losehp" }, player, player);
        return effect > 0 ? effect - Math.max(0, get.attitude(player, current)) / 10 : 0;
      }).forResult();
      if (!result.bool || !target.isIn() || !target.hasMark(care)) return;
      const holder = result.targets[0];
      if (!holder.hasMark(care)) return;
      const choice = await player.chooseControl("回复体力", "失去体力")
        .set("prompt", `激愈：令${get.translation(target)}回复或失去${num}点体力`)
        .set("ai", () => get.attitude(player, target) > 0 ? 0 : 1).forResult();
      player.logSkill("fan_jiyu", [holder, target]);
      holder.removeMark(care, holder.countMark(care));
      holder.removeSkill(care);
      if (choice.index === 0) await target.recover(num);
      else await target.loseHp(num);
    },
  },
};
