// 太平要术原生定义快照：本地 v1.11.6 card/guozhan.js。
// 避免旧引擎 game.import 异步注册及牌包缓存清理影响扩展加载。
import { game, get } from "../../../noname.js";
export default {card:{taipingyaoshu:{
      audio: true,
      fullskin: true,
      type: "equip",
      subtype: "equip2",
      bingzhu: ["张角", "庄周"],
      cardcolor: "heart",
      nomod: true,
      nopower: true,
      unique: true,
      global: ["g_taipingyaoshu_ai"],
      skills: ["taipingyaoshu"],
      ai: {
        equipValue(card, player) {
          if (player.hasSkill("wendao")) {
            return 9;
          }
          if (game.hasPlayer((current) => current.hasSkill("wendao") && get.attitude(player, current) <= 0)) {
            return 1;
          }
          return 6;
        },
        basic: {
          equipValue: 6
        }
      },
      filterLose(card, player) {
        if (player.hasSkillTag("unequip2")) {
          return false;
        }
        return true;
      },
      loseDelay: false,
      async onLose(event, trigger, player) {
        player.addTempSkill("taipingyaoshu_lose");
      }
    }},skill:{taipingyaoshu:{
      equipSkill: true,
      mod: {
        maxHandcard(player, num) {
          if (get.mode() === "guozhan") {
            if (player.hasSkill("hongfa", null, null, false)) {
              num += player.getExpansions("huangjintianbingfu").length;
            }
            return num + game.countPlayer((current) => current.isFriendOf(player));
          }
          return num + game.countGroup() - 1;
        }
      },
      trigger: { player: "damageBegin4" },
      filter(event, player) {
        if (player.hasSkillTag("unequip2")) {
          return false;
        }
        if (event.source && event.source.hasSkillTag("unequip", false, {
          name: event.card ? event.card.name : null,
          target: player,
          card: event.card
        })) {
          return false;
        }
        if (event.nature) {
          return true;
        }
      },
      forced: true,
      async content(event, trigger, player) {
        trigger.cancel();
      },
      ai: {
        nofire: true,
        nothunder: true,
        effect: {
          target(card, player, target, current) {
            if (target.hasSkillTag("unequip2")) {
              return;
            }
            if (player.hasSkillTag("unequip", false, {
              name: card ? card.name : null,
              target,
              card
            }) || player.hasSkillTag("unequip_ai", false, {
              name: card ? card.name : null,
              target,
              card
            })) {
              return;
            }
            if (get.tag(card, "natureDamage")) {
              return "zeroplayertarget";
            }
            if (card.name === "tiesuo") {
              return 0.01;
            }
          }
        }
      }
}},translate:{taipingyaoshu_info: "锁定技。①当你即将受到属性伤害时，取消之。②你的手牌上限+X（X为场上势力数-1）。③当你失去装备区里的【太平要术】时，你摸两张牌，然后若你的体力值大于1，你失去1点体力。",}};
