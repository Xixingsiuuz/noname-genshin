import { game, get, ui, _status } from "../../../../noname.js";

const tag = "fan_zhenxiang_cards";
export function remaining(record) {
  return record.target.getExpansions(tag).filter(card => record.cards.includes(card));
}
export function eligible(event, player) {
  return event.card?.name === "sha" && player.storage.fan_baoshe_round !== game.roundNumber
    && game.players.filter(p => p.isIn()).every(p => p.countCards("h") >= player.countCards("h"));
}
// Synchronous AI-only projection: native distance ignores selected equipment;
// native armor AI respects unequip2. Always restore both before returning.
export function projectedUses(player, target, covered = []) {
  const selected = ui.selected.cards;
  const ownTag = Object.getOwnPropertyDescriptor(target, "hasSkillTag");
  const hasTag = target.hasSkillTag;
  const armorCovered = covered.some(card => target.getCards("e").includes(card) && get.subtype(card) === "equip2");
  try {
    ui.selected.cards = [...(selected || []), ...covered];
    if (armorCovered) target.hasSkillTag = function (name, ...args) {
      return name === "unequip2" || hasTag.call(this, name, ...args);
    };
    return player.getCards("h").filter(card => !covered.includes(card)
      && player.canUse(card, target, undefined, true)
      && get.effect(target, card, player, player) > 0).length;
  } finally {
    ui.selected.cards = selected;
    if (armorCovered) {
      if (ownTag) Object.defineProperty(target, "hasSkillTag", ownTag);
      else delete target.hasSkillTag;
    }
  }
}
export function coverScore(player, target, card, selected = []) {
  const before = projectedUses(player, target, selected);
  const after = projectedUses(player, target, [...selected, card]);
  // More covered cards than likely uses risk the full original-X penalty.
  if (after < selected.length + 1) return -1;
  const value = get.value(card, target);
  const attitude = get.attitude(player, target);
  return (after - before) * 8 + (attitude < 0 ? value : 6 - value);
}
async function finish(player) {
  const record = player.storage.fan_zhenxiang;
  if (!record) return;
  delete player.storage.fan_zhenxiang;
  const cards = remaining(record);
  if (!cards.length) return;
  if (record.target.isIn()) {
    await record.target.gain(cards, "gain2");
    if (player.isIn()) await player.chooseToDiscard("he", record.x, true, `真相：弃置${record.x}张牌`).set("prompt2", false);
  } else await record.target.loseToDiscardpile(cards);
}
export default {
  fan_zhenxiang: {
    audio: false, locked: false, direct: true,
    trigger: { player: "phaseUseBegin" },
    group: ["fan_zhenxiang_expose", "fan_zhenxiang_end"],
    filter: () => game.players.some(p => p.isIn() && p.countCards("he")),
    async content(event, trigger, player) {
      const result = await player.chooseTarget("真相：你可以选择一名角色", (card, owner, target) => target.countCards("he") > 0)
        .set("prompt2", false).set("ai", target => {
          const uses = Math.max(projectedUses(player, target), ...target.getCards("he").map(card => projectedUses(player, target, [card])));
          return uses ? uses - get.attitude(player, target) / 3 : 0;
        }).forResult();
      const target = result.targets?.[0];
      if (!result.bool || !target?.isIn()) return;
      const choice = await player.choosePlayerCard(target, "he", [1, target.countCards("he")], "真相：选择要置于武将牌上的牌")
        .set("prompt2", false).set("ai", button => {
          return coverScore(player, target, button.link, ui.selected.buttons.map(item => item.link));
        }).forResult();
      if (!choice.bool || !target.isIn()) return;
      const cards = choice.cards || choice.links || [];
      if (!cards.length || cards.some(card => !target.getCards("he").includes(card))) return;
      player.logSkill("fan_zhenxiang", target);
      const record = {target, cards: cards.slice(), x: cards.length, phase: trigger};
      player.storage.fan_zhenxiang = record;
      const next = target.addToExpansion(cards, target, "giveAuto");
      next.gaintag.add(tag);
      await next;
    },
    subSkill: {
      expose: {
        audio: false, locked: false, forced: true, popup: false,
        trigger: {player: "useCardToPlayer"},
        filter(event, player) {
          const r = player.storage.fan_zhenxiang;
          return !!r && event.target === r.target && event.getParent("phaseUse") === r.phase && remaining(r).length > 0;
        },
        async content(event, trigger, player) {
          const r = player.storage.fan_zhenxiang;
          if (!r || !r.target.isIn()) return;
          const cards = remaining(r);
          if (!cards.length) return;
          let card = cards[0];
          if (cards.length > 1) {
            const result = await player.chooseButton(["真相：将一张牌置入弃牌堆", cards], true)
              .set("ai", button => -get.value(button.link, r.target) * get.attitude(player, r.target)).forResult();
            card = result.links?.[0];
          }
          if (!card || !remaining(r).includes(card)) return;
          await r.target.loseToDiscardpile(card);
          if (player.isIn()) await player.draw();
        },
      },
      end: {
        audio: false, locked: false, forced: true, popup: false,
        trigger: {player: ["phaseUseEnd", "phaseAfter"]},
        filter: (event, player) => !!player.storage.fan_zhenxiang,
        async content(event, trigger, player) { await finish(player); },
      },
    },
    ai: {threaten: 1.5},
  },
  fan_zhenxiang_cards: { charlotte: true, marktext: "相", intro: {content: "expansion", markcount: "expansion"} },
  fan_baoshe: {
    audio: false, locked: true, forced: true,
    trigger: {target: "useCardToTarget"},
    filter: eligible,
    async content(event, trigger, player) {
      if (!eligible(trigger, player)) return;
      player.storage.fan_baoshe_round = game.roundNumber;
      const others = game.players.filter(p => p !== player && p.isIn() && p.countCards("he")).sortBySeat(_status.currentPhase || player);
      if (!others.length) return;
      // Collect every decision before moving any cards. Offline engine queues choices;
      // online engine collects concurrently. Neither exposes an earlier contribution.
      const result = await player.chooseCardOL(others, "he", [1, 1], "报社：你可以交给夏洛蒂一张牌")
        .set("prompt2", false).set("fan_baoshe_receiver", player).set("ai", card => {
          const owner = get.owner(card);
          const receiver = _status.event.fan_baoshe_receiver;
          return get.attitude(owner, receiver) > 0 ? 6 - get.value(card, owner) : -1;
        }).forResult();
      for (let i = 0; i < others.length; i++) {
        const donor = others[i], card = result[i]?.cards?.[0];
        if (!player.isIn()) break;
        if (result[i]?.bool && donor.isIn() && card && donor.getCards("he").includes(card)) await donor.give(card, player);
      }
    },
    ai: { effect: {target(card, source, target) {
      if (eligible({card}, target) && game.players.some(p => p !== target && p.countCards("he") && get.attitude(p, target) > 0)) return [1, .5];
    }} },
  },
};
