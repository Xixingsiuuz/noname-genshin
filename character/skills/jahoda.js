import { lib, game, get, ui, _status } from "../../../../noname.js";

const held = (target, card) => target.isIn() && target.getCards("h").includes(card);
// AI只读取公开数量与自己手牌，不偷看目标暗置手牌。
function raidValue(player, target, cards) {
  if (target === player || !target.isIn() || target.countCards("h") < cards.length
    || !cards.length || get.attitude(player, target) >= 0) return -Infinity;
  const remaining = player.getCards("h").filter(card => !cards.includes(card));
  const dodges = remaining.filter(card => get.name(card, player) === "shan").length;
  const saves = remaining.filter(card => ["tao", "jiu"].includes(get.name(card, player))).length;
  const durability = player.hp + (player.hujia || 0);
  // 暗牌以约四分之一为杀估算；逐张重新计算消耗与防御资源。
  const exposure = Math.max(0, cards.length * .27 - dodges * .8);
  if (durability <= 1 && !dodges && !saves) return -Infinity;
  const danger = exposure * (durability <= 1 ? 8 : durability <= 2 ? 4 : 1.5);
  const cost = cards.reduce((sum, card) => sum + Math.max(.5, get.value(card, player)) * .45, 0);
  const disruption = Math.min(2, -get.attitude(player, target) / 3);
  return cards.length * (3.3 + disruption) - cost - danger;
}
function raidCheck(card) {
  const player = _status.event.player;
  const selected = ui.selected.cards.filter(item => item !== card);
  const targets = ui.selected.targets.length ? ui.selected.targets : game.filterPlayer();
  let best = -Infinity;
  for (const target of targets) {
    const before = selected.length ? raidValue(player, target, selected) : 0;
    const after = raidValue(player, target, [...selected, card]);
    if (Number.isFinite(after) && Number.isFinite(before)) best = Math.max(best, after - before);
  }
  return best;
}
export default {
  fan_haigou: {
    audio: false, enable: "phaseUse", usable: 1, locked: false,
    position: "he", selectCard: [0, Infinity], selectTarget: 1,
    manualConfirm: true, fanPairedConfirm: true,
    filterCard: (card, player) => lib.filter.cardDiscardable(card, player, "fan_haigou"),
    filterTarget(card, player, target) {
      return target !== player && target.countCards("h") >= ui.selected.cards.length;
    },
    filterOk() { return ui.selected.cards.length > 0 && ui.selected.targets.length === 1; },
    check: raidCheck,
    async content(event, trigger, player) {
      const target = event.target, count = event.cards.length;
      if (!player.isIn() || !target.isIn() || target.countCards("h") < count) return;
      const result = await player.choosePlayerCard(target, "h", count, true)
        .set("prompt", "海钩：选择要展示的手牌").forResult();
      const cards = (result.cards || []).filter(card => held(target, card));
      if (cards.length !== count) return;
      await target.showCards(cards, "海钩");
      const attacks = cards.filter(card => get.name(card, target) === "sha");
      const rest = cards.filter(card => !attacks.includes(card));
      for (const card of attacks) {
        if (!player.isIn() || !target.isIn()) break;
        if (!held(target, card) || !target.canUse(card, player, false)) continue;
        // 固定实体素材与原目标；selectCard:-1 走原生自动选牌，保留装备目标数修正。
        await target.chooseToUse({
          prompt: "海钩：对雅珂达使用展示的【杀】", prompt2: false,
          forced: true, position: "h", selectCard: -1, selectTarget: -1,
          fan_haigou_card: card, fan_haigou_target: player,
          filterCard(item, actor) {
            return item === _status.event.fan_haigou_card && held(actor, item)
              && lib.filter.cardEnabled(item, actor) && lib.filter.cardUsable(item, actor);
          },
          filterTarget(item, actor, victim) {
            return victim === _status.event.fan_haigou_target && lib.filter.filterTarget(item, actor, victim);
          },
          filterOk() {
            const next = _status.event;
            return held(next.player, next.fan_haigou_card) && next.fan_haigou_target.isIn()
              && ui.selected.cards.length === 1 && ui.selected.cards[0] === next.fan_haigou_card
              && ui.selected.targets.includes(next.fan_haigou_target);
          },
        });
      }
      if (player.isIn() && target.isIn()) {
        const gain = rest.filter(card => held(target, card));
        if (gain.length) await player.gain(gain, target, "giveAuto");
      }
    },
    global: "fan_haigou_range",
    ai: {
      order: 9,
      result: { target(player, target) {
        const value = raidValue(player, target, ui.selected.cards);
        return Number.isFinite(value) && value > 0 ? -value : 0;
      } },
    },
  },
  fan_haigou_range: {
    charlotte: true,
    mod: { targetInRange(card, player, target) {
      let event = _status.event;
      while (event) {
        if (event.fan_haigou_card && event.player === player && event.fan_haigou_target === target
          && (card === event.fan_haigou_card || card.cards?.includes(event.fan_haigou_card))) return true;
        event = event.parent;
      }
    } },
  },
  fan_baocang: {
    audio: false, trigger: { global: "phaseJieshuBegin" }, forced: true, locked: false,
    filter: (event, player) => player.isDamaged() && player.countCards("h") < player.hp,
    async content(event, trigger, player) {
      await player.draw();
      if (player.isIn()) await player.recover();
    },
    ai: { threaten: 1.4 },
  },
};
