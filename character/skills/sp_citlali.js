import { lib, game, get, ui, _status } from "../../../../noname.js";

const tag = "fan_sp_yingxin_hand";
const evaluatingSharedHand = new WeakSet();
const voiceCounts = { fan_sp_yingxin_start: 1, fan_sp_yingxin_draw: 2, fan_sp_zhuyao_lose: 2, fan_sp_zhuyao_draw: 2, fan_sp_zhuyao_chengshi: 1, fan_sp_citlali_lianying: 2, fan_sp_miyan_use: 2, fan_sp_miyan_turn: 2 };
const voices = {};
for (const [name, count] of Object.entries(voiceCounts)) {
  if (count === 1) voices[name] = { audio: `ext:原神/audio/citlali/skill/${name.replace("fan_sp_", "fan_")}.mp3` };
  else for (let i = 1; i <= count; i++) voices[name + i] = { audio: `ext:原神/audio/citlali/skill/${name.replace("fan_sp_", "fan_")}${i}.mp3` };
}
function speak(name, player) { game.trySkillAudio(voiceCounts[name] === 1 ? name : name + [1, 2].randomGet(), player); }
function partners(player) {
  return game.filterPlayer(source => source.hasSkill("fan_sp_yingxin") && source.storage.fan_sp_yingxin_target === player)
    .concat(player.hasSkill("fan_sp_yingxin") && player.storage.fan_sp_yingxin_target?.isIn() ? [player.storage.fan_sp_yingxin_target] : [])
    .filter((target, i, list) => target !== player && list.indexOf(target) === i);
}
function syncHand(player) {
  const real = partners(player).flatMap(target => target.getCards("h"));
  const fake = player.getCards("s", card => card.hasGaintag(tag));
  game.deleteFakeCards(fake.filter(card => !real.some(c => c.cardid === card._cardid)));
  const added = real.filter(card => !fake.some(c => c._cardid === card.cardid));
  if (added.length) player.directgains(game.createFakeCards(added), null, tag);
}
function lossSnapshot(event) { return event.fan_sp_yingxin_loss; }
function isLastLoss(event) { return !!lossSnapshot(event)?.last; }
function emptyHandBenefit(owner, observer, materials) {
  const hand = owner.getCards("h");
  if (!hand.length || !hand.every(c => materials.includes(c))) return 0;
  const side = Math.sign(get.attitude(observer, owner));
  let value = owner.hasSkill("fan_sp_yingxin") || partners(owner).length ? side : 0;
  if (!owner.hasSkill("fan_sp_zhuyao") || owner.hasSkill("fan_sp_zhuyao_used")) return value;
  const red = hand.some(c => get.color(c, owner) === "red"), black = hand.some(c => get.color(c, owner) === "black");
  if (red) {
    value += side;
    const target = owner.storage.fan_sp_yingxin_target;
    if (target?.isIn()) value += Math.sign(get.attitude(observer, target));
  }
  if (black) {
    // The skill owner chooses for their side, even when someone else borrowed the cards.
    const targets = game.filterPlayer().sort((a, b) => get.effect(b, { name: "losehp" }, owner, owner) - get.effect(a, { name: "losehp" }, owner, owner));
    if (targets.length) value += get.effect(targets[0], { name: "losehp" }, owner, observer) / 8;
  }
  value += side * (_status.currentPhase !== owner ? 1.5 : .5);
  return value;
}
// Match local mobile relianji: imposed use ignores range and normal quota;
// global attacks retain their native complete target set.
export function damageChoices(player, source) {
  if (!source?.isIn()) return [];
  return lib.inpile.flatMap(name => name === "sha"
    ? [{ name, isCard: true }, { name, nature: "fire", isCard: true }, { name, nature: "thunder", isCard: true }]
    : get.type(name) === "trick" && get.tag({ name }, "damage") ? [{ name, isCard: true }] : [])
    .filter(card => player.canUse(card, source, false));
}
function canMiyan(player, source) {
  const hand = player.getCards("h");
  return player.isIn() && !player.isTurnedOver() && !player.hasSkill("fan_sp_miyan_used")
    && hand.length > 0 && hand.every(c => lib.filter.cardDiscardable(c, player, "fan_sp_miyan"))
    && damageChoices(player, source).length > 0;
}
export function miyanEstimate(player, source) {
  const cards = damageChoices(player, source);
  if (!cards.length) return -Infinity;
  const benefit = cards.reduce((sum, card) => sum + (["nanman", "wanjian"].includes(card.name)
    ? game.filterPlayer(t => player.canUse(card, t, false)) : [source])
    .reduce((value, t) => value + get.effect(t, card, player, player), 0), 0) / cards.length;
  return benefit / 5 + emptyHandBenefit(player, player, player.getCards("h")) + 1
    - player.getCards("h").reduce((sum, c) => sum + Math.max(0, get.value(c, player)), 0) / 5
    - (_status.currentPhase === player ? 1.8 : 2.5);
}

