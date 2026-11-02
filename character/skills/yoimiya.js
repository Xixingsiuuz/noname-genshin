import { game, get, ui, lib, _status } from "../../../../noname.js";

// 三个条件与不同实体牌做匹配；按牌组去重，避免多种分配给同一组增加概率。
export function maximalGroups(cards, reference, owner) {
  const values = [get.number(reference), get.suit(reference), reference._fanType ?? get.type2(reference)];
  const matches = cards.map(card => [get.number(card, owner), get.suit(card, owner), get.type2(card, owner)]
    .map((value, index) => value === values[index] && (index === 0 ? Number.isFinite(value) && value > 0 : index === 1 ? ["spade", "heart", "club", "diamond"].includes(value) : !!value)));
  let best = 0;
  const groups = new Map();
  function visit(slot, indices) {
    if (slot === 3) {
      if (indices.length < best) return;
      if (indices.length > best) { best = indices.length; groups.clear(); }
      const sorted = indices.slice().sort((a, b) => a - b);
      groups.set(sorted.join(","), sorted.map(index => cards[index]));
      return;
    }
    visit(slot + 1, indices);
    matches.forEach((match, index) => {
      if (match[slot] && !indices.includes(index)) visit(slot + 1, indices.concat(index));
    });
  }
  visit(0, []);
  return [...groups.values()];
}
// 牌堆顶是固定槽位：原顶牌只能留在原位或换入手牌，不能移动到另一槽位。
export function validXiajiExchange(moved, top, hand, count) {
  if (!Array.isArray(moved) || moved.length !== 2 || !Array.isArray(moved[0]) || !Array.isArray(moved[1])
    || moved[0].length !== top.length || moved[1].length !== hand.length) return false;
  const all = moved.flat(), original = top.concat(hand);
  if (new Set(all).size !== original.length || all.some(card => !original.includes(card))) return false;
  return moved[0].every((card, index) => card === top[index] || hand.includes(card))
    && moved[0].filter(card => hand.includes(card)).length <= count;
}
export function canMoveXiaji(from, to, moved, top, hand, count) {
  if (typeof to === "number" || !from || !to) return false;
  const first = moved.findIndex(row => row.includes(from.link));
  const second = moved.findIndex(row => row.includes(to.link));
  if (first < 0 || second < 0 || first === second) return false;
  const next = moved.map(row => row.slice());
  const a = next[first].indexOf(from.link), b = next[second].indexOf(to.link);
  [next[first][a], next[second][b]] = [next[second][b], next[first][a]];
  return validXiajiExchange(next, top, hand, count);
}
function discardable(player, target) {
  return target.getCards("hej", card => lib.filter.canBeDiscarded(card, player, target, "fan_huahuo"));
}
async function randomDiscard(player, target, reference) {
  if (!target.isIn()) return;
  const groups = maximalGroups(discardable(player, target), reference, target);
  const cards = groups.randomGet();
  // 先锁定随机最大组合，再逐张完整结算；嵌套效果可能移走或保护后续牌。
  for (const card of cards || []) {
    if (!target.isIn()) break;
    if (!discardable(player, target).includes(card)) continue;
    const next = target.discard([card]);
    next.discarder = player;
    await next;
  }
}
function reference(card, owner) {
  return { number: get.number(card, owner), suit: get.suit(card, owner), type: get.type2(card, owner) };
}
// 将类别保存为引擎可读取的虚拟牌，防止后续离开手牌后属性修正变化。
function frozen(card, owner) {
  const ref = reference(card, owner);
  return { name: get.name(card, owner), number: ref.number, suit: ref.suit, _fanType: ref.type };
}
function groupsFor(player, target, ref) {
  // reference 的 type2 由保存时的类别提供，避免依赖当前持有者。
  return maximalGroups(discardable(player, target), ref, target);
}
function discardValue(player, target, ref) {
  const groups = groupsFor(player, target, ref);
  return groups.reduce((sum, cards) => sum + cards.reduce((n, card) => n + get.buttonValue({ link: card }), 0), 0) / groups.length;
}
function traps(player) { return player.storage.fan_xiaji_cards || []; }
function lossTraps(event, player) {
  const result = [];
  const actors = event.name === "useCard" ? [event.player] : game.filterPlayer();
  for (const actor of actors) {
    if (actor === player) continue;
    if (event.name !== "useCard" && event.getlx === false) continue;
    const loss = event.name === "useCard" ? actor.getHistory("lose", loss => (loss.getParent() === event || loss.relatedEvent === event))
      : [event.getl ? event.getl(actor) : event.player === actor ? event : null];
    const hand = loss.flatMap(item => item?.hs || []);
    for (const card of hand) {
      const entry = traps(player).find(entry => entry.card === card);
      if (entry && !result.some(item => item.entry === entry)) result.push({ entry, actor });
    }
  }
  return result;
}

