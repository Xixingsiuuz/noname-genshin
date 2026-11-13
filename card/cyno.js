import { gainCynoPackCards, createCynoReward } from "../ui/cyno-rarity.js";
import { playCynoSound } from "./cyno-sound.js";
import { game, get } from "../../../noname.js";
import { sampleDarkMagician } from "./qisheng-pool.js";

export const cynoCardFaces = Object.freeze({
  fan_heimoshumiyi: ["club", 13], fan_heimoshushi: ["club", 7],
  fan_heimodaozhen: ["club", 13], fan_yongyuanzhihun: ["club", 13],
  fan_modaoqishi: ["club", 8],
});

// 原生 Card.init 将 destroy:'discardPile' 写入实体的 destroyed。
// 因而不依赖武将、技能持有者或全局记录器。
const base = { derivation: "fan_cyno", destroy: "discardPile" };
const trick = { ...base, type: "trick", enable: true };
function equipment(subtype, skill) {
  return { ...base, type: "equip", subtype, skills: [].concat(skill), enable: true,
    selectTarget: -1, toself: true, modTarget: true,
    filterTarget: (card, player, target) => player === target && target.canEquip(card, true),
    async content(event) { await event.target.equip(event.cards[0]); },
    ai: { basic: { equipValue: 8 }, order: 9, value: 8, result: { target: 1 } },
  };
}
export const cynoCards = {
  fan_heimoshumiyi: {
    ...trick, selectTarget: -1, toself: true,
    filterTarget: (card, player, target) => player === target,
    async content(event, trigger, player) {
      const plan = sampleDarkMagician();
      const pileCards = [];
      for (const item of plan.filter(item => item.source === "pile")) {
          const card = get.cardPile2(card => card.name === item.name);
          // 与 get.cards 一样先从牌堆取出，避免同一实体被重复选中。
          if (card) { card.remove(); card.original = "c"; pileCards.push(card); }
          else pileCards.push(...get.cards(1));
      }
      game.updateRoundNumber();
      if (pileCards.length) await gainCynoPackCards(player, pileCards, "draw", (event.cards?.length === 1 ? event.cards[0] : event.card));
      if (!player.isIn()) return;
      const derived = plan.filter(item => item.source === "derived").map(item =>
        createCynoReward(game, (event.cards?.length === 1 ? event.cards[0] : event.card), item.name, ...cynoCardFaces[item.name]));
      if (derived.length) await gainCynoPackCards(player, derived, "draw");
    },
    ai: { order: 10, value: 10, useful: 10, result: { target: 5 } },
  },
  fan_heimoshushi: { ...base, type: "trick", global: "fan_heimoshushi_rule",
    ai: { value: 8, useful: 8 } },
  fan_modaoqishi: {
    ...base, type: "trick", global: ["fan_heimoshushi_rule", "fan_modaoqishi_reward"],
    ai: { value: 9, useful: 9 },
  },
  fan_yongyuanzhihun: { ...equipment("equip5", ["fan_yongyuanzhihun_skill", "fan_yongyuanzhihun_wuxie"]),
    forceDie: true, async onLose(event, trigger, player) { playCynoSound("addcounter"); await player.loseHp(); } },
  fan_heimodaozhen: equipment("equip2", "fan_heimodaozhen_skill"),
};
export const cynoCardTranslate = {
  fan_cyno: "赛诺",
  fan_heimoshushi_rule: "黑魔术师",
  fan_heimoshushi_rule_info: "将一张黑魔术师或魔导骑士当【无懈可击】使用。",
  fan_yongyuanzhihun_skill: "永远之魂",
  fan_yongyuanzhihun_wuxie: "永远之魂",
  fan_heimodaozhen_skill: "黑魔导阵",
  fan_heimoshumiyi: "黑魔术秘仪", fan_heimoshumiyi_info: "出牌阶段，对你自己使用。你随机获得五张【黑魔术师】卡组相关的牌。",
  fan_heimoshushi: "黑魔术师", fan_heimoshushi_info: "此牌不计入手牌上限，可以当【无懈可击】使用。",
  fan_modaoqishi: "魔导骑士", fan_modaoqishi_info: "此牌不计入手牌上限，可以当【无懈可击】使用。<br>你使用此牌后，获得技能" + get.poptip("fan_hongmo") + "。",
  fan_yongyuanzhihun: "永远之魂", fan_yongyuanzhihun_info: "每回合限一次，你可以将一张牌当任意一张锦囊牌使用，然后摸一张牌。<br>锁定技，此牌从装备区离开时，你失去1点体力。",
  fan_heimodaozhen: "黑魔导阵", fan_heimodaozhen_info: "出牌阶段限一次，你可以观看牌堆顶的三张牌，获得其中一张，将剩下的牌以任意顺序置于牌堆顶或牌堆底。",
  fan_modaoqishi_reward: "魔导骑士",
  fan_hongmo: "红魔", fan_hongmo_info: "每回合限一次，你可以将一张手牌当【无懈可击】使用，然后你使用下一张【杀】造成的伤害+1。",
  fan_hongmo_damage: "红魔",
};
for (const [name, card] of Object.entries(cynoCards)) {
  card.fullskin = true;
  card.image = `ext:原神/image/card/${name}-framed.png`;
}

