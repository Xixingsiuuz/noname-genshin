import { game, get, lib, ui, _status } from "../../../../noname.js";

const suits = ["spade", "heart", "club", "diamond"];
const discardPile = () => Array.from(ui.discardPile.childNodes).filter(card => get.position(card, true) === "d");
function available(player, omitted) {
  const held = new Set(player.getCards("h").filter(card => card !== omitted).map(card => get.suit(card, player)));
  const pile = discardPile();
  if (omitted && suits.includes(get.suit(omitted, false))) pile.push(omitted);
  return suits.filter(suit => !held.has(suit)).map(suit => pile.filter(card => get.suit(card, false) === suit)).filter(cards => cards.length);
}
function profit(player, card) {
  return available(player, card).reduce((sum, cards) => sum + cards.reduce((value, item) => value + get.value(item, player), 0) / cards.length, 0) - get.value(card, player);
}
const eligible = (event, player) => event.num > 0 && event.player !== player && event.player.isIn()
  && event.player.hp <= event.player.maxHp / 2 && !player.hasSkill("fan_baie_used");

export default {
  fan_xiansheng: {
    enable: "phaseUse", usable: 1, locked: false,
    audio: ["ext:原神/audio/albedo/skill/fan_xiansheng.mp3", "ext:原神/audio/albedo/skill/fan_xiansheng_burst.mp3"], logAudio: () => false,
    position: "he", selectCard: 1,
    filterCard(card, player) { return lib.filter.cardDiscardable(card, player, "fan_xiansheng"); },
    manualConfirm: true, fanPairedConfirm: true,
    prompt: "弃置一张牌，获得缺少花色的牌", prompt2: false,
    filter(event, player) { return player.countDiscardableCards(player, "he") > 0; },
    check(card) { return profit(_status.event.player, card); },
    async content(event, trigger, player) {
      // 原生主动技能已完成弃置及其连带触发，再固定本次可获得的花色。
      game.trySkillAudio("fan_xiansheng", player, true);
      if (!player.isIn()) return;
      const groups = available(player);
      if (!groups.length) return;
      // 每种缺少的花色随机取一张，不打开选牌窗口；同批获得。
      const selected = groups.map(cards => cards.randomGet());
      const valid = selected.filter(card => card && get.position(card, true) === "d");
      if (valid.length) await player.gain(valid, "gain2");
    },
    ai: {
      order: 2,
      result: { player(player) {
        const cards = player.getCards("he").filter(card => lib.filter.cardDiscardable(card, player, "fan_xiansheng"));
        return cards.length ? Math.max(...cards.map(card => profit(player, card))) : 0;
      } },
    },
  },
  fan_baie: {
    trigger: { global: "damageAfter" }, direct: true, locked: false,
    audio: ["ext:原神/audio/albedo/skill/fan_baie.mp3", "ext:原神/audio/albedo/skill/fan_baie_ascension.mp3"], logAudio: () => false,
    filter: eligible,
    async content(event, trigger, player) {
      if (!eligible(trigger, player)) return;
      const target = trigger.player;
      const result = await player.chooseBool("是否发动【白垩】，对" + get.translation(target) + "造成1点伤害？")
        .set("prompt2", false).set("ai", () => get.damageEffect(target, player, player) > 0).forResult();
      if (!result.bool || !eligible(trigger, player) || !player.isIn()) return;
      // 在嵌套伤害前消耗资格，防止自己的追加伤害再次触发。
      player.addTempSkill("fan_baie_used", { global: "phaseBefore" });
      player.logSkill("fan_baie", target, null, null, []);
      game.trySkillAudio("fan_baie", player, true);
      await target.damage(1, player, "nocard");
    },
  },
  fan_baie_used: { charlotte: true },
};
