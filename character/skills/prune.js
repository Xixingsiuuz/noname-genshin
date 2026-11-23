import { game, get, _status } from "../../../../noname.js";

export const damagedBy = use => game.players.concat(game.dead).some(target =>
  target.getAllHistory("damage", evt => evt.num > 0 && evt.getParent("useCard") === use).length);
export default {
  fan_liemo: {
    audio: false, locked: false, enable: "phaseUse", selectTarget: 1,
    filterTarget(card, player, target) {
      return !player.getHistory("useSkill", evt => evt.skill === "fan_liemo" && evt.targets?.includes(target)).length
        && player.canUse({ name: "huogong", isCard: true }, target);
    },
    async content(event, trigger, player) {
      const target = event.target;
      if (!target.isIn() || !player.canUse({ name: "huogong", isCard: true }, target)) return;
      const use = player.useCard({ name: "huogong", isCard: true }, target);
      use.fan_liemo = true;
      await use;
      if (damagedBy(use) || !player.isIn() || !target.isIn()) return;
      const cards = (use.fan_liemo_shown || []).filter(card => target.getCards("h").includes(card));
      if (!cards.length) return;
      const result = await target.chooseBool("猎魔：是否将火攻展示的牌交给" + get.translation(player) + "？")
        .set("prompt2", false).set("ai", () => get.attitude(target, player) > 0).forResult();
      if (result.bool && player.isIn() && target.isIn()) {
        const available = cards.filter(card => target.getCards("h").includes(card));
        if (available.length) await target.give(available, player);
      }
    },
    group: "fan_liemo_record",
    subSkill: {
      record: {
        trigger: { global: "showCardsAfter" }, forced: true, popup: false, locked: false,
        filter(event, player) {
          const parent = event.getParent(), use = event.getParent("useCard");
          return parent.name === "huogong" && use?.fan_liemo && use.player === player;
        },
        content(event, trigger) {
          trigger.getParent("useCard").fan_liemo_shown = trigger.cards.slice();
        },
      },
    },
    ai: { order: 8, result: { target(player, target) {
      return get.effect(target, { name: "huogong" }, player, target) / 5;
    } } },
  },
  fan_rumo: {
    audio: false, locked: false, direct: true, trigger: { player: "phaseJieshuBegin" },
    async content(event, trigger, player) {
      const victims = [...new Set(player.getHistory("sourceDamage", evt => evt.num > 0 && evt.player !== player).map(evt => evt.player))];
      if (victims.length) {
        if (!(await player.chooseBool("入魔：是否弃置受伤角色各一张牌？").set("prompt2", false)
          .set("ai", () => victims.reduce((sum, target) => sum + (target.isIn() && target.countDiscardableCards(player, "he") ? get.effect(target, { name: "guohe" }, player, player) : 0), 0) > 0).forResult()).bool) return;
        player.logSkill("fan_rumo");
        victims.sortBySeat(_status.currentPhase || player);
        for (const target of victims) {
          if (player.isIn() && target.isIn() && target.countDiscardableCards(player, "he")) await player.discardPlayerCard(target, "he", true);
        }
      } else {
        const result = await player.chooseTarget([0, Infinity], "入魔：选择本回合失去过牌的角色", (card, actor, target) =>
          target.getHistory("lose", evt => evt.cards?.length).length > 0)
          .set("prompt2", false).set("ai", target => get.attitude(player, target)).forResult();
        if (!result.bool) return;
        player.logSkill("fan_rumo", result.targets);
        const targets = [...new Set([player, ...(result.targets || [])])].sortBySeat(_status.currentPhase || player);
        for (const target of targets) if (target.isIn()) await target.draw();
      }
    },
  },
};
