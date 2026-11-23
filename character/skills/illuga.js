import { lib, game, get, ui, _status } from "../../../../noname.js";

export function causedDamage(use) {
  return game.players.concat(game.dead).some(target => target.getAllHistory("damage", damage =>
    damage.num > 0 && damage.card === use.card && damage.getParent("useCard") === use).length > 0);
}
export default {
  fan_xunye: {
    audio: false, locked: false, direct: true,
    trigger: { global: "useCardToTargeted" },
    filter: event => event.card.name === "sha" && event.target.isIn(),
    group: "fan_xunye_settle",
    async content(event, trigger, player) {
      const use = trigger.getParent("useCard"), target = trigger.target;
      const records = use.fan_xunye_records || (use.fan_xunye_records = []);
      if (records.some(record => record.owner === player && record.target === target)) return;
      const record = { owner: player, target, count: 0 };
      records.push(record);
      const result = await player.chooseToDiscard("he", [1, 2], "巡夜：你可以弃置至多两张牌")
        .set("prompt2", false).set("ai", card => {
          const gift = target !== player && player.inRange(target);
          const friend = get.attitude(player, target) > 0;
          const attackFriend = use.player === player || get.attitude(player, use.player) > 0;
          // This is support: never pay cards to an enemy for speculative later rewards.
          if (gift && !friend) return -1 - Math.max(0, get.value(card));
          if (use.player === player && !friend) return -1 - Math.max(0, get.value(card));
          // Re-evaluate every material against all remaining targets and current resources.
          const likelyMiss = use.targets.every(current => !current.isIn()
            || get.effect(current, use.card, use.player, use.player) <= 0
            || current.mayHaveShan(use.player, "use"));
          // Keep enough actually usable Shan after this candidate discard.
          const args = { ...use.customArgs?.default, ...use.customArgs?.[player.playerid] };
          const required = Math.max(1, args.shanRequired || 1);
          const forcedHit = use.directHit?.includes(player) || args.directHit || args.directHit2
            || use.player.hasSkillTag("directHit_ai", true, { target: player, card: use.card }, true);
          const safeSelf = target === player && !forcedHit && !causedDamage(use)
            && player.getCards("hs").filter(shan => shan !== card && !ui.selected.cards.includes(shan)
              && get.name(shan, player) === "shan" && lib.filter.cardEnabled(shan, player, "forceEnable")).length >= required
            && use.targets.every(current => current === player || !current.isIn()
              || (!use.directHit?.includes(current) && current.mayHaveShan(use.player, "use")));
          const canPunish = use.player !== player && use.player.isIn() && use.player.countDiscardableCards(player, "he") > 0;
          const exchange = target === player ? (safeSelf ? 7 + (!attackFriend && canPunish ? 2 : attackFriend && canPunish ? -4 : 0) : 0) : likelyMiss ? 5 + (!attackFriend && canPunish ? 2 : attackFriend && canPunish ? -4 : 0) : 0;
          return Math.max(gift && friend ? 8 : 0, exchange) - get.value(card);
        }).forResult();
      if (!result.bool) return;
      record.count = result.cards.length;
      player.logSkill("fan_xunye", target);
      if (target.isIn() && target !== player && player.inRange(target)) {
        const cards = result.cards.filter(card => get.position(card) === "d");
        if (cards.length) await target.gain(cards, "gain2");
      }
    },
    subSkill: {
      settle: {
        audio: false, locked: false, forced: true, popup: false,
        trigger: { global: "useCardAfter" },
        filter: (event, player) => event.fan_xunye_records?.some(record => record.owner === player),
        async content(event, trigger, player) {
          const records = trigger.fan_xunye_records.filter(record => record.owner === player);
          trigger.fan_xunye_records = trigger.fan_xunye_records.filter(record => record.owner !== player);
          const damaged = causedDamage(trigger);
          const targets = records.map(record => record.target).sortBySeat(_status.currentPhase || player);
          for (const target of targets) {
            if (!player.isIn()) break;
            const record = records.find(record => record.target === target);
            if (damaged) {
              if (!target.isIn()) continue;
              const result = await player.chooseBool(`巡夜：令${get.translation(target)}摸一张牌？`)
                .set("prompt2", false).set("ai", () => get.attitude(player, target) > 0).forResult();
              if (result.bool && target.isIn() && player.isIn()) {
                player.logSkill("fan_xunye", target);
                await target.draw();
              }
            } else if (record.count) {
              await player.draw(record.count);
              if (player.isIn() && trigger.player.isIn() && trigger.player.countDiscardableCards(player, "he")) {
                await player.discardPlayerCard(trigger.player, "he", record.count, true);
              }
            }
          }
        },
      },
    },
  },
  fan_tuoshen: {
    audio: false, locked: false, direct: true,
    trigger: { target: "useCardToTarget" },
    filter(event, player) {
      const use = event.getParent("useCard");
      return player.storage.fan_tuoshen_round !== game.roundNumber && use.targets.includes(player) && use.targets.length > 1;
    },
    async content(event, trigger, player) {
      const use = trigger.getParent("useCard");
      const result = await player.chooseBool("脱身：取消你这个目标并摸两张牌？").set("prompt2", false)
        .set("ai", () => 2 * get.effect(player, { name: "draw" }, player, player)
          - get.effect(player, trigger.card, trigger.player, player) > 0).forResult();
      if (!result.bool || !player.isIn() || !lib.skill.fan_tuoshen.filter(trigger, player)) return;
      player.storage.fan_tuoshen_round = game.roundNumber;
      player.logSkill("fan_tuoshen");
      use.targets.remove(player);
      await player.draw(2);
    },
    ai: {
      effect: {
        target(card, source, target) {
          if (target.storage.fan_tuoshen_round === game.roundNumber) return;
          // Only the actual selected target list proves this is a multiple-target use.
          const targets = _status.event?.targets;
          if (targets?.includes(target) && targets.length > 1 && get.tag(card, "damage")) return [0, 2];
        },
      },
    },
  },
};
