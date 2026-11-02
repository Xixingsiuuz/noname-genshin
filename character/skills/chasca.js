import { get } from "../../../../noname.js";

// 比较防止伤害、摸牌和暂时放弃调停的收益；只影响 AI，不限制玩家操作。
function xixinValue(target, player, num = 1, nature) {
  const damage = get.damageEffect(target, player, player, nature) * num;
  const draw = 2 * get.effect(target, { name: "draw" }, player, player);
  const cost = player.hasSkill("fan_tiaoting")
    && player.countDiscardableCards(player, "h") > 0 ? 3 : 0;
  return draw - damage - cost;
}

function tiaotingValue(trigger, player) {
  let value = -get.effect(trigger.target, trigger.card, trigger.player, player);
  for (const target of [trigger.player, trigger.target]) {
    // 熄心不再能防止自伤；不主动以濒死赌救援。
    if (target === player && player.hp <= 1 && !(player.hujia > 0)) return -Infinity;
    const damage = get.damageEffect(target, player, player);
    value += damage;
    if (target !== player && player.hasSkill("fan_xixin")) {
      value += Math.max(0, xixinValue(target, player));
    }
  }
  return value;
}

export default {
  fan_tiaoting: {
    audio: "ext:原神/audio/chasca/skill:2",
    locked: false,
    trigger: { global: "useCardToTarget" },
    direct: true,
    filter(event, player) {
      const use = event.getParent();
      return !player.hasSkill("fan_tiaoting_blocked") && !use.all_excluded
        && use.targets?.length === 1 && use.targets[0] === event.target
        && event.target.isIn() && get.tag(event.card, "damage") > 0
        && player.countDiscardableCards(player, "h") > 0;
    },
    async content(event, trigger, player) {
      if (player.hasSkill("fan_tiaoting_blocked")) return;
      const source = trigger.player, target = trigger.target;
      const result = await player.chooseToDiscard("h", 1,
        "调停：弃置一张手牌？"
      ).set("prompt2", false).set("ai", card =>
        tiaotingValue(trigger, player) - Math.max(0, get.value(card))
      ).forResult();
      if (!result.bool) return;
      player.logSkill("fan_tiaoting", source === target ? [source] : [source, target]);
      trigger.getParent().all_excluded = true;
      // 两次独立伤害，前一次的濒死和死亡完整结算后再进行下一次。
      // 不去重：使用者与目标相同时，仍依次受到两次伤害。
      for (const current of [source, target]) {
        if (current.isIn()) await current.damage(1, player);
      }
    },
    subSkill: {
      blocked: {
        charlotte: true,
        mark: true,
        marktext: "停",
        intro: { content: "【调停】暂时失效，直到本轮结束或者你下次受到伤害后。" },
        init(player) { player.disableSkill("fan_tiaoting_blocked", "fan_tiaoting"); },
        onremove(player) { player.enableSkill("fan_tiaoting_blocked"); },
        trigger: { player: "damageEnd", global: "roundEnd" },
        forced: true,
        popup: false,
        firstDo: true,
        filter(event, player, name) { return name === "roundEnd" || event.num > 0; },
        async content(event, trigger, player) {
          player.removeSkill("fan_tiaoting_blocked");
        },
      },
    },
  },
  fan_xixin: {
    audio: "ext:原神/audio/chasca/skill:3",
    locked: false,
    trigger: { source: "damageBegin4" },
    direct: true,
    filter(event, player) {
      return event.num > 0 && event.player !== player && event.player.isIn();
    },
    async content(event, trigger, player) {
      const target = trigger.player;
      if (target === player || !target.isIn() || trigger.num <= 0) return;
      const result = await player.chooseBool(
        get.prompt("fan_xixin", target)
      ).set("prompt2", false)
        .set("ai", () => xixinValue(target, player, trigger.num, trigger.nature) > 0).forResult();
      if (!result.bool) return;
      player.logSkill("fan_xixin", target);
      trigger.cancel();
      await target.draw(2);
      player.addSkill("fan_tiaoting_blocked");
    },
  },
};
