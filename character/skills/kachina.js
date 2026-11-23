import { game, get, _status } from "../../../../noname.js";

export default {
  fan_baishi: {
    audio: false, locked: false,
    trigger: { player: "damageEnd", source: "damageSource" },
    direct: true,
    async content(event, trigger, player) {
      const result = await player.chooseTarget("你可以发动【拜师】，选择一名角色", (card, player, target) => target !== player)
        .set("prompt2", false).set("ai", target => {
          const n = target.countCards("h") - player.countCards("h");
          return n > 0 ? n : -n * get.attitude(player, target) / 3;
        }).forResult();
      if (!result.bool) return;
      const target = result.targets[0];
      if (!player.isIn() || !target.isIn()) return;
      player.logSkill("fan_baishi", target);
      const n = target.countCards("h") - player.countCards("h");
      if (n > 0) await player.draw(n);
      else if (n < 0) await target.draw(-n);
    },
  },
  fan_zhuanzhuan: {
    audio: false, locked: false, enable: "phaseUse", usable: 1,
    filter() { return game.countPlayer(target => target.countCards("e") > 0) >= 2; },
    async content(event, trigger, player) {
      const targets = game.filterPlayer(target => target.countCards("e") > 0).sortBySeat(_status.currentPhase || player);
      if (targets.length < 2) return;
      // All legal transfers are captured before any equipment leaves its slot.
      const plans = targets.map((from, i) => {
        const to = targets[(i + 1) % targets.length];
        return { from, to, cards: from.getCards("e").filter(card => !to.isMin() && to.canEquip(card, false)) };
      });
      for (const plan of plans) {
        const { from, to, cards } = plan;
        if (!from.isIn()) continue;
        const choice = await from.chooseButton(["转转：选择一项", [[
          ["move", cards.length ? "移动装备" : '<span style="opacity:0.5">移动装备（无法移动）</span>'],
          ["hurt", "受到伤害"],
        ], "textbutton"]], true)
          .set("filterButton", button => button.link !== "move" || cards.length > 0)
          .set("ai", button => {
            const damage = get.damageEffect(from, player, from);
            const best = cards.length ? Math.max(...cards.map(card => get.attitude(from, to) * get.value(card, to) / 5 - get.value(card, from))) : -Infinity;
            return button.link === "move" ? best : damage;
          }).forResult();
        if (choice.links?.[0] !== "move" || !cards.length) { plan.hurt = true; continue; }
        const selected = await from.chooseButton(["转转：选择移出的装备", cards], true)
          .set("ai", button => get.attitude(from, to) * get.value(button.link, to) / 5 - get.value(button.link, from)).forResult();
        plan.card = selected.links?.[0];
      }
      for (const { from, to, card, hurt } of plans) {
        if (!from.isIn()) continue;
        if (hurt) await from.damage(1, player);
        else if (card && to.isIn() && from.getCards("e").includes(card) && !to.isMin() && to.canEquip(card, false)) await to.equip(card);
      }
    },
    ai: { order: 7, result: { player(player) {
      return game.filterPlayer(target => target.countCards("e") > 0).reduce((sum, target) => sum + get.damageEffect(target, player, player), 0) > 0 ? 1 : 0;
    } } },
  },
};
