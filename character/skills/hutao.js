import { lib, game, ui, get, _status } from "../../../../noname.js";

const voicePath = "ext:原神/audio/hutao/skill:";
const phaseOf = event => {
  const phase = event.getParent("phaseUse", true);
  return phase?.player === event.player ? phase : null;
};
const uses = (player, phase) => player.getHistory("custom", entry => entry.fan_qiyun_phase === phase && entry.fan_qiyun_used).length;
// cards2 excludes judgment cards in 1.11.6; Wangsheng covers all discarded regional cards.
const customerCount = event => Math.min(3, (event.cards || event.cards2 || []).filter(card => !card.destroyed).length);
function matchingCards(player, use) {
  const used = new Set(player.getHistory("useCard").map(event => get.name(event.card, player)));
  // useCard history already includes this use. Save only facts at the specified useCard timing.
  used.add(get.name(use.card, player));
  const type = get.type2(use.card, player), length = get.cardNameLength(use.card, player);
  const available = [...ui.cardPile.childNodes, ...ui.discardPile.childNodes];
  return available.filter(card => get.type2(card, player) === type
    && get.cardNameLength(card, player) === length && !used.has(get.name(card, player)));
}
function voiceState(player) {
  let state = player.getHistory("custom", entry => entry.fan_hutao_voice)[0];
  if (!state) player.getHistory("custom").push(state = { fan_hutao_voice: true, customers: [] });
  return state;
}
export function nextQiyunVoice(player, random = list => list.randomGet()) {
  if (!player.storage.fan_qiyun_intro_played) {
    player.storage.fan_qiyun_intro_played = true;
    return "fan_qiyun_intro";
  }
  return random(["fan_qiyun_sun", "fan_qiyun_morning", "fan_qiyun_name", "fan_qiyun_hilichurl", "fan_qiyun_ningguang"]);
}
function playQiyun(player, id) {
  game.broadcastAll((speaker, skill) => {
    // Only this requested pool bypasses the native one-second identical-file guard.
    // Native playback still handles volume, the voice switch and replay recording.
    for (const file of get.Audio.skill({ skill, player: speaker }).fileList) {
      _status.skillaudio.remove(file.replace(/^ext:/, "extension/"));
    }
    game.trySkillAudio(skill, speaker, true, true);
  }, player, id);
}

