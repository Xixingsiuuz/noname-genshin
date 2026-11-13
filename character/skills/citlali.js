import { lib, game, get, ui, _status } from "../../../../noname.js";

const tag = "fan_yingxin_hand";
const evaluatingSharedHand = new WeakSet();
const voiceCounts = { fan_yingxin_start: 1, fan_yingxin_draw: 2, fan_zhuyao_lose: 2, fan_zhuyao_draw: 2, fan_zhuyao_chengshi: 1, fan_citlali_lianying: 2, fan_miyan_use: 2, fan_miyan_turn: 2 };
const voices = {};
for (const [name, count] of Object.entries(voiceCounts)) {
  if (count === 1) voices[name] = { audio: `ext:原神/audio/citlali/skill/${name}.mp3` };
  else for (let i = 1; i <= count; i++) voices[name + i] = { audio: `ext:原神/audio/citlali/skill/${name}${i}.mp3` };
}
function speak(name, player) { game.trySkillAudio(voiceCounts[name] === 1 ? name : name + [1, 2].randomGet(), player); }
function partners(player) {
  return game.filterPlayer(source => source.hasSkill("fan_yingxin") && source.storage.fan_yingxin_target === player)
    .concat(player.hasSkill("fan_yingxin") && player.storage.fan_yingxin_target?.isIn() ? [player.storage.fan_yingxin_target] : [])
    .filter((target, i, list) => target !== player && list.indexOf(target) === i);
}
function syncHand(player) {
  const real = partners(player).flatMap(target => target.getCards("h"));
  const fake = player.getCards("s", card => card.hasGaintag(tag));
  game.deleteFakeCards(fake.filter(card => !real.some(c => c.cardid === card._cardid)));
  const added = real.filter(card => !fake.some(c => c._cardid === card.cardid));
  if (added.length) player.directgains(game.createFakeCards(added), null, tag);
}
function lossSnapshot(event) { return event.fan_yingxin_loss; }
function isLastLoss(event) { return !!lossSnapshot(event)?.last; }
function emptyHandBenefit(owner, observer, materials) {
  const hand = owner.getCards("h");
  if (!hand.length || !hand.every(c => materials.includes(c))) return 0;
  const side = Math.sign(get.attitude(observer, owner));
  let value = owner.hasSkill("fan_yingxin") || partners(owner).length ? side : 0;
  if (!owner.hasSkill("fan_zhuyao")) return value;
  const red = hand.some(c => get.color(c, owner) === "red"), black = hand.some(c => get.color(c, owner) === "black");
  if (red) {
    value += side;
    const target = owner.storage.fan_yingxin_target;
    if (target?.isIn()) value += Math.sign(get.attitude(observer, target));
  }
  if (black) {
    // The skill owner chooses for their side, even when someone else borrowed the cards.
    const targets = game.filterPlayer().sort((a, b) => get.effect(b, { name: "losehp" }, owner, owner) - get.effect(a, { name: "losehp" }, owner, owner));
    if (targets.length) value += get.effect(targets[0], { name: "losehp" }, owner, observer) / 8;
  }
  if (red && black) value += side * (_status.currentPhase !== owner ? 1.5 : .5);
  return value;
}
function virtualCards(player) {
  const list = [];
  for (const name of lib.inpile) {
    const type = get.type(name);
    if (type !== "basic" && type !== "trick") continue;
    list.push({ name });
    if (name === "sha") list.push({ name, nature: "fire" }, { name, nature: "thunder" });
  }
  const cards = player.getCards("h");
  if (!cards.length || cards.some(card => game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false)) return [];
  return list.filter(card => lib.filter.cardEnabled({ ...card, cards }, player)
    && player.hasUseTarget({ ...card, cards }, undefined, true));
}
export function miyanValue(player, card, discard = false) {
  const hand = player.getCards("h");
  const cost = hand.reduce((sum, c) => sum + Math.max(0, get.value(c, player)), 0) / 5;
  const synergy = emptyHandBenefit(player, player, hand);
  // Spending a whole hand and losing the next turn must both enter the estimate.
  const turnCost = _status.currentPhase === player ? 1.8 : player.hp <= 1 ? 3 : 2.5;
  // Native getUseValue already includes the share skill's empty-hand effect AI.
  return player.getUseValue({ ...card, cards: discard ? [] : hand }, undefined, true)
    + (!discard && player.hasSkill("fan_yingxin_share") ? 0 : synergy) + 1 - cost - turnCost;
}

