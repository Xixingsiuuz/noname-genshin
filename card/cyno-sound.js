import { game, get, lib } from "../../../noname.js";

export function playCynoSound(name) {
  if (!lib.config.background_audio) return;
  game.playAudio("ext:原神/audio/cyno/card", name + (name === "destroyed" ? ".wav" : ".ogg"));
}

function isCynoCard(card) {
  return lib.card[card?.name]?.derivation === "fan_cyno";
}

const played = new WeakSet();
const useSounds = new WeakSet();
export function playCynoUseSound(use) {
  if (useSounds.has(use)) return;
  useSounds.add(use);
  playCynoSound("set");
}
const equipConversion = /(?:^|_)fan_(?:kaiyiya|chongzhuangkaiyi)_(?:sha|shan)$/;

function equippedDerivation(player, skill) {
  if (!skill) return;
  return player.getVCards("e").find(card => lib.card[card.name]?.derivation &&
    game.expandSkills(get.skillsFromEquips([card])).includes(skill));
}

export function installDerivedEquipSubtitle() {
  const prototype = lib.element.Player.prototype;
  const animate = prototype.trySkillAnimate;
  if (animate.fanDerivedEquipSubtitle) return;
  function showSkill(skill, ...args) {
    const card = equippedDerivation(this, skill);
    if (card) return this.tryCardAnimate(card, card.name, "metal", true);
    return animate.call(this, skill, ...args);
  }
  showSkill.fanDerivedEquipSubtitle = true;
  prototype.trySkillAnimate = showSkill;
}

function playsUseSound(event) {
  return event.card?.name === "fan_yuzhouyaobian" ||
    event.player.getHistory("lose", loss => loss.getParent() === event &&
      loss.hs?.some(card => event.cards?.includes(card) && isCynoCard(card))).length > 0;
}

export const cynoSoundSkill = {
  charlotte: true, silent: true, forced: true, popup: false,
  trigger: { global: ["useCard1", "respond", "eventNeutralized"] },
  filter(event, player, timing) {
    if (played.has(event)) return false;
    if (timing === "eventNeutralized") {
      const counter = event._neutralize_event;
      return isCynoCard(event.card) || counter?.cards?.some(isCynoCard);
    }
    if (equipConversion.test(event.skill || "")) return true;
    if (timing !== "useCard1") return false;
    return playsUseSound(event);
  },
  async content(event, trigger) {
    if (played.has(trigger)) return;
    played.add(trigger);
    if (event.triggername === "eventNeutralized") playCynoSound("destroyed");
    else {
      if (event.triggername === "useCard1" && playsUseSound(trigger)) {
        playCynoUseSound(trigger);
      }
      if (equipConversion.test(trigger.skill || "")) {
        const card = equippedDerivation(trigger.player, trigger.skill);
        if (card) trigger.player.tryCardAnimate(card, card.name, "metal", true);
        playCynoSound("activate");
      }
    }
  },
};
