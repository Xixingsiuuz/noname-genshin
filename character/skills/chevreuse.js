import { lib, game, get, ui, _status } from "../../../../noname.js";
export const surrounded = (player, partner) => game.filterPlayer(target => player.inRange(target) && partner.inRange(target));
function installPreview() {
  if (lib.hooks.checkEnd.some(fn => fn.fanHewei)) return;
  const nodes = new Map();
  const clear = () => { for (const node of nodes.values()) node.remove(); nodes.clear(); };
  const update = event => {
    clear();
    if (event !== _status.event || event.skill !== "fan_hewei" || !event.isMine() || ui.selected.cards.length !== 1) return;
    const partner = ui.selected.targets[0];
    if (!partner) return;
    for (const target of surrounded(event.player, partner)) {
      const node = ui.create.div(".damage.normal-font.damageadded.fan-hewei-preview", target);
      node.textContent = "合围目标";
      node.dataset.nature = "soil";
      Object.assign(node.style, {
        position: "absolute", top: "50%", left: "50%", width: "1em", height: "auto",
        writingMode: "vertical-rl", textOrientation: "upright", whiteSpace: "nowrap",
        fontFamily: "xinwei", fontSize: "32px", lineHeight: "1.15", letterSpacing: "2px",
        textAlign: "center", transform: "translate(-50%, -50%)", opacity: "1",
        pointerEvents: "none", zIndex: "5",
      });
      nodes.set(target, node);
    }
  };
  const hook = event => update(event); hook.fanHewei = true;
  lib.hooks.checkEnd.push(hook);
  lib.hooks.uncheckEnd.push(() => { clear(); });
}
function benefit(player, partner) {
  return surrounded(player, partner).reduce((sum, target) => sum
    + (target.countDiscardableCards(player, "he") ? get.effect(target, { name: "guohe" }, player, player) : 0)
    + (!target.isLinked() ? get.effect(target, { name: "tiesuo" }, player, player) : 0), 0);
}
export default {
  fan_hewei: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    onChooseToUse: installPreview,
    position: "he", selectCard: 1,
    filterCard: (card, player) => lib.filter.cardDiscardable(card, player, "fan_hewei"),
    selectTarget: 1, complexSelect: true, complexTarget: true,
    filterTarget: () => ui.selected.cards.length === 1,
    manualConfirm: true, fanPairedConfirm: true,
    prompt: "合围：弃置一张牌并选择一名角色", prompt2: false,
    check: card => {
      const player = _status.event.player;
      return Math.max(...game.filterPlayer().map(target => benefit(player, target)), 0) / 2 - get.value(card, player);
    },
    async content(event, trigger, player) {
      const partner = event.targets[0];
      if (!player.isIn() || !partner?.isIn()) return;
      const targets = surrounded(player, partner).sortBySeat(_status.currentPhase || player);
      for (const target of targets) {
        if (!target.isIn()) continue;
        if (target.countDiscardableCards(player, "he")) await player.discardPlayerCard(target, "he", true);
        if (target.isIn()) await target.link(true);
      }
    },
    ai: { order: 7, result: { target: () => 0, player: (player, target) => benefit(player, target) / 5 - 1 } },
  },
  fan_guzhen: {
    audio: false, locked: false, trigger: { global: "damageEnd" }, direct: true,
    filter: event => event.num > 0 && game.hasNature(event),
    async content(event, trigger, player) {
      const recovery = target => target.isDamaged() ? get.recoverEffect(target, player, player) : -Infinity;
      const draw = target => get.effect(target, { name: "wuzhong" }, player, player);
      const chooser = player.chooseTarget("固阵：选择一名角色", (card, player, target) => target.isIn())
        .set("prompt2", false).set("manualConfirm", true)
        .set("ai", target => Math.max(recovery(target), draw(target)));
      let controls;
      const selected = () => ui.selected.targets.length === 1 && ui.selected.targets[0].isIn() ? ui.selected.targets[0] : null;
      const allowed = action => {
        const target = selected();
        return !!target && (action === "draw" || target.isDamaged());
      };
      const refresh = current => {
        if (current !== chooser || _status.event !== chooser || !chooser.isMine()) return;
        ui.confirm?.close();
        if (!controls) controls = ui.create.control("回复体力", "摸两张牌", "取消", function (label) {
          if (_status.event !== chooser) return;
          if (label === "取消") { ui.click.cancel(); return; }
          const action = label === "回复体力" ? "heal" : "draw";
          if (!allowed(action)) return;
          chooser.fanGuzhenChoice = action;
          ui.click.ok();
        });
        for (const node of Array.from(controls.childNodes)) {
          const disabled = node.link !== "取消" && !allowed(node.link === "回复体力" ? "heal" : "draw");
          node.classList.toggle("disabled", disabled);
          node.setAttribute("aria-disabled", String(disabled));
          node.style.opacity = disabled ? "0.4" : "";
          node.style.pointerEvents = disabled ? "none" : "";
        }
      };
      lib.hooks.checkEnd.push(refresh);
      let result;
      try { result = await chooser.forResult(); }
      finally {
        const index = lib.hooks.checkEnd.indexOf(refresh);
        if (index >= 0) lib.hooks.checkEnd.splice(index, 1);
        controls?.close();
      }
      if (!result.bool || result.targets?.length !== 1) return;
      const target = result.targets[0];
      const choice = chooser.fanGuzhenChoice || (recovery(target) > draw(target) ? "heal" : "draw");
      if (!target.isIn()) return;
      player.logSkill("fan_guzhen", target);
      if (choice === "heal") { if (target.isDamaged()) await target.recover(); }
      else await target.draw(2);
    },
    ai: { threaten: 1.8 },
  },
};
