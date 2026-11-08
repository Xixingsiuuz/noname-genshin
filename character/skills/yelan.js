import { game, get, lib, ui, _status } from "../../../../noname.js";

const tag = "fan_kuanghuo_mark";
const huos = target => target.getExpansions(tag);
const ownHuos = (target, owner) => huos(target).filter(card => card.fan_kuanghuo_owner === owner.playerid);
// 交牌决策只比较“付款后恢复的牌效果”，不重复扣已经支付/无法避免的诓惑代价。
const paymentEvaluations = new Set();
const selfSave = (card, actor, target) => target === actor && actor.hp <= 0 &&
  (get.tag(card, "recover") > 0 || get.tag(card, "save") > 0);
function withoutKuanghuo(actor, evaluate) {
  const nested = paymentEvaluations.has(actor);
  paymentEvaluations.add(actor);
  try { return evaluate(); }
  finally { if (!nested) paymentEvaluations.delete(actor); }
}
const category = (card, player) => get.type2(card, player); // 延时锦囊同属锦囊。
const number = (card, player) => {
  const n = get.number(card, player);
  return Number.isInteger(n) && n >= 1 && n <= 13 ? n : null;
};
// useCard/respond 触发时素材已离手；只认本次事件的失牌快照，不认装备素材或无素材虚拟牌。
function fromHand(event) {
  return event.player.getHistory("lose", loss => loss.getParent() === event || loss.relatedEvent === event)
    .some(loss => (loss.hs || []).some(card => event.cards?.includes(card)));
}
function matches(event, owner) {
  return ownHuos(event.player, owner).some(card => category(card, false) === category(event.card, event.player));
}
function legalGift(card, actor, owner) {
  return actor.getCards("h").includes(card) && lib.filter.canBeGained(card, owner, actor);
}
function useBenefit(event, actor) {
  if (event.all_excluded) return 0;
  if (event.name === "respond" || event.respondTo) {
    if (event.getParent?.()?.toUse === false) return 0;
    // 无目标响应牌不能用目标收益之和评估；原生已决定尝试响应，低血量优先保命。
    return 8 + (actor.hp <= 1 ? 6 : actor.hp <= 2 ? 3 : 0);
  }
  const targets = event.targets || [];
  return withoutKuanghuo(actor, () => {
    return targets.length ? targets.reduce((sum, target) => sum + get.effect(target, event.card, actor, actor), 0)
      : get.effect(actor, event.card, actor, actor);
  });
}

