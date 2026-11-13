import { playCynoSound } from "./cyno-sound.js";
import { game, get } from "../../../noname.js";
import { blueEyesFaces } from "./blue-eyes-data.js";

export function sampleBlueEyes(random = Math.random) {
  const roll = () => { const n = random(); if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError("随机数须在[0,1)内"); return n; };
  const count = roll() < .5 ? 2 : 3, result = [];
  for (let i = 0; i < count; i++) result.push({ source: "pile", name: roll() < 2 / 3 ? "sha" : "jiu" });
  for (let i = count; i < 5; i++) {
    let name = ["fan_qingyanbailong", "fan_zhengyihuoban", "fan_baizhishaonv"][Math.floor(roll() * 3)];
    if (name === "fan_zhengyihuoban" && roll() < 1 / 3) name = "fan_zhengyichuanshuo";
    result.push({ source: "derived", name });
  }
  return result;
}
export function createBlueEyes() { return game.createCard("fan_qingyanbailong", ...blueEyesFaces.fan_qingyanbailong); }
const self = { type: "trick", enable: true, selectTarget: -1, toself: true,
  filterTarget: (card, player, target) => player === target };
const partner = {
  ...self,
  async content(event, trigger, player) {
    player.addTempSkill("fan_zhengyi_quota");
    player.addMark("fan_zhengyi_quota", 3, false);
    if (event.card.name === "fan_zhengyichuanshuo") await player.gain(Array.from({ length: 3 }, createBlueEyes), "draw");
  },
  ai: { order: 9, value: 6, useful: 3, result: { target(player) { return player.countCards("h", card => card.name === "sha" || card.name === "fan_qingyanbailong") > 0 ? 1 : .1; } } },
};
export const blueEyesCards = {
  fan_qingyanlonghonglin: {
    ...self,
    async content(event, trigger, player) {
      const plan = sampleBlueEyes(), cards = [];
      for (const item of plan.filter(item => item.source === "pile")) {
        const card = get.cardPile2(card => card.name === item.name);
        if (card) { card.remove(); card.original = "c"; cards.push(card); }
        else cards.push(...get.cards(1));
      }
      game.updateRoundNumber();
      if (cards.length) await player.gain(cards, "draw");
      if (!player.isIn()) return;
      await player.gain(plan.filter(item => item.source === "derived").map(item => game.createCard(item.name, ...blueEyesFaces[item.name])), "draw");
    },
    ai: { order: 10, value: 10, useful: 10, result: { target: 5 } },
  },
  fan_qingyanbailong: { type: "trick", global: "fan_qingyanbailong_rule", ai: { value: 6, useful: 5 } },
  fan_zhengyihuoban: partner,
  fan_zhengyichuanshuo: { ...partner, ai: { ...partner.ai, value: 9, result: { target: 3 } } },
  fan_baizhishaonv: {
    type: "equip", subtype: "equip2", skills: ["fan_baizhishaonv_skill"], enable: true, selectTarget: -1, toself: true, modTarget: true,
    filterTarget: (card, player, target) => target === player && target.canEquip(card, true),
    async content(event) { await event.target.equip(event.cards[0]); },
    ai: { order: 9, value: 8, useful: 3, basic: { equipValue: 8 }, result: { target: 1 } },
  },
};
for (const [name, card] of Object.entries(blueEyesCards)) Object.assign(card, {
  derivation: "fan_cyno", destroy: "discardPile", fullskin: true,
  image: `ext:原神/image/card/${name}-framed.png`,
});
export const blueEyesTranslate = {
  fan_qingyanlonghonglin: "青眼龙轰临", fan_qingyanlonghonglin_info: "出牌阶段，对你使用。你随机获得五张【青眼白龙】卡组相关的牌。",
  fan_qingyanbailong: "青眼白龙", fan_qingyanbailong_info: "此牌不计入手牌上限，可以当【杀】使用或打出。",
  fan_zhengyihuoban: "正义伙伴", fan_zhengyihuoban_info: "出牌阶段，对你使用。你本回合可以多使用三张【杀】。",
  fan_zhengyichuanshuo: "正义传说", fan_zhengyichuanshuo_info: "出牌阶段，对你使用。你本回合可以多使用三张【杀】，获得三张" + get.poptip("fan_qingyanbailong") + "。",
  fan_baizhishaonv: "白之少女", fan_baizhishaonv_info: "每回合限一次，当你成为一名角色使用牌的目标时，获得一张" + get.poptip("fan_qingyanbailong") + "。",
  fan_qingyanbailong_rule: "青眼白龙", fan_baizhishaonv_skill: "白之少女", fan_zhengyi_quota: "正义",
};
export const blueEyesSkills = {
  fan_qingyanbailong_rule: {
    locked: false, enable: ["chooseToUse", "chooseToRespond"], position: "h", selectCard: 1,
    prompt: "选择一张青眼白龙当【杀】使用或打出", prompt2: false,
    filterCard: card => card.name === "fan_qingyanbailong", viewAs: { name: "sha" },
    viewAsFilter: player => player.countCards("h", card => card.name === "fan_qingyanbailong") > 0,
    check: card => 7 - get.value(card),
    mod: {
      ignoredHandcard(card) { if (card.name === "fan_qingyanbailong") return true; },
      cardDiscardable(card, player, name) { if (name === "phaseDiscard" && card.name === "fan_qingyanbailong") return false; },
    },
    ai: { respondSha: true, skillTagFilter: player => player.countCards("h", card => card.name === "fan_qingyanbailong") > 0 },
  },
  fan_zhengyi_quota: { charlotte: true, onremove: true, mod: { cardUsable(card, player, num) { if (card.name === "sha") return num + player.countMark("fan_zhengyi_quota"); } } },
  fan_baizhishaonv_used: { charlotte: true },
  fan_baizhishaonv_skill: {
    equipSkill: true, forced: true, locked: false, trigger: { target: "useCardToTarget" },
    filter(event, player) {
      return !player.hasSkill("fan_baizhishaonv_used") && event.getParent().targets.includes(player);
    },
    async content(event, trigger, player) {
      if (!player.isIn() || !blueEyesSkills.fan_baizhishaonv_skill.filter(trigger, player)) return;
      playCynoSound("addcounter");
      player.addTempSkill("fan_baizhishaonv_used");
      await player.gain(createBlueEyes(), "draw");
    },
  },
};
