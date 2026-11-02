import { game, get, _status } from "../../../../noname.js";

// One shared E pool: choose on the authoritative client, then use native broadcast audio.
export function jeanVoice(player, heal = false) {
  let index;
  if (heal) index = [1, 2, 3].randomGet();
  else {
    const now = Date.now();
    const previous = player.storage.fan_jean_voice;
    index = [1, 2, 3].filter(i => !previous || now - previous.time >= 8000 || i !== previous.index).randomGet();
    player.storage.fan_jean_voice = { index, time: now };
  }
  game.trySkillAudio(heal ? `fan_shiya_heal${index}` : `fan_fengya_voice${index}`, player);
}
function used(player, target) {
  const state = player.storage.fan_shiya;
  return state?.round === game.roundNumber && state.targets.includes(target.playerid);
}
export function emptyTargets(event, player) {
  return game.filterPlayer(target => target.isIn() && !used(player, target)
    && !target.countCards("h") && event.getl(target)?.hs?.length > 0)
    .sortBySeat(_status.currentPhase || player);
}
export function shiyaValues(player, target) {
  return [get.effect(target, { name: "draw" }, player, player)
    + (target.isDamaged() ? get.recoverEffect(target, player, player) : 0),
    get.damageEffect(target, player, player)];
}
const voices = {};
for (let i = 1; i <= 3; i++) {
  voices[`fan_fengya_voice${i}`] = { audio: `ext:原神/audio/jean/skill/fan_fengya_voice${i}.mp3` };
  voices[`fan_shiya_heal${i}`] = { audio: `ext:原神/audio/jean/skill/fan_shiya_heal${i}.mp3` };
}
export default {
  ...voices,
  fan_fengya: {
    audio: false, direct: true, locked: false,
    trigger: { player: "useCardToPlayer" },
    filter(event) { return event.card.name === "sha" && event.target.isIn() && event.getParent().targets.includes(event.target); },
    async content(event, trigger, player) {
      const target = trigger.target, use = trigger.getParent();
      const result = await player.chooseBool(`你可以对${get.translation(target)}发动【风压】`)
        .set("prompt2", false).set("ai", () => {
          const cancel = -get.effect(target, trigger.card, player, player);
          const lock = -get.attitude(player, target) * Math.min(4, target.countCards("h")) * .8;
          const follow = !used(player, target) && target.countCards("h") ? Math.max(0, ...shiyaValues(player, target)) : 0;
          return cancel + lock + follow > 0;
        }).forResult();
      if (!result.bool || !player.isIn() || !target.isIn() || !use.targets.includes(target)) return;
      player.logSkill("fan_fengya", target, null, null, []);
      use.targets.remove(target);
      use.triggeredTargets1.remove(target);
      jeanVoice(player);
      const cards = target.getCards("h");
      if (!cards.length) return;
      target.addSkill("fan_fengya_store");
      const next = target.addToExpansion(cards, target, "giveAuto");
      next.gaintag.add("fan_fengya_store");
      await next;
    },
    ai: { effect: { player(card, player, target) {
      if (card.name !== "sha" || !target || !target.countCards("h")) return;
      const lock = -get.attitude(player, target) * Math.min(4, target.countCards("h")) * .8;
      const follow = !used(player, target) ? Math.max(0, ...shiyaValues(player, target)) : 0;
      return [1, Math.max(0, lock + follow - get.damageEffect(target, player, player, get.nature(card)))];
    } } },
  },
  // Persistent consequence on the affected character, independent of Jean's skill.
  fan_fengya_store: {
    charlotte: true, forced: true, popup: false, audio: false,
    trigger: { global: "phaseAfter" },
    filter(event, player) { return player.getExpansions("fan_fengya_store").length > 0; },
    async content(event, trigger, player) {
      if (!player.isIn()) return;
      const card = player.getExpansions("fan_fengya_store").randomGet();
      if (card) await player.gain(card, "draw");
      if (!player.getExpansions("fan_fengya_store").length) player.removeSkill("fan_fengya_store");
    },
    marktext: "压",
    intro: { markcount: "expansion", mark(dialog, storage, player) {
      const cards = player.getExpansions("fan_fengya_store");
      if (player === game.me || player.isUnderControl()) dialog.addAuto(cards);
      else return `共有${get.cnNumber(cards.length)}张扣置牌`;
    } },
    onremove(player) { const cards = player.getExpansions("fan_fengya_store"); if (cards.length) player.loseToDiscardpile(cards); },
  },
  fan_shiya: {
    audio: false, direct: true, locked: false,
    trigger: { global: ["loseAfter", "gainAfter", "equipAfter", "addJudgeAfter", "loseAsyncAfter", "addToExpansionAfter"] },
    filter(event, player) { return emptyTargets(event, player).length > 0; },
    async content(event, trigger, player) {
      const targets = emptyTargets(trigger, player);
      for (const target of targets) {
        if (!player.isIn()) break;
        if (!target.isIn() || used(player, target) || target.countCards("h")) continue;
        const values = shiyaValues(player, target);
        const result = await player.chooseControl("摸牌回血", "造成伤害", "取消")
          .set("prompt", `你可以对${get.translation(target)}发动【狮牙】`).set("prompt2", false)
          .set("ai", () => values.every(n => n <= 0) ? 2 : values[0] >= values[1] ? 0 : 1).forResult();
        const choice = result.control;
        if (!["摸牌回血", "造成伤害"].includes(choice) || !player.isIn() || !target.isIn() || used(player, target) || target.countCards("h")) continue;
        if (player.storage.fan_shiya?.round !== game.roundNumber) player.storage.fan_shiya = { round: game.roundNumber, targets: [] };
        player.storage.fan_shiya.targets.push(target.playerid);
        player.logSkill("fan_shiya", target, null, null, []);
        jeanVoice(player, choice === "摸牌回血");
        if (choice === "造成伤害") await target.damage(1, player);
        else {
          await target.draw();
          if (target.isIn()) await target.recover();
        }
      }
    },
    ai: { threaten: 1.6 },
  },
};