const revisedMiyan = "fan_miyan_revised";
const revisedUsed = "fan_miyan_revised_used";
function revisedHand(player) {
  const hand = player.getCards("h");
  return player.isIn() && !player.isTurnedOver() && !player.hasSkill(revisedUsed)
    && hand.length && hand.every(card => lib.filter.cardDiscardable(card, player, revisedMiyan)) ? hand : [];
}
function revisedChoices(player) {
  if (!revisedHand(player).length) return [];
  return lib.inpile.filter(name => get.type(name) === "trick").filter(name => {
    const card = { name, isCard: true };
    return lib.filter.cardEnabled(card, player) && player.hasUseTarget(card, undefined, true);
  });
}

export default {
  fan_miyan_revised_used: { charlotte: true },
  fan_miyan_revised: {
    audio: false, direct: true, locked: false,
    trigger: { global: "damageEnd" },
    filter(event, player) {
      return (event.player === player || event.player === player.storage.fan_yingxin_target)
        && revisedChoices(player).length > 0;
    },
    async content(event, trigger, player) {
      const choices = revisedChoices(player);
      if (!choices.length) return;
      const picked = await player.chooseButton(["谜烟：弃置所有手牌，选择普通锦囊", [choices.map(name => ["trick", "", name]), "vcard"]])
        .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
        .set("ai", button => miyanValue(player, { name: button.link[2] }, true)).forResult();
      const name = picked.links?.[0]?.[2];
      if (!picked.bool || !revisedChoices(player).includes(name)) return;
      const hand = revisedHand(player).slice();
      const card = { name, isCard: true };
      const info = get.info(card);
      const range = lib.filter.selectTarget(card, player);
      const legal = game.filterPlayer(t => player.canUse(card, t, undefined, true));
      let result;
      if (info.notarget || range?.[1] === 0) {
        result = { bool: true, targets: [] };
      } else if (!info.complexTarget && !info.complexSelect && !info.singleCard
        && (range?.[0] === -1 || (range?.[0] > 0 && range[0] === legal.length && range[1] >= range[0]))) {
        result = { bool: legal.length > 0, targets: legal.sortBySeat(_status.currentPhase || player) };
      } else {
        const next = player.chooseToUse({
          prompt: "谜烟：使用" + get.translation(card), prompt2: false, chooseonly: true,
          fan_miyan_revised_card: card, norestore: true, _backupevent: "fan_miyan_revised_backup",
          custom: { add: {}, replace: { window() {} } },
        });
        next.backup("fan_miyan_revised_backup");
        next.set("fanPairedConfirm", true).set("manualConfirm", true);
        result = await next.forResult();
      }
      const current = revisedHand(player);
      const targets = result.targets || [];
      if (!result.bool || current.length !== hand.length || !hand.every(c => current.includes(c))
        || !revisedChoices(player).includes(name) || targets.some(t => !t.isIn() || !player.canUse(card, t, undefined, true))) return;
      // Consume the turn quota before discard triggers can cause nested damage.
      player.addTempSkill(revisedUsed, "phaseAfter");
      player.logSkill(revisedMiyan, null, null, null, []);
      speak("fan_miyan_use", player);
      await player.discard(hand);
      if (!player.isIn()) return;
      if (lib.filter.cardEnabled(card, player) && targets.every(t => t.isIn() && player.canUse(card, t, undefined, true))) {
        await player.useCard(card, targets);
      }
      if (!player.isIn()) return;
      speak("fan_miyan_turn", player);
      await player.turnOver();
      if (!player.isIn()) return;
      const basics = Array.from(ui.cardPile.childNodes).filter(c => get.type(c, false) === "basic");
      if (basics.length) await player.gain(basics.randomGet(), "draw");
    },
    subSkill: {
      backup: {
        audio: false, sourceSkill: revisedMiyan, selectCard: -1, filterCard: () => false,
        viewAs() { return _status.event.fan_miyan_revised_card; },
        manualConfirm: true,
      },
    },
    ai: { threaten: 1.4 },
  },
  ...voices,
  fan_yingxin: {
    audio: false, forced: true, locked: true,
    trigger: { global: "phaseBefore", player: "enterGame" },
    filter(event, player) { return !player.storage.fan_yingxin_target && (event.name !== "phase" || game.phaseNumber === 0) && game.hasPlayer(t => t !== player); },
    async content(event, trigger, player) {
      const result = await player.chooseTarget(true, "映心：选择一名其他角色", (card, owner, target) => target !== owner)
        .set("prompt2", false).set("ai", target => {
          const att = get.attitude(player, target);
          return att > 0 ? att * (2 + Math.min(5, target.countCards("h")) / 5) : att;
        }).forResult();
      const target = result.targets?.[0];
      if (!target?.isIn() || !player.isIn()) return;
      player.storage.fan_yingxin_target = target;
      // Serialize the chosen character and resolved caption into the replay;
      // ordinary markSkill only records the skill ID, not this target storage.
      player.markSkillCharacter("fan_yingxin", target, "映心", "映心角色：" + get.translation(target));
      target.addAdditionalSkill("fan_yingxin_" + player.playerid, "fan_yingxin_share");
      syncHand(player); syncHand(target);
      speak("fan_yingxin_start", player);
    },
    intro: { content(storage, player) { return player.storage.fan_yingxin_target ? "映心角色：" + get.translation(player.storage.fan_yingxin_target) : "尚未选择角色"; } },
    onremove(player) {
      const target = player.storage.fan_yingxin_target;
      delete player.storage.fan_yingxin_target;
      if (target) { target.removeAdditionalSkill("fan_yingxin_" + player.playerid); syncHand(target); }
      syncHand(player);
    },
    group: ["fan_yingxin_share", "fan_yingxin_record", "fan_yingxin_draw"],
    ai: { threaten: 1.6 },
  },
  fan_yingxin_record: {
    audio: false, silent: true, forced: true, locked: true, firstDo: true, priority: 100,
    trigger: { global: ["loseBefore", "loseEnd"] },
    filter(event, player) { return event.player === player || (player.hasSkill("fan_yingxin") && event.player === player.storage.fan_yingxin_target); },
    async content(event, trigger) {
      if (event.triggername === "loseBefore") {
        // Save identity and color before hand/zone tags are cleared or later draws occur.
        (trigger.fan_yingxin_before || (trigger.fan_yingxin_before = trigger.player.getCards("h").map(card => ({ card, color: get.color(card, trigger.player) }))));
      } else if (!trigger.fan_yingxin_loss) {
        const before = trigger.fan_yingxin_before || [];
        const hs = trigger.hs || [];
        trigger.fan_yingxin_loss = {
          last: before.length > 0 && before.every(entry => hs.includes(entry.card)),
          colors: before.filter(entry => hs.includes(entry.card)).map(entry => entry.color),
        };
      }
    },
  },
  fan_yingxin_draw: {
    audio: false, forced: true, locked: true, popup: false,
    trigger: { global: "loseEnd" },
    filter(event, player) { return isLastLoss(event) && (event.player === player || event.player === player.storage.fan_yingxin_target); },
    async content(event, trigger, player) {
      if (!trigger.player.isIn()) return;
      player.logSkill("fan_yingxin", trigger.player, null, null, []);
      speak("fan_yingxin_draw", player);
      await trigger.player.draw();
    },
  },
  fan_yingxin_share: {
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
  fan_zhuyao: {
    audio: false, forced: true, locked: true,
    trigger: { player: "loseAfter" },
    group: "fan_yingxin_record",
    derivation: ["fan_citlali_lianying"],
    filter: isLastLoss,
    async content(event, trigger, player) {
      const colors = lossSnapshot(trigger).colors;
      const black = colors.includes("black"), red = colors.includes("red");
      if (black && player.isIn() && game.hasPlayer(t => t.isIn())) {
        const result = await player.chooseTarget(true, "诸曜：令一名角色失去1点体力")
          .set("prompt2", false).set("ai", target => get.effect(target, { name: "losehp" }, player, player)).forResult();
        const target = result.targets?.[0];
        if (target?.isIn()) { speak("fan_zhuyao_lose", player); player.line(target, "green"); await target.loseHp(); }
      }
      if (red && player.isIn()) {
        const targets = [player, player.storage.fan_yingxin_target].filter(t => t?.isIn()).sortBySeat(_status.currentPhase || player);
        speak("fan_zhuyao_draw", player);
        for (const target of targets) if (target.isIn()) await target.draw();
      }
      if (black && red && player.isIn()) {
        speak("fan_zhuyao_chengshi", player);
        player.addTempSkill("fan_zhuyao_chengshi_effect", { player: "phaseBegin" });
        player.addAdditionalSkill("fan_zhuyao_chengshi_effect", "fan_citlali_lianying");
      }
    },
    ai: { threaten: 1.5 },
  },
  fan_zhuyao_chengshi_effect: {
    charlotte: true, onremove(player) { player.removeAdditionalSkill("fan_zhuyao_chengshi_effect"); },
  },
  // Local v1.11.6 character/sb.js sblianying; independently packaged so disabling
  // the native SB character pack does not remove Citlali's derived skill.
  fan_citlali_lianying: {
    audio: false, direct: true, locked: false,
    trigger: { global: "phaseEnd" },
    filter(event, player) { return event.player !== player; },
    async content(event, trigger, player) {
      const result = await player.chooseBool("你可以发动【连营】").set("prompt2", false)
        .set("ai", () => game.hasPlayer(t => get.attitude(player, t) > 0)).forResult();
      if (!result.bool || !player.isIn()) return;
      player.logSkill("fan_citlali_lianying", null, null, null, []);
      speak("fan_citlali_lianying", player);
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
  fan_miyan: {
    audio: false, direct: true, locked: false,
    trigger: { global: "damageEnd" },
    filter(event, player) {
      return (event.player === player || event.player === player.storage.fan_yingxin_target)
        && !player.isTurnedOver() && virtualCards(player).length > 0;
    },
    async content(event, trigger, player) {
      if (player.isTurnedOver()) return;
      const choices = virtualCards(player);
      if (!choices.length) return;
      const result = await player.chooseButton(["谜烟：将所有手牌当一张牌使用", [choices.map(c => [get.type(c.name), "", c.name, c.nature]), "vcard"]])
        .set("prompt2", false).set("fanPairedConfirm", true).set("manualConfirm", true)
        .set("ai", button => miyanValue(player, { name: button.link[2], nature: button.link[3] })).forResult();
      if (!result.bool || !player.isIn() || player.isTurnedOver()) return;
      const link = result.links[0], card = { name: link[2], nature: link[3], storage: { fan_miyan: true } };
      if (!virtualCards(player).some(c => c.name === card.name && c.nature === card.nature)) return;
      const hand = player.getCards("h").slice();
      const next = player.chooseToUse({
        prompt: "谜烟：使用" + get.translation(card), prompt2: false,
        fan_miyan_card: card, fan_miyan_hand: hand,
        norestore: true, _backupevent: "fan_miyan_backup",
        custom: { add: {}, replace: { window() {} } },
      });
      next.backup("fan_miyan_backup");
      next.set("fanPairedConfirm", true).set("manualConfirm", true);
      const used = await next.forResult();
      if (!used.bool || !player.isIn()) return;
      speak("fan_miyan_turn", player);
      await player.turnOver();
      if (!player.isIn()) return;
      const basics = Array.from(ui.cardPile.childNodes).filter(c => get.type(c, false) === "basic");
      if (basics.length) await player.gain(basics.randomGet(), "draw");
    },
    subSkill: {
      backup: {
        audio: false, sourceSkill: "fan_miyan", position: "h", selectCard: -1,
        manualConfirm: true, popname: true,
        filterCard(card, player) { return (_status.event.fan_miyan_hand || []).includes(card) && player.getCards("h").includes(card)
          && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false; },
        viewAs() { return _status.event.fan_miyan_card; },
        filterOk() {
          const player = get.player(), expected = _status.event.fan_miyan_hand, hand = player.getCards("h");
          return !player.isTurnedOver() && expected.length > 0 && hand.length === expected.length
            && expected.every(c => hand.includes(c) && ui.selected.cards.includes(c));
        },
        // AsyncCompiler preserves this module's speak closure; StepCompiler
        // rebuilds ordinary functions and cannot access module-local helpers.
        async precontent(event, trigger, player) {
          player.logSkill("fan_miyan", null, null, null, []);
          speak("fan_miyan_use", player);
        },
      },
    },
    ai: { threaten: 1.4 },
  },
};
