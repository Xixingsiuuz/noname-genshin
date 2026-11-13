import { selectConversionMaterial } from "../../ui/conversion-material.js";
import { game, get, lib, ui, _status } from "../../../../noname.js";

const stages = ["获得手牌", "造成伤害", "摸两张牌"];
const stage = player => player.storage.fan_jingwu_index || 0;
const evaluatingBonus = new WeakSet();
// 与本地 SP 赵云 chongzhen.logTarget 相同；不从外层/最近用牌猜测来源。
function opponent(event) {
  if (event.name === "respond") return event.source;
  if (event.card.name === "sha") return event.targets?.[0];
  return event.respondTo?.[0];
}
function material(card, player) {
  return get.type(card, null, player) === "equip"
    && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;
}
function materialCost(card, player) {
  const equipped = player.getCards("e").includes(card);
  return equipped ? get.equipValue(card, player) : get.value(card, player);
}
function bonus(player, target) {
  if (evaluatingBonus.has(player)) return 0;
  evaluatingBonus.add(player);
  try {
  let value = stage(player) === 2 ? 2 : 0;
  if (target?.isIn()) {
    if (stage(player) === 0 && target.countGainableCards(player, "h") > 0) {
      value += 1 - get.attitude(player, target) / 5;
    }
    if (stage(player) === 1) value += get.damageEffect(target, player, player) / 6;
    if (!target.isLinked()) value += get.effect(target, { name: "tiesuo" }, player, player) / 10;
  }
  return value;
  } finally {
    evaluatingBonus.delete(player);
  }
}
function projectedChain(card, player, target) {
  if (!target?.isIn() || target.isLinked() || !game.hasNature(card, "linked")
    || player.hasSkill("wutiesuolian_skill") || player.hasSkill("jueqing")
    || player.hasSkill("gangzhi") || target.hasSkill("gangzhi")) return 0;
  // 精武会先把未横置目标连环。原生 canLink 此时还看不到将来的状态，补估其余横置角色；
  // linking 参数保留原生响应/防伤估值并防止递归传导及精武收益重复计入。
  return game.filterPlayer(current => current !== target && current.isLinked()).reduce((sum, current) =>
    sum + get.effect(current, card, player, player, { source: target }), 0);
}
function conversion(name) {
  return {
    audio: false, locked: false,
    enable: ["chooseToUse", "chooseToRespond"],
    position: "he", selectCard: [0, 1],
    filterCard: material,
    filterOk: () => ui.selected.cards.length === 1,
    viewAs: { name },
    viewAsFilter: player => player.hasCard(card => material(card, player), "he"),
    prompt: `精武：将一张装备牌当【${name === "sha" ? "杀" : "闪"}】使用或打出`,
    prompt2: false, manualConfirm: true, fanPairedConfirm: true,
    check(card) {
      const player = _status.event.player;
      const target = ui.selected.targets[0] || _status.event.source || _status.event.respondTo?.[0];
      return 7 + bonus(player, target) - materialCost(card, player);
    },
    ai: {
      respondSha: name === "sha", respondShan: name === "shan",
      skillTagFilter: player => player.hasCard(card => material(card, player), "he"),
      order: () => get.order({ name }) + 0.2,
      effect: {
        player(card, player, target, current, linking) {
          if (linking || evaluatingBonus.has(player) || card.name !== name) return;
          if (![ `fan_jingwu_${name}`, `fan_jingwu_${name}_backup` ].includes(_status.event.skill)
            || !ui.selected.cards.some(c => material(c, player))) return;
          return [1, bonus(player, target) + projectedChain(card, player, target) / 5];
        },
      },
    },
  };
}
function attackChoices(event, player) {
  return get.inpileVCardList(([, , name]) => name === "sha").filter(([, , name, nature]) =>
    event.filterCard({ name, nature, isCard: true }, player, event));
}
function attackConversion() {
  const base = conversion("sha");
  return {
    audio: false, locked: false, direct: true,
    enable: base.enable,
    onChooseToRespond(event) {
      if (event.skill !== "fan_jingwu_sha_backup" || !event.isMine() || event.fan_jingwu_submitPending) return;
      event.fan_jingwu_submitPending = true;
      // 原生本步在 game.check 后仍可能 pause；待本步完成后再提交，兼容自动确认关闭。
      setTimeout(() => {
        delete event.fan_jingwu_submitPending;
        if (_status.event !== event || event.skill !== "fan_jingwu_sha_backup" || event.result?.card
          || !event.isMine()) return;
        const info = lib.skill.fan_jingwu_sha_backup;
        if (!info?.viewAsFilter(event.player)) return;
        const filter = event._backup?.filterCard;
        if (typeof filter !== "function" || !filter(info.viewAs, event.player, event)) return;
        if (!game.check() || _status.event !== event || event.skill !== "fan_jingwu_sha_backup"
          || event.result?.card || !info.viewAsFilter(event.player) || !info.filterOk()) return;
        ui.confirm?.close();
        if (event.skillDialog === true) event.skillDialog = false;
        ui.click.ok();
      }, 0);
    },
    filter: (event, player) => base.viewAsFilter(player) && attackChoices(event, player).length > 0,
    chooseButton: {
      dialog: (event, player) => ui.create.dialog("精武：选择装备牌和杀的属性", [attackChoices(event, player), "vcard"]),
      select: [0, 1],
      filter() {
        const event = _status.event;
        selectConversionMaterial(event, game, ui, _status, "he", (card, player) =>
          player.getCards("he").includes(card) && material(card, player)
          && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false,
          (button, card, player) => (event.getParent().type === 'phase' ? player.getUseValue({name: 'sha', nature: button.link[3]}) : 8) + 3 - materialCost(card, player));
        return true;
      },
      filterOk() {
        const event = _status.event;
        const card = ui.selected.cards[0];
        const valid = ui.selected.buttons.length === 1 && ui.selected.cards.length === 1
          && event.filterCard(card, event.player);
        event.getParent().fanConversionCard = valid ? card : undefined;
        return valid;
      },
      check(button) {
        const player = get.player();
        if (!Array.isArray(button.link)) return 8 - materialCost(button.link, player);
        // 打出杀没有待选用牌目标，不拿主动出牌次数/距离估值否定必要响应。
        if (_status.event.getParent().name === "chooseToRespond") return button.link[3] ? 5 : 5.1;
        const card = { name: "sha", nature: button.link[3] };
        // 比较属性时就纳入精武预先连环的收益/队友受波及的代价。
        const targets = game.filterPlayer(target => player.canUse(card, target, true, true));
        return targets.length ? Math.max(...targets.map(target => get.effect(target, card, player, player)
          + bonus(player, target) * 5 + projectedChain(card, player, target))) : player.getUseValue(card);
      },
      backup(links) {
        const card = _status.event.fanConversionCard;
        delete _status.event.fanConversionCard;
        const nature = links.find(Array.isArray)?.[3];
        const valid = player => player.getCards("he").includes(card) && material(card, player);
        return { ...conversion("sha"), enable: undefined, direct: false,
          manualConfirm: _status.event.name !== "chooseToRespond",
          // 原生自动选中唯一素材，保留 ui.selected.cards 供方天画戟等读取；只再选择目标。
          selectCard: -1,
          filterCard: (selected, player) => selected === card && valid(player),
          viewAsFilter: valid,
          filterOk: () => ui.selected.cards.length === 1 && ui.selected.cards[0] === card && valid(_status.event.player),
          viewAs: { name: "sha", nature } };
      },
      prompt: () => "精武：选择用牌目标",
    },
    ai: { ...base.ai, result: { player: 1 } },
  };
}
function emptySlots(player) {
  const slots = [];
  for (let i = 1; i <= 5; i++) {
    if (i === 4 && get.is.mountCombined()) continue;
    for (let n = 0; n < player.countEmptySlot(i); n++) slots.push(i);
  }
  return slots;
}
function candidates(player, slot) {
  return Array.from(ui.cardPile.childNodes).filter(card => get.type(card) === "equip"
    && get.subtypes(card, false).includes(`equip${slot}`) && player.canUse(card, player));
}
const kuanglanCount = player => player.storage.fan_kuanglan_count || 0;
function currentTurn(event) {
  const turn = event?.name === "phase" ? event : event?.getParent?.("phase");
  return turn?.name === "phase" ? turn : null;
}
function pendingUses(player, turn) {
  return (turn?.fan_kuanglan_due || []).filter(owner => owner === player).length
    + (player.storage.fan_kuanglan_unbound || 0);
}