export default {
  fan_kuanghuo_tax_audio: { audio: "ext:原神/audio/yelan/skill:2" },
  fan_kuanghuo_number_audio: { audio: "ext:原神/audio/yelan/skill:2" },
  fan_kuanghuo: {
    audio: ["ext:原神/audio/yelan/skill/fan_kuanghuo1.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo2.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo3.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo_tax_audio1.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo_tax_audio2.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo_number_audio1.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo_number_audio2.mp3"],
    logAudio() { return ["ext:原神/audio/yelan/skill/fan_kuanghuo1.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo2.mp3", "ext:原神/audio/yelan/skill/fan_kuanghuo3.mp3"]; },
    enable: "phaseUse", usable: 1, locked: false,
    position: "he", selectCard: [0, 1], discard: false, lose: false, delay: false,
    filter(event, player) { return player.countCards("he") > 0; },
    filterCard: true,
    filterTarget(card, player, target) { return player !== target; },
    filterOk() { return ui.selected.cards.length === 1 && ui.selected.targets.length === 1; },
    manualConfirm: true, fanPairedConfirm: true,
    prompt: "诓惑：将一张牌置于一名其他角色的武将牌上",
    prompt2: false,
    async content(event, trigger, player) {
      const target = event.target, card = event.cards?.[0];
      if (!target?.isIn() || !player.isIn() || !player.getCards("he").includes(card)) return;
      game.broadcastAll((card, id) => { card.fan_kuanghuo_owner = id; }, card, player.playerid);
      await target.addToExpansion({ cards: [card], source: player, animate: "give", gaintag: [tag] });
      if (huos(target).includes(card)) target.addSkill(tag);
    },
    group: ["fan_kuanghuo_record", "fan_kuanghuo_tax", "fan_kuanghuo_number"],
    check(card) {
      const player = _status.event.player;
      // 装备区素材按当前装备价值评估，保留原生装备、体力及技能联动估值。
      return 7 - (player.getCards("e").includes(card) ? get.equipValue(card, player) : get.value(card, player));
    },
    ai: {
      order: 8,
      result: {
        target(player, target) {
          const card = ui.selected.cards[0];
          const repeated = card && ownHuos(target, player).some(c => category(c, false) === category(card, player));
          // 第三张可收网；重复类别仍有积累价值，但不重复征税。
          return -(repeated ? 0.6 : 1.5) - (huos(target).length === 2 ? 2 : 0);
        },
      },
    },
  },
  fan_kuanghuo_tax: {
    trigger: { global: ["useCard", "respond"] },
    forced: true, locked: false, popup: false, audio: false,
    filter(event, player) {
      return player !== event.player && event.player.isIn() && fromHand(event) && matches(event, player);
    },
    async content(event, trigger, player) {
      const actor = trigger.player;
      if (!player.isIn() || !actor.isIn() || !matches(trigger, player)) return;
      if (trigger.name === "useCard") game.trySkillAudio("fan_kuanghuo_tax_audio", player, true, true);
      let paid = false;
      if (actor.countCards("h", card => legalGift(card, actor, player))) {
        const result = await actor.chooseCard("h", "诓惑：交给" + get.translation(player) + "一张手牌，否则此牌无效",
          card => legalGift(card, actor, player))
          .set("prompt2", false).set("ai", card => {
            const cost = get.value(card, actor) * (get.attitude(actor, player) > 0 ? 0.4 : 1.25);
            // 已经实际开始自救，合法付款优先保命；不因桃/龙魂素材估值高而拒付。
            // 前一名拥有者已经令整牌无效时，后续付款无法恢复效果，不继续送牌。
            if (!trigger.all_excluded && trigger.targets?.some(target => selfSave(trigger.card, actor, target))) {
              return 20 / (1 + Math.max(0, cost));
            }
            return useBenefit(trigger, actor) - cost;
          }).forResult();
        const card = result.cards?.[0];
        if (result.bool && actor.isIn() && player.isIn() && legalGift(card, actor, player)) {
          const transfer = actor.give(card, player);
          await transfer;
          paid = transfer.getg(player).includes(card);
        }
      }
      if (paid) return;
      game.log(actor, "因【诓惑】令", trigger.card, "无效");
      if (trigger.name === "useCard") trigger.all_excluded = true;
      else {
        // chooseToRespond 已保存 bool:true；只 cancel respond 不会改掉这个结果。
        // 素材已经正常打出并进入处理区，保留移动与后续原生清理。
        trigger.result = { bool: false };
        const choice = trigger.getParent();
        if (choice?.name === "chooseToRespond") choice.result = { ...choice.result, bool: false };
      }
    },
  },
  fan_kuanghuo_record: {
    trigger: { global: "useCard" },
    forced: true, locked: false, silent: true, popup: false, firstDo: true, priority: 100,
    filter(event, player) { return ownHuos(event.player, player).length > 0; },
    async content(event, trigger, player) {
      const n = number(trigger.card, trigger.player);
      (trigger.fan_kuanghuo_numbers ?? (trigger.fan_kuanghuo_numbers = {}));
      trigger.fan_kuanghuo_numbers[player.playerid] = n ? ownHuos(trigger.player, player)
        .filter(card => number(card, false) === n) : [];
    },
  },
  fan_kuanghuo_number: {
    trigger: { global: "useCardAfter" },
    forced: true, locked: false, popup: false, audio: false,
    filter(event, player) {
      return event.player.isIn() && (event.fan_kuanghuo_numbers?.[player.playerid] || [])
        .some(card => ownHuos(event.player, player).includes(card));
    },
    async content(event, trigger, player) {
      const actor = trigger.player;
      // 固定本次命中的实体“惑”，嵌套用牌若已移走某张则跳过，不误弃后来放置的牌。
      const cards = trigger.fan_kuanghuo_numbers?.[player.playerid] || [];
      if (cards.some(card => ownHuos(actor, player).includes(card))) game.trySkillAudio("fan_kuanghuo_number_audio", player, true, true);
      for (const card of cards) {
        if (!actor.isIn()) break;
        if (!ownHuos(actor, player).includes(card)) continue;
        await actor.loseToDiscardpile(card);
        await actor.loseHp();
      }
    },
  },
  fan_kuanghuo_mark: {
    charlotte: true, mark: true, marktext: "惑",
    intro: { name: "惑", content: "expansion", markcount: "expansion" },
    // 效果来自夜兰所持主技能；标记仅保管实体牌、公开信息与AI，不绕过技能封锁。
    ai: {
      effect: {
        player(card, actor, target, current, linking) {
          if (linking || paymentEvaluations.has(actor)) return; // 连环传导、付款后的边际收益不重复收取代价。
          const materials = card.cards?.length ? card.cards : [card];
          const hand = actor.getCards("h");
          const from = materials.some(c => hand.includes(c));
          let cost = 0, noPay = false;
          if (from) {
            const owners = game.filterPlayer(owner => owner !== actor && owner.hasSkill("fan_kuanghuo") &&
              ownHuos(actor, owner).some(c => category(c, false) === category(card, actor)))
              .sortBySeat(_status.currentPhase || actor);
            const spare = hand.filter(c => !materials.includes(c)).sort((a, b) => get.value(a, actor) - get.value(b, actor));
            for (const owner of owners) {
              const index = spare.findIndex(c => legalGift(c, actor, owner));
              if (index < 0) {
                noPay = true;
                break;
              }
              const [gift] = spare.splice(index, 1);
              // effect.player 的加值稍后会乘对自身态度；身份模式通常为10，不能固定按5换算。
              // 与实际付款回调使用同一手牌估值，保持“计划出牌”与“实际愿意付款”一致。
              const selfAttitude = Math.max(1, Math.abs(get.attitude(actor, actor)));
              cost += get.value(gift, actor) * (get.attitude(actor, owner) > 0 ? 0.4 : 1.25) / selfAttitude;
            }
          }
          const n = number(card, actor);
          const hits = n ? huos(actor).filter(c => number(c, false) === n &&
            game.hasPlayer(owner => owner.playerid === c.fan_kuanghuo_owner && owner.hasSkill("fan_kuanghuo"))).length : 0;
          // 去“惑”可避免第三张收网，但低血量失血代价更高；连环传导不属于使用牌。
          if (hits) cost += hits * (actor.hp <= hits ? 4 : actor.hp <= hits + 1 ? 2 : 0.7);
          if (hits && huos(actor).length >= 3 && huos(actor).length - hits < 3 && actor.hp > hits &&
            game.hasPlayer(owner => owner !== actor && owner.hasSkill("fan_yuantu") && get.attitude(actor, owner) < 0)) {
            cost -= 1 + actor.getCards("he").filter(c => !materials.includes(c))
              .reduce((sum, c) => sum + Math.max(0, get.value(c, actor)), 0) / 5;
          }
          // 清除原牌双方效果；本地get.effect另存的temp01/temp02技能加值仍保留。
          if (noPay) return [0, -cost - 0.2, 0, 0];
          if (cost > 0 && selfSave(card, actor, target)) {
            // 濒死使用桃后即便同点数再失血，也会消耗对应“惑”，可继续救援。
            // 仅限制本技能的负面估值，不强行覆盖原生无收益、禁疗等其他技能判断。
            const benefit = withoutKuanghuo(actor, () => get.effect(target, card, actor, actor));
            if (benefit > 0) {
              const selfAttitude = Math.max(1, Math.abs(get.attitude(actor, actor)));
              cost = Math.min(cost, benefit / selfAttitude / 2);
            }
          }
          return cost ? [1, -cost] : undefined;
        },
      },
    },
  },
  fan_yuantu: {
    audio: "ext:原神/audio/yelan/skill:2",
    trigger: { global: "phaseJieshuBegin" }, direct: true, locked: false,
    filter(event, player) { return event.player !== player && event.player.isIn() && huos(event.player).length >= 3; },
    async content(event, trigger, player) {
      const target = trigger.player;
      const useful = () => {
        const cards = [...huos(target), ...target.getCards("hej")];
        return cards.reduce((sum, card) => sum + (target.getCards("j").includes(card) ? -3 : get.value(card, target)), 0);
      };
      const result = await player.chooseBool("渊图：是否获得" + get.translation(target) + "的所有“惑”和区域内的所有牌？")
        .set("prompt2", false).set("ai", () => get.attitude(player, target) < 0 ? useful() > 0 : useful() < 0).forResult();
      if (!result.bool || !target.isIn() || !player.isIn() || huos(target).length < 3) return;
      player.logSkill("fan_yuantu", target);
      // “惑”与区域内牌一起获得；区域取手牌、装备、判定，不混入其他技能的扩展牌。
      const cards = [...new Set([...huos(target), ...target.getCards("hej")])];
      if (cards.length) await player.gain(cards, target, "give", "bySelf");
    },
  },
};
