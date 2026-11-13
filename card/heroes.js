import { playCynoSound } from "./cyno-sound.js";
import { game, get, lib, ui } from "../../../noname.js";
import { heroFaces, sampleHeroes } from "./hero-data.js";

const self = { type: "trick", enable: true, selectTarget: -1, toself: true,
  filterTarget: (card, player, target) => player === target };
const equip = (subtype, value) => ({ type: "equip", subtype, enable: true, selectTarget: -1, toself: true, modTarget: true,
  filterTarget: (card, player, target) => player === target && target.canEquip(card, true),
  async content(event) { await event.target.equip(event.cards[0]); },
  ai: { order: 9, value, basic: { equipValue: value }, result: { target: 1 } },
});
export function fusionDefinition(names, subtype, definitions = lib.card, namespace) {
  const distance = {}, skills = [], onLose = [], onEquip = [];
  for (const name of names) {
    const info = definitions[name];
    for (const skill of info.skills || []) {
      let id = skill;
      if (namespace && lib.skill[skill]) {
        id = namespace + "_" + skill;
        lib.skill[id] = { ...(lib.skill[skill].fanFusionBase || lib.skill[skill]) };
        lib.translate[id] = lib.translate[skill] || lib.translate[name];
        lib.translate[id + "_info"] = lib.translate[skill + "_info"] || lib.translate[name + "_info"];
      }
      if (!skills.includes(id)) skills.push(id);
    }
    for (const [key, value] of Object.entries(info.distance || {})) {
      if (key === "attackFrom") distance[key] = Math.min(distance[key] || 0, value);
      else distance[key] = (distance[key] || 0) + value;
    }
    for (const [key, list] of [["onLose", onLose], ["onEquip", onEquip]]) {
      if (info[key]) list.push(...(Array.isArray(info[key]) ? info[key] : [info[key]]));
    }
  }
  return { ...equip(subtype, 8), derivation: "fan_cyno", destroy: "discardPile", fullskin: true,
    image: "ext:原神/image/card/fan_ronghe-framed.png", source: ["fan_ronghe", ...names],
    skills, distance, onLose, onEquip, forceDie: true };
}
export const heroCards = {
  fan_yingxiongderonghe: {
    ...self,
    async content(event, trigger, player) {
      const plan = sampleHeroes(), cards = [];
      for (const item of plan.filter(item => item.source === "pile")) {
        const candidates = Array.from(ui.cardPile.childNodes).filter(card => item.kind === "sha" ? card.name === "sha" : get.type(card) === "equip");
        const card = item.kind === "equip" ? candidates.randomGet() : candidates[0];
        if (card) { card.remove(); card.original = "c"; cards.push(card); }
        else cards.push(...get.cards(1));
      }
      game.updateRoundNumber();
      if (cards.length) await player.gain(cards, "draw");
      if (player.isIn()) await player.gain(plan.filter(item => item.source === "derived").map(item => game.createCard(item.name, ...heroFaces[item.name])), "draw");
    },
    ai: { order: 10, value: 10, useful: 10, result: { target: 5 } },
  },
  fan_xinyuzhouxia: { ...equip("equip4", 6), distance: { globalFrom: -1 } },
  fan_jueduilingdu: {
    ...equip("equip1", 9), distance: { attackFrom: -2 }, forceDie: true,
    async onLose(event, trigger, player) {
      const result = await player.chooseTarget("绝对零度：选择一名其他角色，弃置其所有手牌", (card, owner, target) => target !== owner)
        .set("prompt2", false).set("ai", target => -get.attitude(player, target) * target.countDiscardableCards(player, "h")).forResult();
      const target = result.targets?.[0];
      if (result.bool && target.isIn()) {
        const count = target.countDiscardableCards(player, "h");
        if (count) {
          playCynoSound("activate");
          await player.discardPlayerCard(target, "h", count, true);
        }
      }
    },
  },
  fan_shanguangxinyi: {
    ...self,
    async content(event, trigger, player) {
      const x = player.countCards("e");
      if (!x) return;
      await player.draw(x);
      if (!player.isIn() || !game.hasPlayer(target => target.countDiscardableCards(player, "hej") > 0)) return;
      const result = await player.chooseTarget("闪光新翼：选择弃牌目标", true, (card, owner, target) => target.countDiscardableCards(owner, "hej") > 0)
        .set("prompt2", `弃置至多${x}张牌`).set("ai", target => get.effect(target, {name:"guohe"}, player, player) * Math.min(x, target.countDiscardableCards(player,"hej"))).forResult();
      const target = result.targets?.[0];
      if (result.bool && target.isIn()) {
        const count = Math.min(x, target.countDiscardableCards(player, "hej"));
        if (count) await player.discardPlayerCard(target, "hej", count, true);
      }
    },
    ai: { order: 8, value: 8, useful: 5, result: { target: player => player.countCards("e") } },
  },
  fan_ronghe: {
    ...self,
    async content(event, trigger, player) {
      const choice = await player.chooseCard("hej", [0, 2], true, "融合：选择至多两张装备牌")
        .set("filterCard", card => get.type(card) === "equip")
        .set("ai", card => get.equipValue(card, player)).forResult();
      const selected = choice.cards || [];
      if (selected.length > 2 || !selected.every(card => player.getCards("hej").includes(card) && get.type(card) === "equip")) return;
      const slots = [1,2,3,4,5].filter(n => player.hasEnabledSlot(n));
      if (!slots.length) return;
      const slotNames = { 1: "武器栏", 2: "防具栏", 3: "防御坐骑栏", 4: "进攻坐骑栏", 5: "宝物栏" };
      const controls = slots.map(n => slotNames[n]);
      const result = await player.chooseControl(controls).set("prompt", "融合：选择装备栏").set("prompt2", false)
        .set("ai", () => controls[slots.findIndex(n => !player.getEquip(n))] || controls[0]).forResult();
      const slot = slots[controls.indexOf(result.control)];
      if (!slot || !player.hasEnabledSlot(slot) || !selected.every(card => player.getCards("hej").includes(card))) return;
      const names = selected.map(card => card.name), id = "fan_ronghe_" + get.id();
      game.broadcastAll((id, names, slot) => {
        // 每个客户端从自己的原生定义构造相同复合装备。
        lib.card[id] = lib.card.fan_ronghe.fanBuildDefinition(names, "equip" + slot, lib.card, id);
        lib.translate[id] = "融合";
        lib.translate[id + "_info"] = names.length ? "具有" + names.map(name => get.translation(name)).join("、") + "的效果。" : "无附加装备效果。";
      }, id, names, slot);
      const card = event.cards[0];
      card.init(["heart", 1, id]);
      await player.equip(card);
    },
    fanBuildDefinition: fusionDefinition,
    ai: { order: 7, value: 7, useful: 3, result: { target: player => player.countCards("hej", card => get.type(card) === "equip") ? 2 : 0 } },
  },
};
for (const [name, card] of Object.entries(heroCards)) Object.assign(card, {
  derivation: "fan_cyno", destroy: "discardPile", fullskin: true,
  image: `ext:原神/image/card/${name}-framed.png`,
});
export const heroTranslate = {
  fan_yingxiongderonghe: "英雄的融合", fan_yingxiongderonghe_info: "出牌阶段，对你自己使用。你随机获得五张【元素英雄】卡组相关的牌。",
  fan_ronghe: "融合", fan_ronghe_info: "出牌阶段，对你使用。选择你区域内至多两张装备牌，将此牌置入你的装备区，效果为那些装备牌的所有效果。",
  fan_xinyuzhouxia: "新宇宙侠", fan_xinyuzhouxia_info: "你计算与其他角色的距离-1。",
  fan_jueduilingdu: "绝对零度", fan_jueduilingdu_info: "当此牌离开你的装备区时，你可以选择一名其他角色，弃置其所有手牌。",
  fan_shanguangxinyi: "闪光新翼", fan_shanguangxinyi_info: "出牌阶段，对你使用。摸X张牌，然后弃置一名角色区域内X张牌（X为你装备区牌的数量）。",
};

