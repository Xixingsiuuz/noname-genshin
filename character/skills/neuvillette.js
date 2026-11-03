import { game, get, ui } from "../../../../noname.js";

const mark = "fan_yilong";
export default {
  fan_yilong_voice: { audio: "ext:原神/audio/neuvillette/skill:3" },
  fan_shenpan_voice: { audio: "ext:原神/audio/neuvillette/skill:3" },
  fan_yilong: {
    audio: false,
    locked: true,
    marktext: "龙",
    intro: { name: "龙权", content: "mark", max: 9 },
    onremove: true,
    group: ["fan_yilong_gain", "fan_yilong_damage"],
    subSkill: {
      gain: {
        trigger: { global: ["gainAfter", "loseAsyncAfter"] },
        forced: true,
        filter(event, player) {
          if (player.countMark(mark) >= 9) return false;
          return game.hasPlayer(target => target !== player &&
            event.getg?.(target)?.length > 0 &&
            event.getParent("phaseDraw", true)?.player !== target);
        },
        async content(event, trigger, player) {
          player.addMark(mark, Math.min(game.filterPlayer(target => target !== player &&
            trigger.getParent("phaseDraw", true)?.player !== target)
            .reduce((sum, target) => sum + (trigger.getg?.(target)?.length || 0), 0),
            9 - player.countMark(mark)));
          game.trySkillAudio("fan_yilong_voice", player, true, true);
        },
      },
      damage: {
        trigger: { global: "damageSource" },
        forced: true,
        filter(event, player) {
          return player.countMark(mark) < 9 &&
            event.num > 0 && !!event.source && event.source !== player &&
            event.getParent("phaseDraw", true)?.player !== event.source;
        },
        async content(event, trigger, player) {
          player.addMark(mark, Math.min(trigger.num, 9 - player.countMark(mark)));
          game.trySkillAudio("fan_yilong_voice", player, true, true);
        },
      },
    },
  },
  fan_shenpan: {
    audio: false,
    enable: "phaseUse",
    usable: 2,
    direct: true,
    filter(event, player) { return player.countMark(mark) > 0 && game.hasPlayer(p => p !== player); },
    selectCard: -1,
    filterCard: () => false,
    delay: false,
    async content(event, trigger, player) {
      // 原生联合选择：标记数与目标在同一界面确认。
      const choices = [1, 2, 3].filter(n => n <= player.countMark(mark))
        .map(n => [n, "移除" + n + "个龙权"]);
      const result = await player.chooseButtonTarget({
        createDialog: ["审判：选择移除标记数和一名其他角色", [choices, "textbutton"]],
        // 引擎先检查按钮再检查目标；允许暂不选数量，最终由 filterOk 统一校验。
        selectButton: [0, 1],
        selectTarget: 1,
        filterOk() {
          return ui.selected.buttons.length === 1 && ui.selected.targets.length === 1;
        },
        canHidden: false,
        filterTarget(card, player, target) { return target !== player; },
        ai1(button) { return button.link; },
        ai2(target) { return -get.attitude(get.player(), target); },
      }).forResult();
      const num = result.links?.[0], target = result.targets?.[0];
      if (!result.bool || ![1, 2, 3].includes(num) || !target ||
          target === player || !target.isIn() || player.countMark(mark) < num) {
        // 取消选择不消耗本阶段的发动次数。
        player.getStat("skill").fan_shenpan--;
        return;
      }
      player.line(target, "green");
      player.removeMark(mark, num);
      game.trySkillAudio("fan_shenpan_voice", player, true, true);
      // custom 历史由引擎按回合分组，额外出牌阶段也计入本回合。
      player.getHistory("custom").push({ skill: "fan_shenpan", removed: num });
      const discarded = await target.chooseToDiscard("审判：弃置" + num + "张牌，或受到1点无来源伤害", num, "he")
        .set("ai", card => 6 - get.value(card))
        .forResult();
      if (!discarded.bool && target.isIn()) await target.damage(1, "nosource");
    },
    ai: { order: 8, result: { player: 1 } },
  },
  fan_leiyu: {
    audio: "ext:原神/audio/neuvillette/skill:2",
    trigger: { player: "phaseJieshuBegin" },
    direct: true,
    filter(event, player) {
      return player.getHistory("custom").reduce((sum, entry) =>
        sum + (entry.skill === "fan_shenpan" ? entry.removed || 0 : 0), 0) >= 6;
    },
    async content(event, trigger, player) {
      const result = await player.chooseTarget("泪雨：可令一名角色增加1点体力上限，回复1点体力")
        .set("ai", target => get.attitude(player, target) + (target.isDamaged() ? 2 : 0))
        .forResult();
      if (!result.bool) return;
      const target = result.targets[0];
      player.logSkill("fan_leiyu", target);
      await target.gainMaxHp(1);
      if (target.isIn()) await target.recover(1);
    },
  },
};