export default {
  fan_qiyun: {
    audio: false, locked: false, forced: true,
    trigger: { player: "useCard" },
    filter(event, player) {
      const phase = phaseOf(event);
      return !!phase && uses(player, phase) < player.getDamagedHp() && matchingCards(player, event).length > 0;
    },
    async content(event, trigger, player) {
      const phase = phaseOf(trigger);
      if (!phase || !player.isIn() || uses(player, phase) >= player.getDamagedHp()) return;
      const pool = matchingCards(player, trigger);
      if (!pool.length) return;
      player.getHistory("custom").push({ fan_qiyun_used: true, fan_qiyun_phase: phase });
      const card = pool.randomGet();
      // Mandatory activation passed its live checks. Speak before the gain animation.
      playQiyun(player, nextQiyunVoice(player));
      await player.gain(card, "gain2");
    },
    ai: {
      threaten: 1.5,
      effect: { player(card, player) {
        const phase = get.event().getParent("phaseUse", true);
        if (!phase || phase.player !== player || uses(player, phase) >= player.getDamagedHp()) return;
        const pool = matchingCards(player, { card });
        if (!pool.length) return;
        // Acquisition is mandatory: evaluate both helpful and harmful pools when choosing a card to use.
        const mean = pool.reduce((sum, item) => sum + get.value(item, player), 0) / pool.length;
        const pressure = player.needsToDiscard?.() > 0 ? 0.35 : 0;
        return [1, Math.max(-1.5, Math.min(1.5, mean / 8 - pressure))];
      } },
    },
  },
  fan_wangsheng: {
    audio: false, locked: true, forced: true, silent: true, firstDo: true, priority: 1000,
    trigger: { global: ["discardBefore", "loseBefore"] },
    group: ["fan_wangsheng_voice"],
    filter(event) {
      if (event.fan_wangsheng) return false;
      return event.name === "discard" ? !!event.cards?.length && (!event.position || event.position === ui.discardPile)
        : event.type === "discard" && !!event.cards?.length && event.position === ui.discardPile;
    },
    async content(event, trigger) {
      trigger.fan_wangsheng = true;
      if (trigger.name === "discard") {
        // Replace only the movement. Preserve callers' choices, results and continuation.
        trigger.position = ui.discardPile;
        trigger.name = "loseToDiscardpile";
        if (Array.isArray(trigger.protected_cards) && Array.isArray(trigger.skills)) {
          // modedDiscard has its own successful-result payload; keep that contract.
          trigger.setContent(async (event, trigger, player) => {
            await lib.element.content.loseToDiscardpile(event, trigger, player);
            event.result = { bool: event.cards.length > 0, cards: event.cards,
              skills: event.skills, protected_cards: event.protected_cards };
          });
        } else trigger.setContent("loseToDiscardpile");
      } else {
        trigger.type = "loseToDiscardpile";
        const parent = trigger.getParent();
        if (parent?.name === "loseAsync" && parent.type === "discard") parent.type = "loseToDiscardpile";
      }
    },
    subSkill: {
      voice: {
        locked: true, forced: true, silent: true, popup: false,
        trigger: { global: "loseAfter" },
        filter(event, player) {
          const replaced = event.fan_wangsheng || event.getParent()?.fan_wangsheng;
          const count = customerCount(event);
          return !!replaced && count > 0 && !voiceState(player).customers.includes(count);
        },
        async content(event, trigger, player) {
          const count = customerCount(trigger);
          const state = voiceState(player);
          if (state.customers.includes(count)) return;
          state.customers.push(count);
          player.logSkill("fan_wangsheng", trigger.player, null, null, []);
          game.trySkillAudio(`fan_wangsheng_customer${count}`, player, true);
        },
      },
    },
  },
  fan_youdie: {
    audio: false, locked: false, limited: true, skillAnimation: true, animationColor: "fire",
    trigger: { player: "dying" },
    prompt: "你可以发动【幽蝶】，将体力回复至1点", prompt2: false,
    filter(event, player) { return !player.storage.fan_youdie_used && player.hp < 1; },
    check: () => true,
    async content(event, trigger, player) {
      if (player.storage.fan_youdie_used || player.hp >= 1 || !player.isIn()) return;
      player.storage.fan_youdie_used = true;
      player.awakenSkill("fan_youdie");
      game.trySkillAudio("fan_youdie_burst", player, true);
      await player.recover(1 - player.hp);
      player.storage.fan_youdie_damage = true;
      player.addSkill("fan_youdie_damage");
    },
    ai: { save: true, skillTagFilter(player) { return !player.storage.fan_youdie_used; } },
  },
  fan_youdie_damage: {
    audio: false, locked: false, forced: true, popup: false, sub: true, sourceSkill: "fan_youdie",
    trigger: { source: "damageBegin1" },
    filter(event, player) {
      if (!player.storage.fan_youdie_damage || event.num <= 0 || !event.card || get.color(event.card, player) !== "red") return false;
      const use = event.getParent("useCard", true);
      return use?.player === player && use.card === event.card;
    },
    async content(event, trigger) { trigger.num++; },
  },
  ...Object.fromEntries(["intro", "sun", "morning", "name", "hilichurl", "ningguang"].map(id =>
    [`fan_qiyun_${id}`, { audio: voicePath + "true", charlotte: true }])),
  ...Object.fromEntries([1, 2, 3].map(n => [`fan_wangsheng_customer${n}`, { audio: voicePath + "true", charlotte: true }])),
  fan_youdie_burst: { audio: voicePath + "3", charlotte: true },
};
