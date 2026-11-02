import { game, get, lib, ui, _status } from "../../../../noname.js";
import { mechanisms } from "../../card/xianyun.js";

export function mechanismPresent(name) {
  const names = name === "fan_taipingyaoshu" ? [name, "taipingyaoshu"] : [name];
  return game.hasPlayer(current => current.getCards("ej").some(card => names.includes(card.name))
    || current.getVCards("e").some(card => names.includes(card.name)));
}
export function canPlaceMechanism(target, name) {
  return target.isIn() && !target.isMin() && target.hasEmptySlot(get.subtype(name)) && target.canEquip(name, false);
}
export function luanyinValue(player, target) {
  const difference = Math.min(5, player.countCards("h")) - target.countCards("h");
  const discard = Math.min(Math.max(0, target.countCards("h") - player.countCards("h")),
    target.countCards("h", card => lib.filter.cardDiscardable(card, target, "fan_luanyin")));
  let value = get.attitude(player, target) * (Math.max(0, difference) - discard);
  if (difference > 0) {
    if (player.isDamaged()) value += get.recoverEffect(player, player, player);
    if (target.isDamaged()) value += get.recoverEffect(target, player, player);
  }
  return value;
}
function mechanismValue(player, target, name) {
  if (!canPlaceMechanism(target, name) || mechanismPresent(name)) return -Infinity;
  let value = get.effect(target, { name }, player, player);
  if (name === "fan_pengrenshenji" && target.isDamaged()) value += get.recoverEffect(target, player, player);
  if (name === "fan_zhuxing") value += get.attitude(player, target) * Math.min(3, new Set(target.getCards("h").map(card => get.suit(card, target))).size) / 3;
  if (name === "fan_guizhongji") value += Math.max(0, ...game.filterPlayer(current => target.canUse({ name: "sha" }, current, false)).map(current => get.effect(current, { name: "sha" }, target, player)));
  return value;
}

export default {
  fan_luanyin: {
    audio: "ext:原神/audio/xianyun/skill:3", locked: false,
    trigger: { player: "phaseUseBegin" },
    direct: true,
    async content(event, trigger, player) {
      const result = await player.chooseTarget("你可以发动【鸾音】，选择一名其他角色",
        (card, player, target) => target !== player && target.isIn()
      ).set("prompt2", false).set("ai", target => luanyinValue(player, target)).forResult();
      if (!result.bool) return;
      const target = result.targets[0];
      if (!target.isIn() || target === player) return;
      const own = player.countCards("h"), hand = target.countCards("h");
      if (own === hand || (hand < own && hand >= 5)) return;
      player.logSkill("fan_luanyin", target);
      // 在调整开始时固定目标值；后续摸牌触发的技能不重新计算差值。
      const difference = own - hand;
      if (difference < 0) {
        await target.chooseToDiscard("h", -difference, true);
        return;
      }
      if (difference === 0) return;
      const draw = target.draw(Math.max(0, Math.min(5, own) - hand));
      await draw;
      // 无牌可摸或摸牌被取消时，不触发奖励。
      if (!draw.result?.cards?.length) return;
      const recipients = [player, target].sortBySeat(_status.currentPhase || player);
      for (const current of recipients) {
        if (current.isIn()) await current.recover();
      }
    },
  },
  fan_xianzhu: {
    audio: "ext:原神/audio/xianyun/skill:2", locked: false,
    derivation: mechanisms.map(card => card[2]),
    trigger: { player: "phaseZhunbeiBegin" },
    direct: true,
    filter(event, player) {
      return player.countCards("he", card => lib.filter.cardDiscardable(card, player, "fan_xianzhu")) > 0
        && mechanisms.some(([, , name]) => !mechanismPresent(name) && game.hasPlayer(target => canPlaceMechanism(target, name)));
    },
    async content(event, trigger, player) {
      const validCost = card => player.getCards("he").includes(card) && lib.filter.cardDiscardable(card, player, "fan_xianzhu");
      const validMechanism = link => mechanisms.includes(link) && !mechanismPresent(link[2]) && game.hasPlayer(target => canPlaceMechanism(target, link[2]));
      const choice = await player.chooseButton(["仙助：选择弃置牌和仙家机关", [mechanisms, "vcard"]])
        .set("prompt2", false).set("fanPairedConfirm", true).set("selectButton", [0, 1])
        .set("position", "he").set("selectCard", [0, 1]).set("filterCard", validCost)
        .set("filterButton", button => validMechanism(button.link))
        .set("filterOk", () => ui.selected.cards.length === 1 && ui.selected.buttons.length === 1
          && validCost(ui.selected.cards[0]) && validMechanism(ui.selected.buttons[0].link))
        .set("ai", button => Math.max(...game.filterPlayer().map(target => mechanismValue(player, target, button.link[2]))))
        .set("processAI", () => {
          let best = null, score = 0;
          for (const link of mechanisms.filter(validMechanism)) {
            const benefit = Math.max(...game.filterPlayer().map(target => mechanismValue(player, target, link[2])));
            for (const cost of player.getCards("he").filter(validCost)) {
              const value = benefit - Math.max(0, get.value(cost, player));
              if (value > score) { score = value; best = { bool: true, cards: [cost], links: [link] }; }
            }
          }
          return best || { bool: false, cards: [], links: [] };
        }).forResult();
      if (!choice.bool) return;
      const chosen = choice.links?.[0], cost = choice.cards?.[0];
      if (choice.links?.length !== 1 || choice.cards?.length !== 1 || !validCost(cost) || !validMechanism(chosen)) return;
      const [suit, number, name] = chosen;
      const result = await player.chooseTarget(`仙助：选择${get.translation(name)}的目标`,
        (card, owner, target) => validCost(cost) && validMechanism(chosen) && canPlaceMechanism(target, name))
        .set("prompt2", false).set("fanPairedConfirm", true).set("selectTarget", [0, 1])
        .set("filterOk", () => ui.selected.targets.length === 1 && validCost(cost) && validMechanism(chosen) && canPlaceMechanism(ui.selected.targets[0], name))
        .set("ai", target => mechanismValue(player, target, name) - get.value(cost, player) / 2).forResult();
      if (!result.bool || result.targets?.length !== 1) return;
      const target = result.targets[0];
      if (!player.getCards("he").includes(cost) || !lib.filter.cardDiscardable(cost, player, "fan_xianzhu") || mechanismPresent(name) || !canPlaceMechanism(target, name)) return;
      const payment = player.discard(cost); await payment;
      if (!payment.cards?.includes(cost) || player.getCards("he").includes(cost) || mechanismPresent(name) || !canPlaceMechanism(target, name)) return;
      player.logSkill("fan_xianzhu", target);
      const card = game.createCard2(name, suit, number);
      await target.equip(card);
    },
  },
};
