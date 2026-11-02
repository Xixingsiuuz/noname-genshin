import { lib, game, get, ui } from "../../../../noname.js";

const soup = "fan_anshen_tang";

function lastCard(target) {
  const history = target.getHistory("useCard", evt => ["basic", "trick"].includes(get.type2(evt.card)));
  const card = history[history.length - 1]?.card;
  return card && { name: card.name, nature: card.nature, storage: { fan_chanyi: true } };
}

export default {
  fan_anshen_start_voice: { audio: "ext:原神/audio/mizuki/skill:2" },
  fan_anshen_give_voice: { audio: "ext:原神/audio/mizuki/skill:2" },
  fan_anshen_heal_voice: { audio: "ext:原神/audio/mizuki/skill:2" },
  fan_chanyi_voice: { audio: "ext:原神/audio/mizuki/skill:2" },

  fan_anshen: {
    audio: false,
    enable: "phaseUse",
    filter(event, player) {
      return game.hasPlayer(target => target !== player && !target.hasMark(soup));
    },
    filterTarget(card, player, target) {
      return target !== player && !target.hasMark(soup);
    },
    async content(event, trigger, player) {
      // 先支付体力；濒死救援结算后，仅向仍在场且仍符合条件的目标施加标记。
      await player.loseHp();
      const target = event.target;
      if (!target.isIn() || target.hasMark(soup)) return;
      target.addSkill(soup);
      target.addMark(soup, 1);
      target.storage.fan_anshen_voice_owner = player.playerid;
      game.trySkillAudio("fan_anshen_give_voice", player, true);
    },
    group: "fan_anshen_start",
    subSkill: {
      start: {
        trigger: { global: "phaseBefore", player: "enterGame" },
        forced: true,
        audio: false,
        filter(event) { return event.name !== "phase" || game.phaseNumber === 0; },
        async content(event, trigger, player) {
          player.storage.fan_anshen_self = true;
          player.addSkill(soup);
          if (!player.hasMark(soup)) {
            player.addMark(soup, 1);
            game.trySkillAudio("fan_anshen_start_voice", player, true);
          }
        },
      },
    },
    ai: {
      order: 6,
      result: {
        target(player, target) { return target.isDamaged() ? 2.5 : 1.5; },
        player(player) { return player.hp <= 1 ? -10 : player.hp === 2 ? -3 : -1; },
      },
    },
  },
  // 效果归标记持有者所有，施加者离场或失去安神不会清除已获得的汤。
  fan_anshen_tang: {
    audio: false,
    charlotte: true,
    marktext: "汤",
    onremove: true,
    intro: { content: "手牌上限+1；摸牌阶段多摸1张牌；结束阶段回复1点体力。其他角色受到伤害后失去此标记。" },
    mod: {
      maxHandcard(player, num) { if (player.hasMark(soup)) return num + 1; },
    },
    trigger: { player: ["phaseDrawBegin2", "phaseJieshuBegin", "damageEnd"] },
    forced: true,
    filter(event, player) {
      if (!player.hasMark(soup)) return false;
      if (event.name === "phaseDraw") return !event.numFixed;
      if (event.name === "damage") return event.num > 0 && !event.unreal && !player.storage.fan_anshen_self;
      return player.isDamaged();
    },
    async content(event, trigger, player) {
      if (trigger.name === "phaseDraw") trigger.num++;
      else if (trigger.name === "damage") player.removeSkill(soup);
      else {
        const before = player.hp;
        await player.recover();
        if (player.hp > before && !player.storage.fan_anshen_self) {
          const owner = [...game.players, ...game.dead].find(current => current.playerid === player.storage.fan_anshen_voice_owner);
          if (owner) game.trySkillAudio("fan_anshen_heal_voice", owner, true);
        }
      }
    },
  },
  fan_chanyi: {
    audio: false,
    trigger: { global: "phaseJieshuBegin" },
    direct: true,
    filter(event, player) {
      return event.player !== player && event.player.hasMark(soup)
        && player.countCards("hes") > 0 && !!lastCard(event.player);
    },
    async content(event, trigger, player) {
      const card = lastCard(trigger.player);
      if (!card) return;
      game.broadcastAll(card => { lib.skill.fan_chanyi_backup.viewAs = card; }, card);
      const next = player.chooseToUse();
      next.set("openskilldialog", `缠忆：将一张牌当${get.translation(card)}使用`);
      next.set("norestore", true);
      next.set("_backupevent", "fan_chanyi_backup");
      next.set("custom", { add: {}, replace: { window() {} } });
      next.backup("fan_chanyi_backup");
      next.set("manualConfirm", true);
      await next;
    },
    mod: {
      targetInRange(card) { if (card.storage?.fan_chanyi) return true; },
    },
    subSkill: {
      backup: {
        manualConfirm: true,
        position: "hes",
        selectCard: [0, 1],
        filterCard(card, player) {
          return game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;
        },
        filterOk() { return ui.selected.cards.length === 1; },
        check: card => 6 - get.value(card),
        popname: true,
        precontent(event, trigger, player) { player.logSkill("fan_chanyi"); game.trySkillAudio("fan_chanyi_voice", player, true); },
      },
    },
  },
};
