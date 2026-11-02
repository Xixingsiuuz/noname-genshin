import { game, get } from "../../../../noname.js";

// Each client queues native audio by its actual ended/error event, without delaying rules.
function speak(player, id) {
  game.broadcastAll((actor, skill) => {
    const prior = actor.fanNuowuAudio || Promise.resolve();
    actor.fanNuowuAudio = prior.then(() => new Promise(resolve => {
      const audio = game.trySkillAudio(skill, actor, true, true);
      if (!audio || audio.ended || audio.error) return resolve();
      audio.addEventListener("ended", resolve, { once: true });
      audio.addEventListener("error", resolve, { once: true });
    }));
  }, player, id);
}

function shouldDance(use, player) {
  let benefit = 0;
  for (const target of use.targets) {
    if (!target.isIn() || use.excluded?.includes(target)) continue;
    const effect = get.effect(target, use.card, player, player);
    benefit += effect * (target.hp >= player.hp ? 1.5 : 0.7);
  }
  // Transmitted damage retains the Sha attribution and can gain its own bonus.
  // Evaluate the additional bonus once per linked recipient, including allies/self.
  const nature = get.nature(use.card);
  if (nature && use.targets.some(target => target.isIn() && target.isLinked() && !use.excluded?.includes(target))) {
    for (const current of game.players) {
      if (!current.isIn() || !current.isLinked() || use.targets.includes(current) || current.hp < player.hp) continue;
      benefit += 0.5 * get.damageEffect(current, player, player, nature);
    }
  }
  // Losing HP is paid after the whole Sha, so 1 HP is safe; reassess every use.
  const cost = player.hp > 1 ? (player.hp === 2 ? 3 : 1.2) : 0;
  const followup = player.countCards("h", { name: "sha" }) > 0 ? 1 : 0;
  return benefit + followup > cost;
}
export default {
  fan_nuowu_start: { audio: "ext:原神/audio/xiao/skill:3" },
  fan_nuowu_damage: { audio: "ext:原神/audio/xiao/skill:3" },
  fan_nuowu: {
    audio: false, locked: false, direct: true,
    trigger: { player: "useCardToPlayered" },
    filter(event) { return event.card.name === "sha" && event.isFirstTarget; },
    async content(event, trigger, player) {
      const use = trigger.getParent("useCard");
      const result = await player.chooseBool("你可以发动【傩舞】")
        .set("prompt2", false).set("ai", () => shouldDance(use, player)).forResult();
      if (!result.bool || !player.isIn() || use.fan_nuowu) return;
      player.logSkill("fan_nuowu", use.targets, null, null, []);
      use.fan_nuowu = { player, voiced: false, settled: false };
      use.directHit.addArray(game.players);
      speak(player, "fan_nuowu_start");
    },
    group: ["fan_nuowu_damage_effect", "fan_nuowu_after"],
    ai: { effect: { player(card, player, target) {
      if (card.name !== "sha" || !target) return;
      const damage = get.damageEffect(target, player, player, get.nature(card));
      if (damage > 0) return [1, (target.hp >= player.hp ? 0.8 : 0.3) + (player.hp === 1 ? 0.4 : 0)];
    } } },
  },
  fan_nuowu_damage_effect: {
    audio: false, forced: true, popup: false, locked: false,
    trigger: { source: "damageBegin1" },
    filter(event, player) {
      const use = event.getParent("useCard");
      return event.card?.name === "sha" && use?.card === event.card
        && use.fan_nuowu?.player === player && event.player.hp >= player.hp;
    },
    async content(event, trigger, player) {
      trigger.num++;
      const state = trigger.getParent("useCard").fan_nuowu;
      if (!state.voiced) { state.voiced = true; speak(player, "fan_nuowu_damage"); }
    },
  },
  fan_nuowu_after: {
    audio: false, forced: true, popup: false, locked: false,
    trigger: { player: "useCardAfter" },
    filter(event, player) { return event.fan_nuowu?.player === player && !event.fan_nuowu.settled; },
    async content(event, trigger, player) {
      trigger.fan_nuowu.settled = true;
      if (!player.isIn() || player.hp <= 1) return;
      await player.loseHp();
      if (!player.isIn()) return;
      await player.draw();
      if (!player.isIn()) return;
      player.addTempSkill("fan_nuowu_quota", ["phaseChange", "phaseAfter", "phaseBeforeStart"]);
      player.addMark("fan_nuowu_quota", 1, false);
    },
  },
  fan_nuowu_quota: {
    charlotte: true, locked: false, onremove: true,
    mod: { cardUsable(card, player, num) { if (card.name === "sha") return num + player.countMark("fan_nuowu_quota"); } },
  },
  fan_jiangmo: {
    audio: "ext:原神/audio/xiao/skill:2", locked: true, forced: true,
    trigger: { source: "dieAfter" },
    mod: { maxHandcardBase(player) { return player.maxHp; } },
    filter(event, player) { return player.isIn(); },
    async content(event, trigger, player) {
      await player.recover();
      if (player.isIn()) await player.draw(2);
    },
    ai: { threaten: 1.3 },
  },
};
