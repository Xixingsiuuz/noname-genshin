import { game, get, ui, _status } from "../../../../noname.js";

// 以本回合实际失牌记录识别归属，不能把他人使用的同名牌算入。
function clubs(player, cards) {
  const lost = player.getHistory("lose").flatMap(evt => evt.cards2 || []);
  return (cards || []).filter(card => lost.includes(card) && get.suit(card) === "club");
}
export default {
  fan_jilv: {
    locked: true, forced: true,
    // loseEnd 已有实际失牌快照，且早于交牌所用的 loseAfter。
    trigger: { player: ["damageEnd", "loseEnd"] },
    filter: (event, player) => player.countMark("fan_jilv") < 3 && (event.name === "damage" ? event.num > 0 : (event.cards2 || []).some(card => get.suit(card, player) === "club")),
    async content(event, trigger, player) {
      const amount = trigger.name === "damage" ? trigger.num : trigger.cards2.filter(card => get.suit(card, player) === "club").length;
      const gain = Math.min(amount, Math.max(0, 3 - player.countMark("fan_jilv")));
      if (gain > 0) player.addMark("fan_jilv", gain);
    },
    marktext: "枫", intro: { name: "枫", content: "mark" },
    group: "fan_jilv_give",
    subSkill: {
      give: {
        locked: true, forced: true, popup: false,
        trigger: { global: ["loseAfter", "cardsDiscardAfter"] },
        filter(event, player) {
          if (event.name === "lose" && event.position !== ui.discardPile) return false;
          const history = game.getGlobalHistory("cardMove");
          return clubs(player, event.cards).length > 0 && !history.slice(0, history.indexOf(event)).some(move =>
            (move.name === "cardsDiscard" || move.name === "lose" && move.position === ui.discardPile) && clubs(player, move.cards).length);
        },
        async content(event, trigger, player) {
          const cards = clubs(player, trigger.cards).filter(card => get.position(card, true) === "d");
          if (!cards.length || !game.hasPlayer(target => target !== player)) return;
          const result = await player.chooseTarget("羁旅：将梅花牌交给一名其他角色", (card, source, target) => target !== source)
            .set("prompt2", false).set("fanPairedConfirm", true).set("ai", target => get.attitude(player, target)).forResult();
          const remaining = cards.filter(card => get.position(card, true) === "d");
          if (result.bool && result.targets[0].isIn() && remaining.length) await result.targets[0].gain(remaining, "gain2");
        },
      },
    },
  },
  fan_zhenxiu: {
    trigger: { player: "phaseJieshuBegin" }, forced: true, locked: false,
    juexingji: true, skillAnimation: true, derivation: ["fan_huanlei"],
    filter: (event, player) => !player.storage.fan_zhenxiu && player.countMark("fan_jilv") === 3,
    async content(event, trigger, player) {
      player.storage.fan_zhenxiu = true;
      player.awakenSkill("fan_zhenxiu");
      await player.recover();
      await player.draw(2);
      await player.addSkill("fan_huanlei");
    },
  },
  fan_huanlei: {
    trigger: { global: "damageBegin4" }, locked: false,
    filter: (event, player) => event.num > 0 && player.countMark("fan_jilv") > 0 && !player.getHistory("useSkill", evt => evt.skill === "fan_huanlei").length,
    prompt: "是否发动【焕雷】移除所有“枫”并防止此伤害？", prompt2: false,
    check(event, player) {
      const self = event.player === player;
      if (!self && get.attitude(player, event.player) <= 0) return false;
      // 原伤害已经致命时允许自救；这不改变出闪阶段的低血量避险。
      const armor = event.nohujia || player.hasSkillTag("nohujia") ? 0 : (player.hujia || 0);
      if (self && event.num >= player.hp + armor) return true;
      const safe = player.hp + (player.hujia || 0) > 1;
      if (!safe) return self && event.num > 1;
      if (player.countMark("fan_jilv") >= 3) return true;
      if (self) return true;
      return event.num >= 2 || event.player.hp <= event.num || player.hp >= 3;
    },
    ai: {
      noShan: true,
      skillTagFilter(player, tag) {
        if (tag !== "noShan") return false;
        if (player.countMark("fan_jilv") < 3 || player.hp < 2 || player.isLinked()
          || player.getHistory("useSkill", evt => evt.skill === "fan_huanlei").length) return false;
        // 原生杀、万箭齐发在出闪决策时查询 noShan；仅针对可替代的伤害。
        let current = _status.event;
        while (current && current.name !== "sha" && current.name !== "wanjian") {
          const parent = current.getParent?.();
          if (!parent || parent === current) return false;
          current = parent;
        }
        if (!current || current.target !== player || current.baseDamage <= 0
          || game.hasNature(current.card, "ice") || player.hasSkill("gangzhi")
          || current.player?.hasSkillTag("jueqing", false, player)) return false;
        // 雷伤估值为明显危险时继续正常防御（含已知的伤害增益）。
        if (get.damageEffect(player, null, player, "thunder") < -player.hp) return false;
      },
    },
    async content(event, trigger, player) {
      // X 固定为本次实际移除数量，后续雷伤产生的新标记不计入。
      const count = player.countMark("fan_jilv");
      if (count <= 0) return;
      player.removeMark("fan_jilv", count);
      trigger.cancel();
      const target = trigger.player;
      await player.damage(1, "thunder", "nosource");
      if (target.isIn()) await target.draw(count);
      if (target.isIn()) target.addTempSkill("fan_huanlei_guard", "phaseAfter");
    },
  },
  fan_huanlei_guard: {
    charlotte: true, mark: true, marktext: "护",
    intro: { content: "不能成为其他角色使用牌的目标，直到当前回合结束" },
    mod: { targetEnabled(card, player, target) { if (player !== target) return false; } },
  },
};
