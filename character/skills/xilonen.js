import { lib, game, get, ui } from "../../../../noname.js";

const effects = ["fan_duanyin_draw", "fan_duanyin_hand", "fan_duanyin_sha"];
const hasEffects = target => effects.some(skill => target.countMark(skill) > 0);
const canForge = player => !player.storage.fan_zhuhun
  && game.countPlayer() > 1 && game.hasPlayer(hasEffects);

function addEffect(target, skill, count) {
  if (!count) return;
  target.addSkill(skill);
  target.addMark(skill, count, false);
}

// 按选择顺序区分受益者与来源；第一名必须存在另一名可复制的角色。
function forgeTarget(card, player, target) {
  const selected = ui.selected.targets;
  if (!selected.length) return game.hasPlayer(current => current !== target && hasEffects(current));
  return target !== selected[0] && hasEffects(target);
}

function forge(player, targets) {
  if (!targets || targets.length !== 2 || !canForge(player)) return;
  const [target, source] = targets;
  if (target === source || !target.isIn() || !source.isIn() || !hasEffects(source)) return;
  // 复制时取快照，之后不与来源同步；独立增益不随锻音移除。
  const counts = effects.map(skill => source.countMark(skill));
  player.awakenSkill("fan_zhuhun");
  player.logSkill("fan_zhuhun", [source, target]);
  player.removeSkill("fan_duanyin");
  effects.forEach((skill, index) => addEffect(target, skill, counts[index]));
}

export default {
  fan_duanyin: {
    trigger: { player: "phaseJieshuBegin" },
    direct: true,
    filter(event, player) { return player.countDiscardableCards(player, "he") > 0; },
    async content(event, trigger, player) {
      // 选择阶段不移动牌；任一步取消都不支付代价、不结算效果。
      // 使用原生牌与目标选择界面，由引擎控制未选齐时确认按钮的禁用状态。
      const choice = await player.chooseCardTarget({
        position: "he",
        selectCard: 1,
        selectTarget: 1,
        filterCard: lib.filter.cardDiscardable,
        filterTarget: true,
        forced: false,
        prompt: get.prompt("fan_duanyin"),
        prompt2: "弃牌令角色获得增益",
        ai1: card => 7 - get.value(card),
        ai2: target => get.attitude(player, target) * (target.isDamaged() ? 2 : 1),
      }).forResult();
      if (!choice.bool) return;
      const target = choice.targets[0];
      const result = await player.chooseControl("摸牌数+1", "手牌上限+1", "出杀次数+1", "cancel2")
        .set("prompt", `锻音：为${get.translation(target)}选择增益`)
        .set("ai", () => 0).forResult();
      if (result.control === "cancel2" || !effects[result.index]) return;
      // 最终确认后再检查并支付代价，避免选择期间状态变化导致非法弃牌。
      if (!target.isIn() || !choice.cards.every(card => player.getCards("he").includes(card)
        && lib.filter.cardDiscardable(card, player, "fan_duanyin"))) return;
      player.logSkill("fan_duanyin", target);
      await player.discard(choice.cards);
      if (!target.isIn()) return;
      await target.recover();
      if (!target.isIn()) return;
      addEffect(target, effects[result.index], 1);
    },
  },
  fan_duanyin_draw: {
    charlotte: true,
    marktext: "音",
    intro: { content: "摸牌阶段摸牌数+#" },
    trigger: { player: "phaseDrawBegin2" },
    forced: true,
    filter(event) { return !event.numFixed; },
    async content(event, trigger, player) { trigger.num += player.countMark("fan_duanyin_draw"); },
  },
  fan_duanyin_hand: {
    charlotte: true,
    marktext: "音",
    intro: { content: "手牌上限+#" },
    mod: { maxHandcard(player, num) { return num + player.countMark("fan_duanyin_hand"); } },
  },
  fan_duanyin_sha: {
    charlotte: true,
    marktext: "音",
    intro: { content: "出牌阶段使用【杀】的次数上限+#" },
    mod: {
      cardUsable(card, player, num) {
        if (card.name === "sha") return num + player.countMark("fan_duanyin_sha");
      },
    },
  },
  fan_zhuhun: {
    enable: "phaseUse",
    limited: true,
    skillAnimation: true,
    animationColor: "orange",
    // 禁用 useSkill 的自动日志动画，统一在确认并复核目标后播放一次。
    log: false,
    filter(event, player) { return canForge(player); },
    selectTarget: 2,
    complexTarget: true,
    multitarget: true,
    targetprompt: ["获得增益", "增益来源"],
    prompt: "铸魂：依次选择受益角色和增益来源",
    filterTarget: forgeTarget,
    async content(event, trigger, player) { forge(player, event.targets); },
    group: "fan_zhuhun_dying",
    subSkill: {
      dying: {
        trigger: { player: "dying" },
        direct: true,
        filter(event, player) { return canForge(player); },
        async content(event, trigger, player) {
          const result = await player.chooseTarget(
            "铸魂：选择受益角色和增益来源", 2, forgeTarget
          ).set("complexTarget", true)
            .set("targetprompt", ["获得增益", "增益来源"])
            .set("ai", target => ui.selected.targets.length
              ? effects.reduce((sum, skill) => sum + target.countMark(skill), 0)
              : get.attitude(player, target)).forResult();
          if (result.bool) forge(player, result.targets);
        },
      },
    },
    ai: {
      order: 1,
      result: {
        target(player, target) {
          return ui.selected.targets.length ? 0 : get.attitude(player, target);
        },
      },
    },
  },
};
