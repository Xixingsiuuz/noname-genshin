import { game, get, lib, _status } from "../../../../noname.js";

// 只排除三行直接产生的移动，不屏蔽其间其他技能独立产生的得牌。
const gained = (event, owner, target) => {
  if (event.fan_sanxing || event.getlx === false || event.getParent?.()?.name === "fan_sanxing") return [];
  const received = event.getg?.(target) || [];
  const lost = event.getl?.(owner)?.cards2 || [];
  return received.filter(card => lost.includes(card));
};
const discardable = (target, colors) => target.getCards("he", card =>
  colors.includes(get.color(card, target)) && lib.filter.cardDiscardable(card, target, "fan_sanxing"));
function branchCosts(target, owner, colors, num) {
  const discard = discardable(target, colors).reduce((sum, card) => sum + get.value(card, target), 0);
  const hand = target.getCards("h").slice().sort((a, b) => get.value(a, target) - get.value(b, target));
  const give = hand.length >= num ? hand.slice(0, num).reduce((sum, card) => sum + get.value(card, target), 0)
    * (get.attitude(target, owner) > 0 ? 0.45 : 1.4) : Infinity;
  return { discard, give };
}
// 估计拿牌后，三行拥有者追加不同颜色牌所能索偿的代价。
// 仅使用拿牌者自己的牌与已公开牌，不窥视绫人的暗置手牌。
function takeValue(actor, owner, card) {
  const attitude = get.attitude(actor, owner);
  const value = get.value(card, actor);
  if (attitude > 0) return value + 2;
  if (!owner.hasSkill("fan_sanxing") || owner.countCards("he") <= 1) return value - 2;
  const colors = [get.color(card, false)];
  // 暗置余牌按可能存在异色估计风险；只有公开装备可精确判断。
  const remainingHand = owner.countCards("h") - 1;
  const publicColors = owner.getCards("e").map(c => get.color(c, owner));
  if (remainingHand > 0 || publicColors.some(color => !colors.includes(color))) colors.push(colors[0] === "red" ? "black" : "red");
  const costs = branchCosts(actor, owner, colors, 4);
  return value - Math.max(0, Math.min(costs.discard + value, costs.give)) - 2;
}
const canVisit = (actor, owner) => owner !== actor && owner.isIn() && owner.hasSkill("fan_xingjia")
  && owner.countCards("h") > 0 && owner.countGainableCards(actor, "h") > 0;

