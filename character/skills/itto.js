import { game, lib, _status } from "../../../../noname.js";

export default {
  fan_guiwang_damage: { audio: "ext:原神/audio/itto/skill:true" },
  fan_guiwang_hurt: { audio: "ext:原神/audio/itto/skill:2" },
  fan_guiwang_move: { audio: ["ext:原神/audio/itto/skill/fan_guiwang_move1.ogg", "ext:原神/audio/itto/skill/fan_guiwang_move2.ogg"] },
  fan_yongyi_lose: { audio: "ext:原神/audio/itto/skill:3" },
  fan_guiwang: {
    audio: "ext:原神/audio/itto/skill:2",
    logAudio: () => false,
    chargeSkill: 5,
    locked: false,
    forced: true,
    trigger: { player: "damageEnd", source: "damageSource" },
    async content(event, trigger, player) {
      // 每点分别结算，避免多点伤害只执行一次；满蓄力仍执行选项。
      const voiced = new Set();
      const speak = id => { if (!voiced.has(id)) { game.trySkillAudio(id, player, true); voiced.add(id); } };
      for (let i = 0; i < trigger.num && player.isIn(); i++) {
        const chargeBefore = player.countCharge();
        player.addCharge(1);
        // 读取实际触发分支，兼容自伤时分别触发受伤与伤害来源的情况。
        if (player.countCharge() > chargeBefore) {
          speak(event.triggername === "damageSource" ? "fan_guiwang_damage" : "fan_guiwang_hurt");
        }
        const movable = player.canMoveCard(null, true);
        const full = player.countCharge() >= player.getMaxCharge();
        const choices = ["摸牌"];
        if (movable) choices.push("移动装备");
        if (movable && full) choices.push("背水");
        const choice = choices.length === 1 ? choices[0] : (await player.chooseControl(choices)
          .set("prompt", "鬼王：选择一项")
          .set("prompt2", false).set("ai", () => choices.includes("背水") ? "背水" : "摸牌").forResult()).control;
        if (choice === "背水") speak("fan_guiwang");
        if (choice === "摸牌" || choice === "背水") await player.draw();
        if ((choice === "移动装备" || choice === "背水") && player.isIn() && player.canMoveCard(null, true)) {
          const move = player.moveCard({ nojudge: true, forced: true, prompt: "鬼王：移动一张装备牌" });
          // 原生 moveCard 在最终选牌确认后创建 equip 子事件；此时尚未执行装备效果。
          move.pushHandler("onNextEquip", (equip, { state }) => {
            if (state === "begin") speak("fan_guiwang_move");
          });
          await move;
        }
        if (choice === "背水" && player.isIn()) await player.draw();
      }
    },
  },
  fan_yongyi: {
    audio: "ext:原神/audio/itto/skill:4",
    logAudio: () => false,
    enable: "phaseUse",
    usable: 1,
    locked: false,
    filter(event, player) { return player.countCards("h") > 0; },
    filterTarget(card, player, target) { return player !== target && player.canCompare(target); },
    async content(event, trigger, player) {
      const target = event.target;
      if (!player.canCompare(target)) return;
      const compare = player.chooseToCompare(target);
      let announced = false;
      compare.pushHandler("onNextShowCards", (show, { state }) => {
        if (state === "begin" && !announced) {
          game.trySkillAudio("fan_yongyi", player, true);
          announced = true;
        }
      });
      const result = await compare.forResult();
      // 平局双方均没赢，次数在惩罚（可能引发嵌套伤害）前返还。
      if (!result.bool) player.getStat("skill").fan_yongyi--;
      if (result.cancelled || typeof result.num1 !== "number" || typeof result.num2 !== "number") return;
      if (!result.bool) game.trySkillAudio("fan_yongyi_lose", player, true);
      const losers = result.num1 === result.num2 ? [player, target] : [result.bool ? target : player];
      losers.sortBySeat(_status.currentPhase || player);
      for (const loser of losers) {
        if (!loser.isIn()) continue;
        const other = loser === player ? target : player;
        const canDiscard = loser.countCards("e", card => lib.filter.cardDiscardable(card, loser, "fan_yongyi")) > 0;
        let discard = false;
        if (canDiscard) discard = (await loser.chooseControl("弃置装备", "受到伤害")
          .set("prompt", "勇仪：选择一项").set("prompt2", false).set("ai", () => "弃置装备").forResult()).control === "弃置装备";
        if (discard) await loser.chooseToDiscard("e", 1, true).set("prompt", "勇仪：弃置一张装备牌");
        else await loser.damage(1, other.isIn() ? other : "nosource");
      }
    },
    ai: { order: 6, result: { target: -1 } },
  },
};