async function resolveXiaji(event, trigger, player, count) {
      if (!player.isIn() || !Number.isInteger(count) || count < 1 || count > 3 || count > player.countCharge()) return;
      player.removeCharge(count);
      player.logSkill("fan_xiaji");
      const top = get.cards(5);
      await game.cardsGotoOrdering(top);
      const hand = player.getCards("h");
      const choice = await player.chooseToMove("夏祭：以至多" + count + "张手牌替换牌堆顶的牌", true).set("list", [["牌堆顶", top], ["手牌", hand]])
        .set("filterMove", (from, to, moved) => canMoveXiaji(from, to, moved, top, hand, count))
        .set("filterOk", moved => validXiajiExchange(moved, top, hand, count))
        .set("processAI", () => {
          const incoming = top.slice().sort((a, b) => get.value(b, player) - get.value(a, player));
          const outgoing = hand.slice().sort((a, b) => get.value(a, player) - get.value(b, player));
          let n = 0;
          while (n < Math.min(count, incoming.length, outgoing.length) && get.value(incoming[n], player) > get.value(outgoing[n], player) + (player.next && get.attitude(player, player.next) > 0 ? 3 : 0)) n++;
          const put = outgoing.slice(0, n), take = incoming.slice(0, n);
          return [top.map(card => take.includes(card) ? put[take.indexOf(card)] : card), hand.filter(card => !put.includes(card)).concat(take)];
        }).forResult();
      let pile = top;
      if (choice.bool && player.isIn() && validXiajiExchange(choice.moved, top, hand, count)) {
        const put = choice.moved[0].filter(card => hand.includes(card));
        const take = top.filter(card => !choice.moved[0].includes(card));
        if (put.length === take.length && put.length <= count && put.every(card => player.getCards("h").includes(card))) {
          // 在失去前保存实际手牌属性；埋入牌堆不属于弃置。
          const entries = put.map(card => ({ card, ref: frozen(card, player) }));
          if (!player.storage.fan_xiaji_cards) player.storage.fan_xiaji_cards = [];
          player.storage.fan_xiaji_cards = traps(player).filter(entry => !put.includes(entry.card)).concat(entries);
          if (put.length) await player.lose(put, ui.ordering);
          pile = choice.moved[0];
          // 先复原牌堆，再获得换出的牌，防止获得牌引发额外摸牌时牌堆缺失。
          await game.cardsGotoPile(pile.slice().reverse(), "insert");
          game.updateRoundNumber();
          if (take.length) await player.gain(take, "draw");
          return;
        }
      }
      await game.cardsGotoPile(pile.slice().reverse(), "insert");
      game.updateRoundNumber();
    }