export default {
  fan_jingwu_gain_voice: { audio: ["ext:原神/audio/ajax/skill/fan_jingwu_gain_voice.mp3", "ext:原神/audio/ajax/skill/fan_jingwu_gain_voice2.mp3"] },
  fan_jingwu_damage_voice: { audio: ["ext:原神/audio/ajax/skill/fan_jingwu_damage_voice.mp3", "ext:原神/audio/ajax/skill/fan_jingwu_damage_voice2.mp3"] },
  fan_jingwu_draw_voice: { audio: ["ext:原神/audio/ajax/skill/fan_jingwu_draw_voice.mp3", "ext:原神/audio/ajax/skill/fan_jingwu_draw_voice2.mp3"] },
  fan_jingwu_convert_voice: { audio: ["ext:原神/audio/ajax/skill/fan_jingwu_convert_voice.mp3", "ext:原神/audio/ajax/skill/fan_jingwu_convert_voice2.mp3"] },
  fan_kuanglan_repay_voice: { audio: "ext:原神/audio/ajax/skill:2" },
  fan_jingwu: {
    audio: false, locked: false,
    group: ["fan_jingwu_sha", "fan_jingwu_shan", "fan_jingwu_effect"],
    mark: true, marktext: "武",
    intro: { content: (storage, player) => `下次发动：${stages[stage(player)]}` },
    // 进度跨回合保留；暂时失效不重置。实际失去该技能才清理。
    onremove(player) { delete player.storage.fan_jingwu_index; },
    subSkill: {
      sha: attackConversion(), shan: conversion("shan"),
      effect: {
        trigger: { player: ["useCard", "respond"] },
        forced: true, locked: false, popup: false, audio: false,
        filter: event => ["fan_jingwu_sha", "fan_jingwu_sha_backup", "fan_jingwu_shan"].includes(event.skill),
        async content(event, trigger, player) {
          const index = stage(player), target = opponent(trigger);
          // 先消耗本次阶段，附加伤害或获得牌引发的嵌套发动读取新阶段。
          player.storage.fan_jingwu_index = (index + 1) % 3;
          player.syncStorage("fan_jingwu_index");
          player.markSkill("fan_jingwu");
          const voiceReadyAt = trigger.card.name === "sha" ? Date.now() + 900 : 0;
          const speakEffect = id => {
            const delay = voiceReadyAt - Date.now();
            if (delay > 0) setTimeout(() => game.trySkillAudio(id, player, true), delay);
            else game.trySkillAudio(id, player, true);
          };
          if (trigger.card.name === "sha") game.trySkillAudio("fan_jingwu_convert_voice", player, true);
          if (index === 0 && target?.isIn() && target.countGainableCards(player, "h") > 0) {
            speakEffect("fan_jingwu_gain_voice");
            await player.gainPlayerCard(target, "h", true);
          } else if (index === 1 && target?.isIn()) {
            speakEffect("fan_jingwu_damage_voice");
            await target.damage(1, player);
          }
          else if (index === 2 && player.isIn()) {
            const draw = player.draw(2);
            await draw;
            if (draw.result?.cards?.length) speakEffect("fan_jingwu_draw_voice");
          }
          if (target?.isIn() && !target.isLinked()) await target.link(true);
        },
      },
    },
  },
  fan_kuanglan: {
    audio: ["ext:原神/audio/ajax/skill/fan_kuanglan.mp3", "ext:原神/audio/ajax/skill/fan_kuanglan2.mp3"], logAudio: () => false,
    locked: false, enable: "phaseUse", usable: 1,
    filter: (event, player) => emptySlots(player).length > 0,
    mark: true, marktext: "澜",
    intro: { content: (storage, player) => `本局已发动${kuanglanCount(player)}次` },
    prompt: "狂澜：补充空置装备栏", prompt2: false,
    async content(event, trigger, player) {
      // 发动即计入本局次数；先登记，补装中的嵌套事件也能看到最新次数及代价。
      player.storage.fan_kuanglan_count = kuanglanCount(player) + 1;
      player.syncStorage("fan_kuanglan_count");
      player.markSkill("fan_kuanglan");
      const turn = currentTurn(event);
      if (turn) ((turn.fan_kuanglan_due || (turn.fan_kuanglan_due = []))).push(player);
      else player.storage.fan_kuanglan_unbound = (player.storage.fan_kuanglan_unbound || 0) + 1;
      player.storage.fan_kuanglan_pending = (player.storage.fan_kuanglan_pending || 0) + 1;
      player.addSkill("fan_kuanglan_repay");
      const slots = emptySlots(player);
      game.trySkillAudio("fan_kuanglan", player, true);
      for (const slot of slots) {
        if (!player.isIn()) break;
        if (!player.hasEmptySlot(slot)) continue;
        const pool = candidates(player, slot);
        if (!pool.length) continue;
        const card = pool.randomGet();
        // 与本地羊祜【戎备】一致：直接使用牌堆实体牌，不先移入手牌产生 gainAfter。
        await player.chooseUseTarget({ card, targets: [player], forced: true, nopopup: true });
      }
    },
    ai: {
      order: 9,
      result: {
        player(player) {
          // 使用牌堆公开的装备类别估计收益，不读取暗置牌堆的实际牌序/牌面。
          const slots = emptySlots(player);
          const available = slots.filter(slot => lib.inpile.some(name => get.type(name) === "equip"
            && get.subtypes({ name }, false).includes(`equip${slot}`)));
          const materials = player.countCards("h", card => material(card, player));
          const pending = pendingUses(player, currentTurn(_status.event));
          const count = kuanglanCount(player) + 1;
          const totalCost = (pending + 1) * count;
          // 失去体力不由护甲抵消；不主动把自己送入濒死赌队友救援。
          if (player.hp <= totalCost) return -20 - totalCost;
          const incrementalCost = count + pending;
          const healthWeight = player.hp - totalCost <= 1 ? 2 : 1.2;
          return available.length * (player.hasSkill("fan_jingwu") ? (materials ? 1.6 : 2.2) : 1)
            - incrementalCost * healthWeight;
        },
      },
    },
  },
  fan_kuanglan_repay: {
    charlotte: true, forced: true, locked: false, popup: false, audio: false,
    trigger: { global: "phaseEnd" },
    mark: true, marktext: "偿", intro: { content: "狂澜：对应回合结束时，每次发动均失去本局累计发动次数的体力" },
    filter: (event, player) => pendingUses(player, event) > 0,
    async content(event, trigger, player) {
      const times = pendingUses(player, trigger);
      if (!times) return;
      // 只消费本次回合的登记；嵌套额外回合不能提前结算外层回合的代价。
      trigger.fan_kuanglan_due = (trigger.fan_kuanglan_due || []).filter(owner => owner !== player);
      delete player.storage.fan_kuanglan_unbound;
      player.storage.fan_kuanglan_pending = Math.max(0, (player.storage.fan_kuanglan_pending || 0) - times);
      if (!player.storage.fan_kuanglan_pending) {
        delete player.storage.fan_kuanglan_pending;
        player.removeSkill("fan_kuanglan_repay");
      }
      for (let i = 0; i < times && player.isIn(); i++) {
        game.trySkillAudio("fan_kuanglan_repay_voice", player, true);
        await player.loseHp(kuanglanCount(player));
      }
    },
  },
};
