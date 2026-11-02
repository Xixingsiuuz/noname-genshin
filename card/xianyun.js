import guozhan from "../../../card/guozhan.js";

export const mechanisms = [
  ["club", 12, "fan_pengrenshenji"], ["diamond", 6, "fan_zhuxing"],
  ["spade", 6, "fan_guizhongji"], ["heart", 12, "fan_chengehu"],
  ["heart", 3, "fan_taipingyaoshu"],
];
function treasure(name, skill, value) {
  return {
    type: "equip", subtype: "equip5", derivation: "fan_xianyun",
    fullskin: true, image: `ext:原神/image/card/${name}-mechanism.png`,
    enable: true, selectTarget: -1, toself: true, modTarget: true,
    filterTarget: (card, player, target) => player === target && target.canEquip(card, true),
    async content(event) { await event.target.equip(event.cards[0]); },
    skills: [skill],
    async onEquip(event) {
      // 本地 info.destroy 不接受回调；首次装备后标记实体牌。
      for (const card of event.card.cards || []) card._destroy = true;
    },
    ai: { basic: { equipValue: value }, order: 9, value, useful: 3, result: { target: 1 } },
  };
}
export const xianyunCards = {
  fan_pengrenshenji: treasure("fan_pengrenshenji", "fan_pengrenshenji_skill", 9),
  fan_zhuxing: treasure("fan_zhuxing", "fan_zhuxing_skill", 8),
  fan_guizhongji: treasure("fan_guizhongji", "fan_guizhongji_skill", 7),
  fan_chengehu: {
    ...treasure("fan_chengehu", "fan_chengehu_skill", 7),
    forceDie: true, loseDelay: false,
    async onLose(event, trigger, player) {
      const stored = (event.card.storages || []).filter(card => player.getCards("s").includes(card));
      event.card.storages = [];
      if (stored.length) await player.gain(stored, "gain2");
    },
  },
  fan_taipingyaoshu: {
    ...guozhan.card.taipingyaoshu, derivation: "fan_xianyun",
    global: undefined, skills: ["fan_taipingyaoshu_skill"],
    fullskin: true, image: "image/card/taipingyaoshu.png",
    async onLose(event, trigger, player) {
      await player.draw(2);
      if (player.hp > 1) await player.loseHp();
    },
  },
};
export const xianyunCardTranslate = {
  fan_pengrenshenji: "烹饪神机",
  fan_pengrenshenji_info: "锁定技，结束阶段，你摸两张牌并回复1点体力。当你受到伤害后，弃置此牌。<br>当此牌离开你的装备区时，将其销毁。",
  fan_zhuxing: "竹星",
  fan_zhuxing_info: "你可以将一张♦牌当【火杀】，♥牌当【桃】，♣牌当【闪】，♠牌当【无懈可击】使用或打出。<br>当此牌离开你的装备区时，将其销毁。",
  fan_guizhongji: "归终机",
  fan_guizhongji_info: "结束阶段，你可以视为使用一张无距离限制的【杀】，此【杀】指定目标后，你可以弃置一张黑色牌令此【杀】不可被【闪】响应。<br>当此牌离开你的装备区时，将其销毁。",
  fan_chengehu: "尘歌壶",
  fan_chengehu_info: "出牌阶段限一次，你可以将一张手牌扣置于你装备区的此牌下，然后摸一张牌。你可以将此装备牌下的牌如手牌般使用或打出。<br>当此牌离开你的装备区时，将其销毁，然后你获得此装备牌下的牌。",
  fan_taipingyaoshu: "太平要术",
  fan_taipingyaoshu_info: guozhan.translate.taipingyaoshu_info,
};
export const nativeTaipingSkill = guozhan.skill.taipingyaoshu;
for (const [, , name] of mechanisms) {
  xianyunCardTranslate[name + "_skill_info"] = xianyunCardTranslate[name + "_info"];
}
