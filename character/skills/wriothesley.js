import { game, get, _status } from "../../../../noname.js";

const choices = ["非锁定技失效", "失去体力", "用牌后结束阶段", "交出获得牌"];
const harmed = (target, player) => target.hasAllHistory("sourceDamage", e => e.player === player && e.num > 0);
const phaseOf = () => _status.event.getParent("phaseUse");

export default {
  fan_dianyu: {
    audio: "ext:原神/audio/wriothesley/skill:2",
    enable: "phaseUse",
    locked: false,
    filter(event, player) {
      const phase = phaseOf();
      return !!phase && !phase.fan_dianyu_stop && game.hasPlayer(target =>
        target !== player && !phase.fan_dianyu_targets?.includes(target));
    },
    selectCard: -1,
    filterCard: () => false,
    filterTarget(card, player, target) {
      const phase = phaseOf();
      return target !== player && !!phase && !phase.fan_dianyu_stop &&
        !phase.fan_dianyu_targets?.includes(target);
    },
    selectTarget: 1,
    manualConfirm: true,
    prompt: "典狱：选择一名本阶段未选择过的其他角色",
    prompt2: false,
    async content(event, trigger, player) {
      const target = event.target, phase = event.getParent("phaseUse");
      if (!phase || phase.fan_dianyu_stop || phase.fan_dianyu_targets?.includes(target) || target === player || !target.isIn()) return;
      ((phase.fan_dianyu_targets ?? (phase.fan_dianyu_targets = []))).push(target);
      if (!harmed(target, player)) phase.fan_dianyu_stop = true;
      const result = await target.chooseControl(choices)
        .set("prompt", "典狱：选择一项")
        .set("prompt2", false)
        .set("ai", () => {
          const friendly = get.attitude(target, player) > 0;
          const costs = [
            target.getSkills(null, false, false).filter(id => !get.is.locked(id, target)).length * 1.5,
            target.hp <= 1 ? 100 : target.hp <= 2 ? 7 : 3,
            Math.max(1, target.countCards("h") * 0.7),
            friendly ? 0.5 : 5
          ];
          return costs.indexOf(Math.min(...costs));
        }).forResult();
      if (!target.isIn()) return;
      if (result.index === 0) target.addTempSkill("fan_dianyu_seal", { player: "phaseAfter" });
      if (result.index === 1) {
        target.addTempSkill("fan_dianyu_hand", { player: "phaseAfter" });
        target.addMark("fan_dianyu_hand", 1, false);
        await target.loseHp(1);
      }
      if (result.index === 2) {
        target.addTempSkill("fan_dianyu_end", { player: "phaseAfter" });
        target.markAuto("fan_dianyu_end", [player]);
      }
      if (result.index === 3) {
        target.addTempSkill("fan_dianyu_draw", { player: "phaseAfter" });
        target.markAuto("fan_dianyu_draw", [player]);
      }
    },
    ai: { order: 9, result: { target: -1, player(player, target) { return harmed(target, player) ? 0.5 : 0; } } },
    subSkill: {
      end_voice: { audio: "ext:原神/audio/wriothesley/skill:2" },
      gain_voice: { audio: "ext:原神/audio/wriothesley/skill:2" },
      seal: { inherit: "fengyin", charlotte: true },
      hand: {
        charlotte: true, onremove: true, marktext: "狱",
        intro: { content: "手牌上限减少#" },
        mod: { maxHandcard(player, num) { return num - player.countMark("fan_dianyu_hand"); } }
      },
      end: {
        audio: false, charlotte: true, forced: true, popup: false, onremove: true,
        trigger: { player: "useCardAfter" },
        filter(event, player) { return event.getParent("phaseUse", true)?.player === player; },
        async content(event, trigger, player) {
          const phase = trigger.getParent("phaseUse");
          if (phase.skipped) return;
          phase.skipped = true;
          for (const source of player.getStorage("fan_dianyu_end").slice().sortBySeat(_status.currentPhase || player)) {
            if (source.isIn()) game.trySkillAudio("fan_dianyu_end_voice", source, true);
          }
        }
      },
      draw: {
        audio: false,
        charlotte: true, onremove: true, mark: true,
        intro: { content: "摸牌阶段获得牌后，将这些牌交给$，持续至自己的回合结束" },
        trigger: { player: "gainAfter" },
        forced: true, popup: false,
        filter(event, player) {
          return event.getParent("phaseDraw", true)?.player === player &&
            !event.getParent("fan_dianyu_draw", true) &&
            player.getStorage("fan_dianyu_draw").some(source => source.isIn()) &&
            event.cards.some(card => get.owner(card) === player);
        },
        async content(event, trigger, player) {
          const sources = player.getStorage("fan_dianyu_draw").slice().sortBySeat(_status.currentPhase || player);
          for (const source of sources) {
            if (!source.isIn()) continue;
            const cards = trigger.cards.filter(card => get.owner(card) === player);
            if (!cards.length) break;
            await source.gain(cards, player, "giveAuto");
            if (cards.some(card => get.owner(card) === source)) game.trySkillAudio("fan_dianyu_gain_voice", source, true);
          }
        }
      }
    }
  }
};
