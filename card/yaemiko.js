import { game, get, _status } from "../../../noname.js";

// 实体衍生牌：不设 vanish/destroy，不加入初始牌堆；使用后正常进入弃牌堆。
export const yaemikoCards = {
  fan_meirenji: {
    fullskin: true, image: "ext:原神/image/card/fan_meirenji.png",
    derivation: "fan_yaemiko", type: "trick", enable: true,
    filterTarget: (card, player, target) => target !== player && target.hasSex("male") && target.countCards("h") > 0,
    async content(event, trigger, player) {
      const target = event.target;
      const women = game.filterPlayer(current => current.hasSex("female")).sortBySeat(_status.currentPhase || player);
      for (const current of women) {
        if (!target.isIn() || !player.isIn()) break;
        if (!current.isIn() || !target.countCards("h")) continue;
        await current.gainPlayerCard(target, true, "h");
        // 女性使用者也获得目标手牌；交给自己无需再次选牌或移动。
        if (current === player || !current.isIn() || !player.isIn() || !current.countCards("h")) continue;
        const result = await current.chooseCard("h", true, `美人计：交给${get.translation(player)}一张手牌`)
          .set("prompt2", false).forResult();
        const card = result.cards?.[0];
        if (result.bool && current.isIn() && player.isIn() && current.getCards("h").includes(card)) await current.give([card], player);
      }
      if (!target.isIn() || !player.isIn()) return;
      const difference = target.countCards("h") - player.countCards("h");
      if (difference > 0) await target.damage(1, player);
      else if (difference < 0) await player.damage(1, target);
    },
    ai: { order: 6, result: { target: -1 } },
  },
  fan_xiaolicangdao: {
    fullskin: true, image: "ext:原神/image/card/fan_xiaolicangdao.png",
    derivation: "fan_yaemiko", type: "trick", enable: true,
    filterTarget: (card, player, target) => target !== player,
    async content(event, trigger, player) {
      const target = event.target;
      const num = Math.max(0, Math.min(5, target.maxHp - target.hp));
      if (num) await target.draw(num);
      if (target.isIn()) await target.damage(1, player);
    },
    ai: { order: 6, tag: { damage: 1 }, result: { target: (player, target) => Math.min(5, target.maxHp - target.hp) - 2 } },
  },
};
export const yaemikoCardTranslate = {
  fan_meirenji: "美人计",
  fan_meirenji_info: "出牌阶段，对一名有手牌的其他男性角色使用。每名女性角色各获得其一张手牌并将一张手牌交给你，然后比较你与其的手牌数，手牌少的角色对手牌多的角色造成1点伤害。",
  fan_xiaolicangdao: "笑里藏刀",
  fan_xiaolicangdao_info: "出牌阶段，对一名其他角色使用。该角色摸X张牌（X为其已损失的体力值且至多为5），然后你对其造成1点伤害。",
};
