import { game, get, ui, _status } from "../../../../noname.js";

// Exact response identity prevents an unrelated nested use from satisfying standby.
export function respondedTo(use, player) {
  return ["useCard", "respond"].some(type => player.hasHistory(type, response => {
    if (!response.respondTo) return false;
    if (response.respondTo[1] === use.card) return true;
    // Counter-nullification belongs to the same original use, including its response chain.
    if (response.card?.name !== "wuxie") return false;
    let parent = response.getParent();
    while (parent && parent.name) {
      if (parent === use) return true;
      const next = parent.getParent?.();
      if (next === parent) break;
      parent = next;
    }
    return false;
  }));
}
export function moveValue(player, from, to, card) {
  const count = to.countCards("e") + 1;
  let value = count * 1.5 + (get.value(card, to) * get.attitude(player, to) - get.value(card, from) * get.attitude(player, from)) / 5;
  const matches = game.filterPlayer(target => target !== to && target.getCards("e").filter(item => item !== card).length === count);
  if (!matches.length) return value;
  for (const other of [to, ...matches]) {
    const equipment = other === to ? [...to.getCards("e"), card] : other.getCards("e").filter(item => item !== card);
    if (equipment.length === count) value -= equipment.reduce((sum, item) => sum + get.value(item, other), 0) * get.attitude(player, other) / 5;
  }
  return value;
}
function plans(player, from, to) {
  return game.filterPlayer(source => !from || source === from).flatMap(source => source.getCards("e").flatMap(card =>
    game.filterPlayer(target => target !== source && (!to || target === to) && target.canEquip(card, false))
      .map(target => ({ from: source, to: target, card, value: moveValue(player, source, target, card) }))));
}
export default {
  fan_daiji: {
    audio: false,
    locked: true,
    forced: true,
    trigger: { global: "useCardAfter" },
    group: "fan_daiji_record",
    filter(event, player) {
      const phase = event.getParent("phaseUse", true);
      return event.player !== player && phase?.player === event.player && !phase.skipped
        && event.fan_daiji_targets?.includes(player) && !respondedTo(event, player);
    },
    async content(event, trigger, player) {
      const phase = trigger.getParent("phaseUse", true);
      if (phase?.player === trigger.player) {
        phase.skipped = true;
        game.log(trigger.player, "结束了出牌阶段");
      }
    },
    subSkill: {
      record: {
        audio: false, locked: true, forced: true, popup: false,
        trigger: { global: "useCardToTargeted" },
        filter: (event, player) => event.target === player,
        async content(event, trigger, player) {
          const use = trigger.getParent("useCard", true);
          if (use) {
            use.fan_daiji_targets ??= [];
            if (!use.fan_daiji_targets.includes(player)) use.fan_daiji_targets.push(player);
          }
        },
      },
    },
    ai: {
      effect: { target(card, source, target) {
        if (source === target || !source.isPhaseUsing()) return;
        const remaining = source.countCards("h") - 1;
        // Do not forbid gifts, multi-target cards or profitable damage; price the lost actions.
        if (remaining <= 0) return;
        const likelyResponse = card.name === "sha" ? target.countCards("h", "shan") :
          ["nanman", "juedou"].includes(card.name) ? target.countCards("h", "sha") : 0;
        return [1, likelyResponse ? 0 : -Math.min(2, remaining * 0.4) * get.sgn(get.attitude(target, source))];
      } },
    },
  },
  fan_qiaoshi: {
    audio: false, locked: false,
    enable: "phaseUse", usable: 1,
    filter: (event, player) => player.canMoveCard(null, true),
    async content(event, trigger, player) {
      const move = player.moveCard({ nojudge: true, forced: false, prompt: "巧施：移动一张装备牌" });
      move.pushHandler("onNextChooseTarget", (choice, { state }) => {
        if (state !== "begin") return;
        choice.set("prompt2", false).set("ai", target => {
          const from = ui.selected.targets[0];
          return Math.max(-100, ...plans(player, from || target, from ? target : null).map(plan => plan.value));
        });
      });
      move.pushHandler("onNextChooseButton", (choice, { state }) => {
        if (state !== "begin") return;
        choice.set("ai", button => moveValue(player, choice.targets0, choice.targets1, button.link));
      });
      const result = await move.forResult();
      if (!result.bool) { player.getStat().skill.fan_qiaoshi--; return; }
      const destination = result.targets?.[1];
      if (!result.card || result.position !== "e" || !destination?.isIn()) return;
      await player.draw(destination.countCards("e"));
      const count = destination.countCards("e");
      const targets = game.filterPlayer(target => target.countCards("e") === count);
      if (!targets.some(target => target !== destination)) return;
      targets.sortBySeat(_status.currentPhase || player);
      for (const target of targets) {
        if (!target.isIn()) continue;
        const cards = target.getCards("e");
        if (cards.length) await target.loseToDiscardpile(cards);
      }
    },
    ai: { order: 6, result: { player(player) {
      return Math.max(0, ...plans(player).map(plan => plan.value));
    } } },
  },
};