export default {
  fan_sanxing: {
    audio: "ext:原神/audio/ayato/skill:2",
    trigger: { global: ["gainAfter", "loseAsyncAfter"], player: "damageEnd" },
    direct: true,
    locked: false,
    getIndex(event, player) {
      if (event.name === "damage") return event.source && event.source !== player && event.source.isIn() && event.num > 0 ? [event.source] : [];
      return game.filterPlayer(target => target !== player && gained(event, player, target).length)
        .sortBySeat(_status.currentPhase || player);
    },
    filter(event, player, name, target) {
      return !!target?.isIn() && player.countCards("he") > 0 && (event.name === "damage" ? event.source === target && target !== player && event.num > 0 : gained(event, player, target).length > 0);
    },
    async content(event, trigger, player) {
      // getIndex 的每项由 v1.11.6 写入 indexedData；direct 技能没有自动生成的 targets。
      const target = event.indexedData;
      if (!target?.isIn() || !player.isIn()) return;
      const original = trigger.name === "damage" ? [] : gained(trigger, player, target);
      if (trigger.name !== "damage" && !original.length) return;
      const colors = [...new Set(original.map(card => get.color(card, false)))];
      const num = (original.length + 1) * 2;
      const result = await player.chooseCard("he", "三行：你可以交给" + get.translation(target) + "一张牌")
        .set("prompt2", false).set("ai", card => {
          const costs = branchCosts(target, player, [...new Set([...colors, get.color(card, player)])], num);
          return -get.attitude(player, target) * Math.min(costs.discard, costs.give) / 5 - get.value(card, player);
        }).forResult();
      const card = result.cards?.[0];
      if (!result.bool || !target.isIn() || !player.isIn() || !player.getCards("he").includes(card)) return;
      colors.push(get.color(card, player));
      player.logSkill("fan_sanxing", target);
      const transfer = player.give(card, target);
      transfer.fan_sanxing = true;
      await transfer;
      // 实际没有交付则不执行后续惩罚。
      if (!transfer.getg(target).includes(card) || !target.isIn() || !player.isIn()) return;
      // 两项始终显示；原生按钮过滤将不能足额交牌的选项置为 unselectable。
      const choice = await target.chooseButton(["三行：选择一项（交给手牌需" + num + "张）", [["弃置同色牌", "交给手牌"], "textbutton"]], true)
        .set("filterButton", button => button.link !== "交给手牌" || target.countCards("h") >= num)
        .set("ai", button => {
          const costs = branchCosts(target, player, colors, num);
          return button.link === "交给手牌" ? -costs.give : -costs.discard;
        }).forResult();
      if (!target.isIn()) return;
      if (choice.links?.[0] === "交给手牌" && player.isIn() && target.countCards("h") >= num) {
        const give = await target.chooseCard("h", num, true, "三行：交给" + get.translation(player) + num + "张手牌")
          .set("ai", card => -get.value(card)).forResult();
        if (give.bool && give.cards?.length === num && player.isIn() && target.isIn()
          && give.cards.every(card => target.getCards("h").includes(card))) {
          const back = target.give(give.cards, player);
          back.fan_sanxing = true;
          await back;
        }
      } else {
        const cards = discardable(target, colors);
        if (cards.length) await target.discard(cards);
      }
    },
    ai: { threaten: 1.7 },
  },
  fan_xingjia: {
    audio: "ext:原神/audio/ayato/skill:2",
    locked: false,
    global: "fan_xingjia_visit",
  },
  fan_xingjia_visit: {
    audio: false,
    enable: "phaseUse",
    usable: 1,
    locked: false,
    filter(event, player) { return game.hasPlayer(owner => canVisit(player, owner)); },
    filterTarget(card, player, target) { return canVisit(player, target); },
    selectTarget: 1,
    prompt: "兴家：观看一名角色的手牌并获得一张",
    prompt2: false,
    async content(event, trigger, player) {
      const owner = event.target;
      const refund = () => { const stat = player.getStat("skill"); stat.fan_xingjia_visit = Math.max(0, (stat.fan_xingjia_visit || 1) - 1); };
      if (!canVisit(player, owner)) { refund(); return; }
      // 确认发动后才公开手牌；观看与获得为同一强制步骤，不允许免费窥牌后取消。
      const result = await player.choosePlayerCard(owner, "h", "visible", true, "兴家：选择获得一张手牌")
        .set("prompt2", false)
        .set("filterButton", button => lib.filter.canBeGained(button.link, player, owner))
        .set("ai", button => takeValue(player, owner, button.link)).forResult();
      const card = result.links?.[0];
      if (!result.bool || !canVisit(player, owner) || !owner.getCards("h").includes(card)
        || !lib.filter.canBeGained(card, player, owner)) return;
      owner.logSkill("fan_xingjia", player);
      // gainPlayerCard 内部强制选牌会重复询问；此处直接获得已观看并确认的实体牌。
      // 不打三行排除标记：本次获得本应触发三行，await 等待其全部处理后再摸牌。
      const gain = player.gain(card, owner, "giveAuto");
      await gain;
      if (gain.getg(player).includes(card) && owner.isIn()) await owner.draw(2);
    },
    ai: {
      order: 5,
      result: {
        target(player, target) {
          if (get.attitude(player, target) > 0) return 2;
          return 0;
        },
        player(player, target) {
          if (get.attitude(player, target) > 0) return 1;
          const shown = target.getCards("h", card => get.is.shownCard(card));
          if (shown.length) return Math.max(...shown.map(card => takeValue(player, target, card)));
          return target.hasSkill("fan_sanxing") && target.countCards("he") > 1 ? -1 : 1;
        },
      },
    },
  },
};
