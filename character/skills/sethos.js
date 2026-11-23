import { game, get, _status } from "../../../../noname.js";
const suits = ["spade", "heart", "club", "diamond"];
export function usedSuits(player) {
  return [...new Set(player.getHistory("useCard").map(evt => get.suit(evt.card, player)).filter(suit => suits.includes(suit)))];
}
export function freeCard(card, player) {
  const phase = _status.event?.getParent("phase");
  return _status.currentPhase === player && _status.event?.getParent("phaseUse")?.player === player
    && phase?.fan_yinlu_suits?.includes(get.suit(card, player));
}
export function returnedUse(event) {
  const ordering = event.getParent();
  const use = ordering?.name === "orderingDiscard" && (ordering.relatedEvent || ordering.getParent());
  return use?.name === "useCard" ? use : null;
}
export function returnCards(event, use) {
  return event.cards.filter(card => use.cards.includes(card) && get.position(card, true) === "d");
}
export default {
  fan_yinlu: {
    audio: false, locked: false, direct: true,
    trigger: { global: "phaseAfter" },
    filter(event, player) {
      const x = 4 - usedSuits(event.player).length;
      return event.player.isIn() && player.storage.fan_yinlu_round !== game.roundNumber
        && player.countDiscardableCards(player, "he") >= x;
    },
    async content(event, trigger, player) {
      const target = trigger.player, used = usedSuits(target), x = 4 - used.length;
      if (!target.isIn() || player.storage.fan_yinlu_round === game.roundNumber) return;
      const value = get.attitude(player, target) * (2.5 + Math.min(4, target.countCards("h")) * .5);
      let result;
      if (x) result = await player.chooseToDiscard("he", x, `引路：你可以弃置${x}张牌，令${get.translation(target)}执行额外回合`)
        .set("prompt2", false).set("ai", card => value / x - get.value(card, player)).forResult();
      else result = await player.chooseBool("引路：你可以令" + get.translation(target) + "执行额外回合")
        .set("prompt2", false).set("choice", value > 0).forResult();
      if (!result.bool) return;
      player.storage.fan_yinlu_round = game.roundNumber;
      player.logSkill("fan_yinlu", target);
      if (!target.isIn()) return;
      target.addSkill("fan_yinlu_effect");
      const extra = target.insertPhase("fan_yinlu");
      extra.fan_yinlu_suits = suits.filter(suit => !used.includes(suit));
    },
  },
  fan_yinlu_effect: {
    charlotte: true, locked: false, forced: true, popup: false,
    marktext: "路",
    onremove: true,
    intro: {
      name: "路",
      content(storage) {
        return `使用${storage.map(suit => get.translation(suit)).join("、")}花色的牌无距离和次数限制。`;
      },
    },
    group: ["fan_yinlu_effect_start", "fan_yinlu_effect_clear"],
    subSkill: { start: {
      charlotte: true, forced: true, popup: false,
      trigger: { player: "phaseBefore" },
      filter: event => Array.isArray(event.fan_yinlu_suits),
      async content(event, trigger, player) {
        player.storage.fan_yinlu_effect = trigger.fan_yinlu_suits.slice();
        player.syncStorage("fan_yinlu_effect");
        if (player.storage.fan_yinlu_effect.length) player.markSkill("fan_yinlu_effect");
        else player.unmarkSkill("fan_yinlu_effect");
      },
    }, clear: {
      charlotte: true, forced: true, popup: false,
      trigger: { player: "phaseAfter" },
      filter: event => Array.isArray(event.fan_yinlu_suits),
      async content(event, trigger, player) { player.removeSkill("fan_yinlu_effect"); },
    } },
    trigger: { player: "useCard1" },
    filter(event, player) { return freeCard(event.card, player); },
    async content(event, trigger, player) {
      if (trigger.addCount !== false) {
        trigger.addCount = false;
        const stat = player.getStat("card");
        if (stat[trigger.card.name] > 0) stat[trigger.card.name]--;
      }
    },
    mod: {
      targetInRange(card, player) { if (freeCard(card, player)) return true; },
      cardUsable(card, player) { if (freeCard(card, player)) return Infinity; },
    },
  },
  fan_guixian: {
    audio: false, locked: false, direct: true,
    trigger: { global: "cardsDiscardAfter" },
    filter(event, player) {
      const use = returnedUse(event);
      return use && use.player === player && use.card.name === "sha"
        && !player.hasHistory("sourceDamage", damage => damage.card === use.card)
        && returnCards(event, use).length > 0 && game.hasPlayer(target => target !== player);
    },
    async content(event, trigger, player) {
      const use = returnedUse(trigger);
      const cards = returnCards(trigger, use);
      const result = await player.chooseTarget("归贤：你可以将此牌交给一名其他角色并摸一张牌", (card, player, target) => target !== player)
        .set("prompt2", false).set("ai", target => 2 + get.attitude(player, target) * cards.reduce((sum, card) => sum + Math.max(0, get.value(card, target)), 0) / 5).forResult();
      if (!result.bool) return;
      const target = result.targets[0], remaining = cards.filter(card => get.position(card, true) === "d");
      if (!target.isIn() || !remaining.length) return;
      player.logSkill("fan_guixian", target);
      await target.gain(remaining, "gain2");
      await player.draw();
    },
  },
};