export default {
  fan_xiaji: {
    audio: "ext:原神/audio/yoimiya/skill:true", locked: false, chargeSkill: 3,
    init(player) {
      if (!player.storage.fan_xiaji_initialized) { player.storage.fan_xiaji_initialized = true; player.addCharge(1, false); }
    },
    enable: "phaseUse", usable: 1, direct: true,
    filter: (event, player) => player.countCharge() > 0,
    selectCard: -1, selectTarget: -1, notarget: true,
    async content(event, trigger, player) {
      // 原生 useSkill 先预记次数；同一事件内等待数量选择，取消可重试，确认后才计为发动。
      const stat = player.getStat("skill"), total = player.getStat();
      const counted = event.getParent?.("useSkill")?.addCount !== false;
      if (counted && stat.fan_xiaji > 0) stat.fan_xiaji--;
      if (total.allSkills > 0) total.allSkills--;
      const result = await player.chooseControl("1", "2", "3", "cancel2")
        .set("fan_xiaji_count_choice", true)
        .set("prompt", "夏祭：选择消耗的蓄力点数").set("prompt2", false)
        .set("ai", () => {
          const desired = Math.min(3, player.countCharge(), Math.max(1, player.getCards("h", card => get.value(card, player) < 5).length));
          return desired > 0 ? String(desired) : "cancel2";
        }).forResult();
      const count = Number(result.control);
      if (!player.isIn() || !Number.isInteger(count) || count < 1 || count > 3 || count > player.countCharge()) return;
      if (counted) stat.fan_xiaji = (stat.fan_xiaji || 0) + 1;
      total.allSkills = (total.allSkills || 0) + 1;
      await resolveXiaji(event, trigger, player, count);
    },
    group: "fan_xiaji_burst",
    ai: { order: 9, result: { player: player => player.countCards("h") ? 1 : 0.2 } },
  },
  fan_xiaji_burst: {
    audio: "ext:原神/audio/yoimiya/skill:3", locked: false, forced: true, popup: false,
    trigger: { global: ["useCard", "loseAfter", "loseAsyncAfter"] },
    filter(event, player) {
      return (event.name === "useCard" || event.type === "discard") && lossTraps(event, player).length > 0;
    },
    async content(event, trigger, player) {
      const pending = lossTraps(trigger, player);
      // 先消耗本批实体牌资格，防止弃牌造成嵌套触发重复引爆。
      player.storage.fan_xiaji_cards = traps(player).filter(entry => !pending.some(item => item.entry === entry));
      const actors = [...new Set(pending.map(item => item.actor))].sortBySeat(_status.currentPhase || player);
      for (const actor of actors) for (const item of pending.filter(item => item.actor === actor)) {
        if (!actor.isIn() || !player.isIn()) continue;
        player.logSkill("fan_xiaji_burst", actor);
        await randomDiscard(player, actor, item.entry.ref);
        if (actor.isIn() && player.isIn()) await actor.damage(1, "fire", player);
      }
    },
  },
  fan_huahuo: {
    audio: "ext:原神/audio/yoimiya/skill:2", locked: false,
    mod: { targetInRange(card) { if (card.name === "sha") return true; } },
    trigger: { player: "useCardToPlayered" }, direct: true,
    filter: (event, player) => event.card.name === "sha" && event.target.isIn() && groupsFor(player, event.target, event.card).some(cards => cards.length),
    async content(event, trigger, player) {
      const target = trigger.target, ref = frozen(trigger.card, player);
      const result = await player.chooseBool("花火：随机弃置目标的匹配牌？").set("prompt2", false)
        .set("ai", () => -get.attitude(player, target) * discardValue(player, target, ref) > 0).forResult();
      if (!result.bool || !target.isIn()) return;
      player.logSkill("fan_huahuo", target);
      await randomDiscard(player, target, ref);
    },
    group: "fan_huahuo_charge",
    ai: { effect: { player(card, player, target) {
      if (card.name !== "sha" || !target || get.attitude(player, target) >= 0) return;
      return [1, Math.max(0, discardValue(player, target, card)) * 0.15
        + (player.countCharge(true) > 0 && get.damageEffect(target, player, player, get.nature(card)) > 0 ? 0.3 : 0)];
    } } },
  },
  fan_huahuo_charge: {
    audio: false, locked: false, forced: true, popup: false,
    trigger: { source: "damageSource" },
    filter(event, player) {
      const use = event.getParent("useCard");
      return event.num > 0 && !event.unreal && event.card?.name === "sha" && use?.card === event.card
        && use.player === player && player.countCharge(true) > 0;
    },
    async content(event, trigger, player) { player.addCharge(1); },
  },
};
