import { game, get, lib } from "../../../../noname.js";

const tag = "fan_chenxi";
const wines = player => player.getExpansions(tag);
const wineCard = () => ({ name: "jiu", isCard: true });
// 规则指定角色自行使用，不要求其他角色拥有“酒可救他人”的能力。
function canDrink(target) {
  return target.isIn() && target.canUse(wineCard(), target);
}
function drinkValue(owner, target) {
  const attitude = get.attitude(owner, target);
  if (target.isDying()) return attitude * (target.hp <= 0 ? 4 : 2);
  // 出牌阶段尚未正式开始，原生酒 AI 的 isPhaseUsing 判定此时为假。
  // 根据即将能出的杀、敌友目标及酒的已有增伤重新估值。
  const shas = target.getCards("hs", card => get.name(card, target) === "sha");
  if (target.mayHaveSha(target, "use", null, "count") > shas.length) shas.push({ name: "sha", isCard: true });
  let best = 0, benefit = 0;
  for (const sha of shas) {
    if (!lib.filter.cardUsable(sha, target)) continue;
    for (const victim of game.filterPlayer(current => current !== target)) {
      if (!target.canUse(sha, victim)) continue;
      const value = get.effect(victim, sha, target, target);
      if (value > best) {
        best = value;
        benefit = get.effect(victim, sha, target, owner);
      }
    }
  }
  const reserve = game.hasPlayer(current => current !== target && get.attitude(owner, current) > 0 && current.hp <= 1);
  const opportunity = reserve && wines(owner).length === 1 ? 3 : 0.5;
  return 1 + benefit / (target.storage.jiu ? 2 : 1) - opportunity;
}
function storeValue(card, player) {
  const count = wines(player).length;
  if (count >= 3 || get.color(card, player) !== "red") return 0;
  if (get.name(card, player) === "tao" && player.hp <= 2) return 0;
  if (get.name(card, player) === "sha" && player.hasUseTarget(card, null, true)) return 0;
  const need = game.hasPlayer(current => get.attitude(player, current) > 0 && current.hp <= 1);
  return (need ? 7 : count ? 4.5 : 6) - get.value(card, player);
}

export default {
  fan_niyan: {
    locked: false, direct: true,
    audio: "ext:原神/audio/diluc/skill:3",
    trigger: { player: ["useCardAfter", "respondAfter"] },
    filter(event) { return event.card?.name === "sha"; },
    async content(event, trigger, player) {
      const result = await player.chooseBool("你可以发动【逆焰】，观看牌堆顶三张牌")
        .set("prompt2", false).set("choice", true).forResult();
      if (!result.bool || !player.isIn()) return;
      player.logSkill("fan_niyan");
      const cards = get.cards(3);
      await game.cardsGotoOrdering(cards);
      try {
        await player.viewCards("逆焰：牌堆顶三张牌", cards);
        const red = cards.filter(card => get.position(card, true) === "o" && get.color(card, false) === "red");
        if (player.isIn() && red.length) await player.gain(red, "gain2");
      } finally {
        // 原生 insert 逐张插到最前方，须倒序传入以保留原牌序。
        const rest = cards.filter(card => get.position(card, true) === "o");
        if (rest.length) await game.cardsGotoPile(rest.reverse(), "insert");
      }
    },
    ai: { effect: { player(card) { if (card.name === "sha") return [1, 1.5]; } } },
  },
  fan_chenxi: {
    locked: false,
    audio: "ext:原神/audio/diluc/skill:2",
    enable: "phaseUse", usable: 1, manualConfirm: true,
    filter(event, player) {
      return wines(player).length < 3 && player.countCards("he", card => get.color(card, player) === "red") > 0;
    },
    position: "he", discard: false, lose: false, delay: false,
    selectCard() { return [1, Math.max(1, 3 - wines(get.player()).length)]; },
    filterCard(card, player) { return get.color(card, player) === "red" && wines(player).length < 3; },
    check(card) {
      // 留下救命牌及本阶段能打出的杀；低价值红牌、溢出手牌优先酿酒。
      return storeValue(card, get.player());
    },
    async content(event, trigger, player) {
      const cards = event.cards || [];
      if (!cards.length || cards.length + wines(player).length > 3 ||
        cards.some(card => !player.getCards("he").includes(card) || get.color(card, player) !== "red")) return;
      await player.addToExpansion({ cards, source: player, animate: "give", gaintag: [tag] });
    },
    marktext: "酒", intro: { content: "expansion", markcount: "expansion" },
    onremove(player, skill) {
      const cards = player.getExpansions(skill);
      if (cards.length) player.loseToDiscardpile(cards);
    },
    group: "fan_chenxi_drink",
    ai: { order: 2, result: { player(player) {
      return Math.max(0, ...player.getCards("he").map(card => storeValue(card, player))) / 3;
    } } },
    subSkill: {
      drink: {
        locked: false, direct: true,
        trigger: { global: ["phaseUseBegin", "dying"] },
        filter(event, player) {
          return !player.hasSkill("fan_chenxi_used") && wines(player).length > 0 && canDrink(event.player) &&
            (event.name !== "phaseUse" || event.player !== player);
        },
        async content(event, trigger, player) {
          const target = trigger.player;
          const info = lib.skill.fan_chenxi_drink;
          if (!info.filter(trigger, player)) return;
          const cards = wines(player);
          const chosen = await player.chooseButton(["你可以发动【晨曦】，将一个“酒”置入弃牌堆", cards], 1)
            .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
            .set("filterButton", button => wines(player).includes(button.link) && !player.hasSkill("fan_chenxi_used") && canDrink(target))
            .set("ai", button => drinkValue(player, target) > 0 ? 10 - get.value(button.link, player) : 0).forResult();
          if (!chosen.bool || !info.filter(trigger, player) || chosen.links?.length !== 1 || !wines(player).includes(chosen.links[0])) return;
          // 支付前消耗共同次数，防止移动牌触发的嵌套濒死再次发动。
          // 保留到下一回合开始，当前回合 phaseAfter 引起的濒死也不可重用。
          player.addTempSkill("fan_chenxi_used", { global: "phaseBefore" });
          player.logSkill("fan_chenxi", target);
          await player.loseToDiscardpile(chosen.links);
          if (canDrink(target)) await target.useCard(wineCard(), target);
          if (player.isIn()) await player.draw();
        },
      },
      used: { charlotte: true, popup: false },
    },
  },
};
