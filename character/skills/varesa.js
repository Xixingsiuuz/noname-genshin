import { game, get, ui } from "../../../../noname.js";

// 统计曾进入弃牌堆的实体牌，不要求其在发动时仍留在弃牌堆。
export function getShanlieCounts() {
  const suits = new Set();
  game.getGlobalHistory("cardMove", evt => {
    if (evt.name === "cardsDiscard" || (evt.name === "lose" && evt.position === ui.discardPile)) {
      for (const card of evt.cards || []) suits.add(get.suit(card, false));
    }
  });
  return {
    damage: ["spade", "club"].filter(suit => suits.has(suit)).length,
    recover: ["heart", "diamond"].filter(suit => suits.has(suit)).length,
  };
}

export default {
  fan_shanlie: {
    trigger: { player: "phaseJieshuBegin" },
    direct: true,
    filter() {
      const counts = getShanlieCounts();
      return counts.damage > 0 || counts.recover > 0;
    },
    async content(event, trigger, player) {
      // 发动时取快照，雷伤引发的新弃牌不改变本次回血人数。
      const { damage, recover } = getShanlieCounts();
      const choices = ["造成伤害", "回复体力", "背水", "取消"];
      const result = await player.chooseControl(...choices)
        .set("prompt", "你可以发动【闪烈】，选择一项")
        .set("prompt2", `黑色花色：${damage}；红色花色：${recover}`)
        .set("ai", () => {
          const owner = get.player();
          if (damage && game.hasPlayer(target => get.damageEffect(target, owner, owner, "thunder") > 0)) return "造成伤害";
          if (recover && game.hasPlayer(target => target.isDamaged() && get.recoverEffect(target, owner, owner) > 0)) return "回复体力";
          return "取消";
        }).forResult();
      if (result.control === "取消") return;
      const both = result.control === "背水";
      player.logSkill("fan_shanlie");
      // 先登记代价，避免自伤等嵌套结算中断技能后漏记。
      if (both) player.skip("phaseUse");
      const pending = [];
      // 先选完两组目标，再结算；两组允许选择同一角色。
      for (const mode of ["造成伤害", "回复体力"]) {
        if (!both && result.control !== mode) continue;
        const count = mode === "造成伤害" ? damage : recover;
        if (!count || !player.isIn()) continue;
        const selection = await player.chooseTarget(
          `闪烈：选择至多${count}名角色${mode === "造成伤害" ? "，各造成1点雷电伤害" : "，各回复1点体力"}`,
          [1, Math.min(count, game.countPlayer())], () => true)
          .set("prompt2", false)
          .set("ai", target => mode === "造成伤害"
            ? get.damageEffect(target, player, player, "thunder")
            : get.recoverEffect(target, player, player)).forResult();
        if (!selection.bool) continue;
        pending.push({ mode, targets: selection.targets.slice().sortBySeat() });
      }
      // 伤害及其濒死救援完整结算后再回复，离场目标不再结算。
      for (const { mode, targets } of pending) {
        player.line(targets, mode === "造成伤害" ? "thunder" : "green");
        for (const target of targets) {
          if (!target.isIn()) continue;
          if (mode === "造成伤害") await target.damage(1, "thunder", player);
          else await target.recover();
        }
      }
    },
  },
  fan_haoyan: {
    trigger: { player: "phaseDrawBegin2" },
    forced: true,
    filter: (event, player) => !event.numFixed && player.hp > 0,
    async content(event, trigger, player) {
      trigger.num += Math.max(0, player.hp);
    },
  },
};
