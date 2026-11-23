import { game, get } from "../../../../noname.js";

export function trainingColors(player, phase) {
  const colors = new Set();
  game.getGlobalHistory("cardMove", move => {
    if (move.name !== "cardsDiscard") return;
    const ordering = move.getParent();
    if (ordering?.name !== "orderingDiscard") return;
    const use = ordering.relatedEvent || ordering.getParent();
    if (use?.name !== "useCard" || use.player !== player || use.getParent("phaseUse") !== phase) return;
    for (const card of move.cards || []) {
      if (use.cards?.includes(card)) colors.add(get.color(card, false));
    }
  });
  return colors;
}

export default {
  fan_jiaolian: {
    audio: false, locked: false, forced: true,
    trigger: { player: "phaseUseEnd" },
    filter(event, player) {
      const colors = trainingColors(player, event);
      return colors.has("red") || colors.has("black");
    },
    async content(event, trigger, player) {
      const colors = trainingColors(player, trigger);
      if (colors.has("red")) await player.recover();
      if (colors.has("black") && player.isIn()) await player.draw(2);
      if (!colors.has("red") || !colors.has("black") || !player.isIn()) return;
      const result = await player.chooseTarget("教练：你可以令一名其他角色获得此技能", (card, owner, target) => target !== owner)
        .set("prompt2", false).set("ai", target => {
          if (target.hasSkill("fan_jiaolian")) return 0;
          return get.attitude(player, target) * (1 + Math.min(target.countCards("h"), 5));
        }).forResult();
      const target = result.targets?.[0];
      if (!result.bool || !target?.isIn()) return;
      player.line(target, "green");
      await target.addTempSkills("fan_jiaolian", { player: "phaseAfter" });
    },
    ai: {
      threaten: 1.4,
      effect: { player(card, player) {
        if (get.type(card) === "equip") return;
        if (get.color(card) === "black") return [1, .25];
        if (get.color(card) === "red" && player.isDamaged()) return [1, .35];
      } },
    },
  },
  fan_liliang: {
    audio: false, locked: false, forced: true,
    trigger: { player: "damageEnd" },
    filter(event, player) { return player.storage.fan_liliang_round !== game.roundNumber; },
    async content(event, trigger, player) {
      if (player.storage.fan_liliang_round === game.roundNumber) return;
      player.storage.fan_liliang_round = game.roundNumber;
      player.addSkill("fan_liliang_limit");
      player.addMark("fan_liliang_limit", 1, false);
      await player.draw();
    },
    ai: { maixie: true, effect: { target(card, source, target) {
      if (get.tag(card, "damage") && target.hp > 1 && target.storage.fan_liliang_round !== game.roundNumber) return [1, .5];
    } } },
  },
  fan_liliang_limit: {
    audio: false, charlotte: true, mark: true, marktext: "力",
    intro: { content: "手牌上限+#" },
    mod: { maxHandcard(player, num) { return num + player.countMark("fan_liliang_limit"); } },
  },
};

