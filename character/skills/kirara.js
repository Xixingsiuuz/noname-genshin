import { lib, game, get, ui, _status } from "../../../../noname.js";
const prefix = player => `fan_bohe_${player.playerid}_`;
function label(player, count) {
  const tag = prefix(player) + count;
  game.broadcastAll((tag, count) => { lib.translate[tag] = `狛荷·${count}`; }, tag, count);
  return tag;
}
function usedCounts(use, owner) {
  const counts = [];
  use.player.getHistory("lose", loss => {
    if ((loss.relatedEvent || loss.getParent()) !== use) return;
    for (const card of use.cards || []) {
      if (!loss.hs?.includes(card)) continue;
      for (const tag of loss.gaintag_map?.[card.cardid] || []) {
        if (tag.startsWith(prefix(owner))) counts.push(Number(tag.slice(prefix(owner).length)));
      }
    }
  });
  return counts;
}
// 检查原本合法目标时跳过本技能自身的限制，仍检查其他技能和距离。
let checking = false;
function required(card, user) {
  if (checking || card.name !== "sha") return [];
  checking = true;
  try {
    return game.filterPlayer(target => target.hasSkill("fan_bugui") && target !== user
      && lib.filter.targetEnabledx(card, user, target) && lib.filter.targetInRange(card, user, target));
  } finally { checking = false; }
}
export default {
  fan_bohe: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    position: "he", selectCard: 1, filterCard: true,
    filterTarget: (card, player, target) => target !== player,
    discard: false, lose: false, delay: 0,
    check: card => 7 - get.value(card),
    async content(event, trigger, player) {
      const target = event.targets[0], card = event.cards[0];
      if (!target.isIn() || !player.getCards("he").includes(card)) return;
      const gain = player.give([card], target);
      gain.gaintag.add(label(player, 0));
      await gain;
      if (target.getCards("h").includes(card)) await target.showCards([card], "狛荷");
    },
    group: ["fan_bohe_count", "fan_bohe_reward"],
    ai: { order: 6, result: {
      player(player, target) {
        const card = ui.selected.cards[0];
        if (!card) return 0;
        // 赠出能及时使用的牌，兼顾自己的回血需要；不为收益向敌人送高价值牌。
        const usable = target.getUseValue(card) > 0;
        return usable ? 0.6 + Math.min(2, player.maxHp - player.hp) * 0.5 : 0.2;
      },
      target(player, target) {
        const card = ui.selected.cards[0];
        if (!card) return 0;
        return Math.max(0.2, get.value(card, target) / 4);
      },
    } },
    subSkill: {
      count: {
        audio: false, locked: false, trigger: { global: "phaseJieshuBegin" }, forced: true, popup: false,
        async content(event, trigger, player) {
          for (const target of game.filterPlayer().sortBySeat(_status.currentPhase || player)) {
            if (!target.isIn()) continue;
            for (const card of target.getCards("h")) {
              for (const tag of [...(card.gaintag || [])]) {
                if (!tag.startsWith(prefix(player))) continue;
                const count = Math.min(5, Number(tag.slice(prefix(player).length)) + 1);
                target.removeGaintag(tag, [card]);
                target.addGaintag([card], label(player, count));
              }
            }
          }
        },
      },
      reward: {
        audio: false, locked: false, trigger: { global: "useCard" }, forced: true, popup: false,
        filter: (event, player) => usedCounts(event, player).length > 0,
        async content(event, trigger, player) {
          const counts = usedCounts(trigger, player);
          for (const count of counts) {
            if (!player.isIn()) break;
            player.logSkill("fan_bohe");
            if (count > 0) await player.draw(count);
            if (player.isIn()) await player.recover();
          }
        },
      },
    },
  },
  fan_bugui: { audio: false, locked: true, global: "fan_bugui_target" },
  fan_bugui_target: {
    mod: {
      playerEnabled(card, player, target) {
        const targets = required(card, player);
        // 原生先选择必选目标，满足后仍可按原生目标上限追加目标。
        if (targets.length && !targets.includes(target)
          && targets.some(current => !ui.selected.targets.includes(current))) return false;
      },
    },
  },
};
