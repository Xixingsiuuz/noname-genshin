import { lib, game, get, _status } from "../../../../noname.js";

const phases = new Set(["phaseZhunbei", "phaseJudge", "phaseDraw", "phaseUse", "phaseDiscard", "phaseJieshu"]);
const phaseOf = event => event.getParent(parent => phases.has(parent.name), true);
const sealedTag = "fan_guiji_sealed";
const sword = card => ({ name: "sha", cards: [card], storage: { fan_jianliu: true } });
const canUseSword = (card, player) =>
  player.getCards("h").includes(card)
  && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false
  && lib.filter.cardEnabled(sword(card), player)
  && player.hasUseTarget(sword(card), false, true);

export default {
  fan_jianliu: {
    trigger: { player: "gainAfter", global: "loseAsyncAfter" },
    direct: true,
    filter(event, player) {
      if (player.storage.fan_xingmie && _status.currentPhase !== player) return false;
      const phase = phaseOf(event);
      if (!phase || phase.fan_jianliu_seen?.includes(player)) return false;
      const gained = event.getg?.(player) || [];
      if (!gained.length) return false;
      // 首次获牌即消耗机会；不依赖是否发动，也不把回合外多个阶段混为一次。
      const first = player.getHistory("gain", evt => phaseOf(evt) === phase)[0];
      if (first !== event && first?.getParent("loseAsync", true) !== event) return false;
      return true;
    },
    async content(event, trigger, player) {
      const phase = phaseOf(trigger);
      (phase.fan_jianliu_seen ||= []).push(player);
      const cards = trigger.getg(player).filter(card => canUseSword(card, player));
      if (!cards.length) return;
      // 原生转化牌选择流程：同屏选素材和目标，由引擎统一确认并使用。
      const next = player.chooseToUse({
        prompt: "剑流：将一张牌当【杀】使用",
        fan_jianliu_cards: cards,
        addCount: false,
        norestore: true,
        _backupevent: "fan_jianliu_backup",
        custom: { add: {}, replace: { window() {} } },
      });
      next.backup("fan_jianliu_backup");
      await next;
    },
    mod: {
      cardUsable(card) {
        if (card.name === "sha" && card.storage?.fan_jianliu) return Infinity;
      },
      targetInRange(card) {
        if (card.storage?.fan_jianliu) return true;
      },
    },
    subSkill: {
      backup: {
        audio: "ext:原神/audio/skirk/skill:3",
        sourceSkill: "fan_jianliu",
        position: "h",
        selectCard: 1,
        viewAs: { name: "sha", storage: { fan_jianliu: true } },
        filterCard(card, player) {
          return _status.event.fan_jianliu_cards.includes(card) && canUseSword(card, player);
        },
        filterTarget: lib.filter.filterTarget,
        check(card) { return 8 - get.value(card); },
        popname: true,
      },
    },
  },
  fan_guiji: {
    audio: "ext:原神/audio/skirk/skill:2",
    trigger: { player: "useCardToPlayered" },
    filter(event, player) {
      return (!player.storage.fan_xingmie || _status.currentPhase === player)
        && event.card.name === "sha" && event.target.isIn();
    },
    prompt: "归寂：是否令目标的非锁定技失效？",
    prompt2: false,
    check(event, player) { return get.attitude(player, event.target) < 0; },
    logTarget: "target",
    async content(event, trigger) {
      const target = trigger.target;
      if (!target.isIn()) return;
      target.addTempSkill("fan_guiji_silenced", { global: "phaseAfter" });
      // 绑定本次用牌事件及目标，避免其他杀、其他丝柯克或未发动封印的目标误触发扣牌。
      const use = trigger.getParent("useCard");
      const targets = use.fan_guiji_targets ||= [];
      if (!targets.includes(target)) targets.push(target);
    },
    group: "fan_guiji_capture",
    subSkill: {
      capture: {
        audio: "ext:原神/audio/skirk/skill:2",
        trigger: { player: "shaMiss" },
        locked: false,
        filter(event, player) {
          return (!player.storage.fan_xingmie || _status.currentPhase === player)
            && event.target.isIn() && event.target.countCards("h") > 0
            && event.getParent("useCard").fan_guiji_targets?.includes(event.target);
        },
        prompt: "归寂：是否扣置目标的所有手牌？",
        prompt2: false,
        check(event, player) { return get.attitude(player, event.target) < 0; },
        logTarget: "target",
        async content(event, trigger) {
          const target = trigger.target;
          if (!target.isIn() || !target.countCards("h")) return;
          // 目标独立持有效果：封印到期及丝柯克离场均不影响日后返还。
          target.addSkill(sealedTag);
          await target.addToExpansion({
            cards: target.getCards("h"), source: target, animate: "giveAuto",
            visible: false, gaintag: [sealedTag],
          });
        },
      },
    },
  },
  fan_guiji_silenced: {
    charlotte: true,
    init(player, skill) { player.addSkillBlocker(skill); },
    onremove(player, skill) { player.removeSkillBlocker(skill); },
    skillBlocker(skill, player) {
      // 沿用本地原生封印判定，保留锁定技及 charlotte、persevereSkill 等例外。
      return lib.skill.fengyin.skillBlocker(skill, player);
    },
    mark: true,
    marktext: "封",
    intro: { content: "非锁定技失效，直到当前回合结束。" },
  },
  fan_guiji_sealed: {
    charlotte: true,
    trigger: { player: "damageAfter" },
    forced: true,
    popup: false,
    filter(event, player) {
      return event.num > 0 && player.isIn() && player.getExpansions(sealedTag).length > 0;
    },
    async content(event, trigger, player) {
      // damageAfter 已在伤害扣血及濒死结算之后；死亡时引擎自动弃置 x 区。
      const cards = player.getExpansions(sealedTag);
      if (cards.length && player.isIn()) await player.gain(cards, "draw");
      if (!player.getExpansions(sealedTag).length) player.removeSkill(sealedTag);
    },
    marktext: "寂",
    intro: {
      markcount: "expansion",
      content(storage, player) {
        return `共有${player.getExpansions(sealedTag).length}张扣置牌，下次受到伤害后获得。`;
      },
      mark(dialog, storage, player) {
        const cards = player.getExpansions(sealedTag);
        if (player === game.me || player.isUnderControl()) dialog.addAuto(cards);
        else dialog.addText(`共有${cards.length}张扣置牌`);
      },
    },
    onremove(player) {
      const cards = player.getExpansions(sealedTag);
      if (cards.length) player.loseToDiscardpile(cards);
    },
  },
  fan_xingmie: {
    audio: "ext:原神/audio/skirk/skill:3",
    trigger: { player: "phaseZhunbeiBegin" },
    limited: true,
    skillAnimation: true,
    animationColor: "water",
    filter(event, player) { return !player.storage.fan_xingmie; },
    prompt: "星灭：是否强化【杀】并摸两张牌？",
    prompt2: false,
    check(event, player) { return player.hp <= 2 || game.countPlayer() <= 4; },
    async content(event, trigger, player) {
      player.awakenSkill("fan_xingmie");
      player.storage.fan_xingmie = true;
      player.syncStorage("fan_xingmie");
      player.addSkill("fan_xingmie_buff");
      // 先获得永久加伤，再摸牌；此次摸牌触发的剑流也享受加伤。
      await player.draw(2);
    },
  },
  fan_xingmie_buff: {
    charlotte: true,
    trigger: { source: "damageBegin1" },
    forced: true,
    filter(event) { return event.card?.name === "sha"; },
    async content(event, trigger) { trigger.num++; },
    mark: true,
    marktext: "灭",
    intro: { content: "【杀】造成的伤害+1；【剑流】和【归寂】只能于自己的回合内发动。" },
  },
};
