import { game, get, lib } from "../../../../noname.js";

const ordering = card => get.position(card, true) === "o";
export function cangfengAttacks() {
  if (!lib.inpile.includes("sha")) return [];
  return [undefined, "fire", "thunder"].filter(nature => !nature || lib.inpile_nature.includes(nature))
    .map(nature => ({name: "sha", isCard: true, ...(nature ? {nature} : {})}));
}
// Evaluate public choices without reading the secret card or the opponent's hidden hand.
export function cangfengTakeScore(cards, target, owner) {
  const friend = get.attitude(target, owner) > 0;
  const ranked = cards.slice().sort((a, b) => get.value(b, target) - get.value(a, target));
  let best = {cards: ranked.slice(0, 1), score: -Infinity};
  const attacks = cangfengAttacks();
  const danger = attacks.length ? Math.max(...attacks.map(card => -get.effect(target, card, owner, target))) : 0;
  for (let count = 1; count <= ranked.length; count++) {
    const chosen = ranked.slice(0, count);
    const value = chosen.reduce((sum, card) => sum + get.value(card, target), 0);
    const remaining = ranked.slice(count).reduce((sum, card) => sum + get.value(card, owner), 0);
    // More cards mean more exposure to the trap, lost gifts and Cold Blade.
    const risk = count / ranked.length;
    const score = value * (1 - risk) + (friend ? .7 : -.7) * remaining - risk * (danger + (friend ? 0 : 4));
    if (score > best.score) best = {cards: chosen, score};
  }
  return best;
}

export default {
  fan_lengren: {
    audio: false, locked: false, direct: true,
    trigger: {source: "damageBegin2"},
    filter(event, player) {
      return event.num > 0 && event.card?.name === "sha" && event.player.isIn()
        && event.player.countDiscardableCards(player, "he") > 0;
    },
    async content(event, trigger, player) {
      const target = trigger.player;
      const answer = await player.chooseBool("冷刃：依次弃置其两张牌？")
        .set("prompt2", false).set("choice", get.effect(target, {name: "guohe"}, player, player) > 0).forResult();
      if (!answer.bool || !player.isIn() || !target.isIn()) return;
      player.logSkill("fan_lengren", target);
      for (let i = 0; i < 2; i++) {
        if (!player.isIn() || !target.isIn() || !target.countDiscardableCards(player, "he")) break;
        await player.discardPlayerCard(target, "he", true).set("prompt", "冷刃：弃置其一张牌").set("prompt2", false);
      }
    },
    ai: { effect: {player(card, player, target) {
      if (card.name === "sha" && target && target.countDiscardableCards(player, "he")) return [1, 0, 1, -Math.min(2, target.countCards("he"))];
    }} },
  },
  fan_cangfeng: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    manualConfirm: true, fanPairedConfirm: true,
    filterTarget: (card, player, target) => target !== player,
    async content(event, trigger, player) {
      const target = event.targets[0];
      if (!player.isIn() || !target.isIn()) return;
      const cards = get.cards(4);
      await game.cardsGotoOrdering(cards);
      try {
        await player.showCards(cards, "藏锋");
        let available = cards.filter(ordering);
        if (!player.isIn() || !target.isIn() || !available.length) return;
        const secretResult = await player.chooseButton(["藏锋：秘密选择一张牌", available], true)
          .set("manualConfirm", true).set("filterButton", button => ordering(button.link))
          .set("ai", button => {
            const value = get.value(button.link, target);
            return (get.attitude(player, target) < 0 ? value : -value) + Math.random() * 4;
          }).forResult();
        const secret = secretResult.links?.[0];
        if (!secretResult.bool || !available.includes(secret) || !ordering(secret)) return;
        // Do not broadcast, log or attach the secret to a public card/dialog/storage.
        available = cards.filter(ordering);
        if (!player.isIn() || !target.isIn() || !available.length) return;
        const plan = cangfengTakeScore(available, target, player).cards;
        const result = await target.chooseButton(["藏锋：选择获得的牌", available], [1, available.length], true)
          .set("manualConfirm", true).set("filterButton", button => ordering(button.link))
          .set("ai", button => plan.includes(button.link) ? 10 + get.value(button.link, target) : -1).forResult();
        const chosen = result.links;
        if (!result.bool || !chosen?.length || new Set(chosen).size !== chosen.length
          || !chosen.every(card => available.includes(card) && ordering(card)) || !target.isIn() || !player.isIn()) return;
        const gain = target.gain(chosen, "gain2");
        await gain;
        // Gain triggers may move cards away. The actual gain snapshot determines the hit.
        const gained = gain.getg(target).filter(card => chosen.includes(card));
        const hit = gained.includes(secret);
        const rest = cards.filter(card => !chosen.includes(card) && ordering(card));
        if (player.isIn() && rest.length) await player.gain(rest, "gain2");
        if (!hit || !target.isIn()) return;
        const discard = gained.filter(card => target.getCards("h").includes(card));
        if (discard.length) await target.discard(discard);
        if (!player.isIn() || !target.isIn()) return;
        const attacks = cangfengAttacks();
        if (!attacks.some(card => player.canUse(card, target, false, false))) return;
        const answer = await player.chooseButton(["藏锋：选择杀的属性", [attacks.map(card => ["基本", "", "sha", card.nature]), "vcard"]], true)
          .set("manualConfirm", true)
          .set("filterButton", button => player.canUse({name: "sha", nature: button.link[3], isCard: true}, target, false, false))
          .set("ai", button => get.effect(target, {name: "sha", nature: button.link[3], isCard: true}, player, player)).forResult();
        const nature = answer.links?.[0]?.[3];
        const attack = attacks.find(card => card.nature === nature);
        if (answer.bool && attack && player.isIn() && target.isIn() && player.canUse(attack, target, false, false)) {
          await player.useCard(attack, target, false);
        }
      } finally {
        const left = cards.filter(ordering);
        if (left.length) await game.cardsDiscard(left);
      }
    },
    ai: {order: 8, result: {player: 1, target(player, target) {
      const attack = cangfengAttacks();
      return attack.length ? Math.min(0, ...attack.map(card => get.effect(target, card, player, target))) * .3 : 0;
    }}},
  },
};