export default {
  ...voices,
  fan_sp_yingxin: {
    audio: false, forced: true, locked: true,
    trigger: { global: "phaseBefore", player: "enterGame" },
    filter(event, player) { return !player.storage.fan_sp_yingxin_target && (event.name !== "phase" || game.phaseNumber === 0) && game.hasPlayer(t => t !== player); },
    async content(event, trigger, player) {
      const result = await player.chooseTarget(true, "映心：选择一名其他角色", (card, owner, target) => target !== owner)
        .set("prompt2", false).set("ai", target => {
          const att = get.attitude(player, target);
          return att > 0 ? att * (2 + Math.min(5, target.countCards("h")) / 5) : att;
        }).forResult();
      const target = result.targets?.[0];
      if (!target?.isIn() || !player.isIn()) return;
      player.storage.fan_sp_yingxin_target = target;
      // Serialize the chosen character and resolved caption into the replay;
      // ordinary markSkill only records the skill ID, not this target storage.
      player.markSkillCharacter("fan_sp_yingxin", target, "映心", "映心角色：" + get.translation(target));
      target.addAdditionalSkill("fan_sp_yingxin_" + player.playerid, "fan_sp_yingxin_share");
      syncHand(player); syncHand(target);
      speak("fan_sp_yingxin_start", player);
    },
    intro: { content(storage, player) { return player.storage.fan_sp_yingxin_target ? "映心角色：" + get.translation(player.storage.fan_sp_yingxin_target) : "尚未选择角色"; } },
    onremove(player) {
      const target = player.storage.fan_sp_yingxin_target;
      delete player.storage.fan_sp_yingxin_target;
      if (target) { target.removeAdditionalSkill("fan_sp_yingxin_" + player.playerid); syncHand(target); }
      syncHand(player);
    },
    group: ["fan_sp_yingxin_share", "fan_sp_yingxin_record", "fan_sp_yingxin_draw"],
    ai: { threaten: 1.6 },
  },
  fan_sp_yingxin_record: {
    audio: false, silent: true, forced: true, locked: true, firstDo: true, priority: 100,
    trigger: { global: ["loseBefore", "loseEnd"] },
    filter(event, player) { return event.player === player || (player.hasSkill("fan_sp_yingxin") && event.player === player.storage.fan_sp_yingxin_target); },
    async content(event, trigger) {
      if (event.triggername === "loseBefore") {
        // Save identity and color before hand/zone tags are cleared or later draws occur.
        (trigger.fan_sp_yingxin_before || (trigger.fan_sp_yingxin_before = trigger.player.getCards("h").map(card => ({ card, color: get.color(card, trigger.player) }))));
      } else if (!trigger.fan_sp_yingxin_loss) {
        const before = trigger.fan_sp_yingxin_before || [];
        const hs = trigger.hs || [];
        trigger.fan_sp_yingxin_loss = {
          last: before.length > 0 && before.every(entry => hs.includes(entry.card)),
          colors: before.filter(entry => hs.includes(entry.card)).map(entry => entry.color),
        };
      }
    },
  },
  fan_sp_yingxin_draw: {
    audio: false, forced: true, locked: true, popup: false,
    trigger: { global: "loseEnd" },
    filter(event, player) { return isLastLoss(event) && (event.player === player || event.player === player.storage.fan_sp_yingxin_target); },
    async content(event, trigger, player) {
      if (!trigger.player.isIn()) return;
      player.logSkill("fan_sp_yingxin", trigger.player, null, null, []);
      speak("fan_sp_yingxin_draw", player);
      await trigger.player.draw();
    },
  },
  fan_sp_yingxin_share: {
    audio: false, forced: true, locked: true, popup: false, firstDo: true, priority: 90,
    init: syncHand,
    onremove(player) { game.deleteFakeCards(player.getCards("s", card => card.hasGaintag(tag))); },
    trigger: {
      player: ["useCardBefore", "respondBefore"],
      global: ["loseEnd", "gainEnd", "loseAsyncEnd", "equipEnd", "addJudgeEnd", "addToExpansionEnd", "dieAfter", "reviveAfter"],
    },
    filter(event, player) {
      if (["useCard", "respond"].includes(event.name)) return event.cards?.some(c => c.isFake && c.hasGaintag(tag));
      return true;
    },
    async content(event, trigger, player) {
      if (!["useCard", "respond"].includes(trigger.name)) { syncHand(player); return; }
      const pool = partners(player).flatMap(target => target.getCards("h"));
      const mapped = trigger.cards.map(card => card.isFake && card.hasGaintag(tag) ? pool.find(real => real.cardid === card._cardid) : card);
      // No replacement with another card if a selected original has left the hand.
      if (mapped.some(card => !card)) { trigger.cancel(); return; }
      const old = trigger.cards.slice();
      trigger.cards = mapped;
      if (trigger.card.cards) trigger.card.cards = trigger.card.cards.map(card => old.includes(card) ? mapped[old.indexOf(card)] : card);
    },
    ai: {
      viewHandcard: true,
      skillTagFilter(player, tag, target) { return partners(player).includes(target); },
      effect: { player(card, player) {
        if (evaluatingSharedHand.has(player)) return;
        evaluatingSharedHand.add(player);
        try {
        const raw = card.cards?.length ? card.cards : [card];
        const owners = [player, ...partners(player)];
        const pool = owners.flatMap(owner => owner.getCards("h"));
        const materials = raw.map(c => c.isFake ? pool.find(real => real.cardid === c._cardid) : c).filter(Boolean);
        const benefit = owners.reduce((sum, owner) => sum + emptyHandBenefit(owner, player, materials), 0);
        if (benefit) return [1, benefit];
        } finally { evaluatingSharedHand.delete(player); }
      } },
    },
  },
  fan_sp_zhuyao: {
    audio: false, forced: true, locked: true,
    trigger: { player: "loseAfter" },
    group: "fan_sp_yingxin_record",
    derivation: ["fan_sp_citlali_lianying"],
    filter(event, player) { return isLastLoss(event) && !player.hasSkill("fan_sp_zhuyao_used"); },
    async content(event, trigger, player) {
      if (player.hasSkill("fan_sp_zhuyao_used")) return;
      player.addTempSkill("fan_sp_zhuyao_used", "phaseAfter");
      const colors = lossSnapshot(trigger).colors;
      const black = colors.includes("black"), red = colors.includes("red");
      if (black && player.isIn() && game.hasPlayer(t => t.isIn())) {
        const result = await player.chooseTarget(true, "诸曜：令一名角色失去1点体力")
          .set("prompt2", false).set("ai", target => get.effect(target, { name: "losehp" }, player, player)).forResult();
        const target = result.targets?.[0];
        if (target?.isIn()) { speak("fan_sp_zhuyao_lose", player); player.line(target, "green"); await target.loseHp(); }
      }
      if (red && player.isIn()) {
        const targets = [player, player.storage.fan_sp_yingxin_target].filter(t => t?.isIn()).sortBySeat(_status.currentPhase || player);
        speak("fan_sp_zhuyao_draw", player);
        for (const target of targets) if (target.isIn()) await target.draw();
      }
      if (player.isIn()) {
        speak("fan_sp_zhuyao_chengshi", player);
        player.addTempSkill("fan_sp_zhuyao_chengshi_effect", { player: "phaseBegin" });
        player.addAdditionalSkill("fan_sp_zhuyao_chengshi_effect", "fan_sp_citlali_lianying");
      }
    },
    ai: { threaten: 1.5 },
  },
  fan_sp_zhuyao_chengshi_effect: {
    charlotte: true, onremove(player) { player.removeAdditionalSkill("fan_sp_zhuyao_chengshi_effect"); },
  },
  // Local v1.11.6 character/sb.js sblianying; independently packaged so disabling
  // the native SB character pack does not remove Citlali's derived skill.
  fan_sp_citlali_lianying: {
    audio: false, direct: true, locked: false,
    trigger: { global: "phaseEnd" },
    filter(event, player) { return event.player !== player; },
    async content(event, trigger, player) {
      const result = await player.chooseBool("你可以发动【连营】").set("prompt2", false)
        .set("ai", () => game.hasPlayer(t => get.attitude(player, t) > 0)).forResult();
      if (!result.bool || !player.isIn()) return;
      player.logSkill("fan_sp_citlali_lianying", null, null, null, []);
      speak("fan_sp_citlali_lianying", player);
      let num = 1;
      player.getHistory("lose", evt => { if (evt.cards2) num += evt.cards2.length; });
      const cards = get.cards(Math.min(5, num));
      await game.cardsGotoOrdering(cards);
      try {
        while (cards.length && player.isIn() && game.hasPlayer(t => t.isIn())) {
          cards.splice(0, cards.length, ...cards.filter(c => get.position(c, true) === "o"));
          if (!cards.length) break;
          const result = await player.chooseButtonTarget({
            createDialog: ["连营：选择分配的牌和角色", cards], forced: true,
            allowChooseAll: true, selectButton: [1, cards.length],
            filterButton: button => get.position(button.link, true) === "o",
            ai1: button => get.value(button.link),
            ai2: target => {
              const chosen = ui.selected.buttons.map(button => button.link);
              return get.attitude(player, target) * chosen.reduce((sum, card) => sum + get.value(card, target), 0);
            },
          }).forResult();
          const target = result.targets?.[0];
          const selected = result.links?.filter(c => cards.includes(c) && get.position(c, true) === "o") || [];
          if (!result.bool || !selected.length || !target?.isIn()) break;
          cards.splice(0, cards.length, ...cards.filter(c => !selected.includes(c)));
          player.line(target, "green");
          const gain = target.gain({ cards: selected, animate: "draw" });
          gain.giver = player;
          await gain;
        }
      } finally {
        const remaining = cards.filter(c => get.position(c, true) === "o");
        if (remaining.length) await game.cardsDiscard(remaining);
      }
    },
    ai: { threaten: 1.3 },
  },
  fan_sp_zhuyao_used: { charlotte: true },
  fan_sp_miyan_used: { charlotte: true },
  fan_sp_miyan: {
    audio: false, direct: true, locked: false,
    trigger: { global: "damageEnd" },
    filter(event, player) {
      return (event.player === player || event.player === player.storage.fan_sp_yingxin_target)
        && canMiyan(player, event.source);
    },
    async content(event, trigger, player) {
      const source = trigger.source;
      if (!canMiyan(player, source)) return;
      const result = await player.chooseBool("你可以发动【谜烟】，弃置所有手牌")
        .set("prompt2", false).set("ai", () => miyanEstimate(player, source) > 0).forResult();
      if (!result.bool || !canMiyan(player, source)) return;
      player.addTempSkill("fan_sp_miyan_used", "phaseAfter");
      player.logSkill("fan_sp_miyan", source, null, null, []);
      speak("fan_sp_miyan_use", player);
      await player.discard(player.getCards("h"));
      if (!player.isIn()) return;
      const card = damageChoices(player, source).randomGet();
      if (card) {
        const targets = ["nanman", "wanjian"].includes(card.name)
          ? game.filterPlayer(t => player.canUse(card, t, false)) : [source];
        const use = player.useCard(card, targets, "noai");
        use.addCount = false;
        await use;
      }
      if (!player.isIn()) return;
      speak("fan_sp_miyan_turn", player);
      await player.turnOver();
      if (!player.isIn()) return;
      const basics = Array.from(ui.cardPile.childNodes).filter(c => get.type(c, false) === "basic");
      if (basics.length) await player.gain(basics.randomGet(), "draw");
    },
    ai: { threaten: 1.4 },
  },
};
