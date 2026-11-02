import { lib, game, get, ui, _status } from "../../../../noname.js";

const prefix = "fan_xijuan_weapon_";
const weapons = player => player.getVCards("e", card => get.subtype(card) === "equip1");
const materialEnabled = (card, player) => game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false;

// 使用原生虚拟装备保存锦囊实体，不修改实体牌名。离开装备区自动还原。
function weaponName(name) {
  const id = prefix + name;
  if (!lib.card[id]) {
    const range = Array.from(get.translation(name)).length;
    lib.card[id] = {
      type: "equip", subtype: "equip1", enable: true, toself: true,
      selectTarget: -1, modTarget: true,
      filterTarget: (card, player, target) => player === target && target.canEquip(card, true),
      content: lib.element.content.equipCard,
      distance: { attackFrom: 1 - range },
      skills: ["fan_xijuan_effect"],
      ai: { basic: { equipValue: range + 2 }, equipValue: range + 2 },
    };
    lib.translate[id] = get.translation(name);
    lib.translate[id + "_info"] = `武器，攻击范围${range}。当你使用【杀】指定目标后，还可以视为对目标使用【${get.translation(name)}】。`;
    game.finishCard(id);
  }
  return id;
}

function trickTarget(name, player, target) {
  return name === "wuzhong" ? player : target;
}
function canInvoke(name, player, target) {
  if (name === "wuxie" || !player.isIn() || !target.isIn()) return false;
  return player.canUse({ name, isCard: true }, trickTarget(name, player, target));
}

function kaigeUse(event) {
  const ordering = event.getParent();
  if (ordering?.name !== "orderingDiscard") return;
  const use = ordering.relatedEvent || ordering.getParent();
  return use?.name === "useCard" ? use : undefined;
}

export default {
  fan_shuofeng: {
    locked: true,
    enable: ["chooseToUse", "chooseToRespond"],
    position: "he",
    selectCard: [0, 1],
    filterOk: () => ui.selected.cards.length === 1,
    filterCard: (card, player) => get.subtype(card) === "equip1" && materialEnabled(card, player),
    viewAs: { name: "sha", storage: { fan_shuofeng: true } },
    viewAsFilter: player => player.hasCard(card => get.subtype(card) === "equip1" && materialEnabled(card, player), "he"),
    check: card => 6 - get.value(card),
    prompt: "将一张武器牌当【杀】使用或打出",
    prompt2: false,
    manualConfirm: true,
    onChooseToUse(event) { event.set("fanPairedConfirm", true); },
    group: "fan_shuofeng_slot",
    mod: {
      attackRangeBase(player) {
        // 虚拟装备的界面代理与实体素材不同，原生范围检查只排除实体素材。
        if (_status.event?.skill !== "fan_shuofeng" || !ui.selected.cards.some(card => card.isViewAsCard)) return;
        const selected = ui.selected.cards;
        return player.getEquipRange(player.getVCards("e", weapon =>
          !weapon.cards?.some(card => selected.includes(card))
          && !selected.some(card => card.cardSymbol && card[card.cardSymbol] === weapon)));
      },
      selectTarget(card, player, range) {
        if (!card.storage?.fan_shuofeng || range[1] === -1) return;
        // 选择时素材尚在装备区，扣除选中的武器；与实际失去素材后计数一致。
        const selected = [...(card.cards || []), ...ui.selected.cards];
        range[1] += weapons(player).filter(weapon => !selected.includes(weapon)
          && !weapon.cards?.some(material => selected.includes(material))
          && !player.getCards("e").some(shown => selected.includes(shown)
            && shown.cardSymbol && shown[shown.cardSymbol] === weapon)).length;
      },
    },
    ai: { respondSha: true, skillTagFilter: player => player.hasCard(card => get.subtype(card) === "equip1", "he") },
    subSkill: {
      slot: {
        trigger: { global: "phaseBefore", player: "enterGame" },
        // 基础装备栏设置先于普通开局技能，且不进入同优先级技能的排序询问。
        forced: true, silent: true, popup: false, firstDo: true,
        filter: (event, player) => !player.storage.fan_shuofeng_slot && (event.name !== "phase" || game.phaseNumber === 0),
        async content(event, trigger, player) {
          player.storage.fan_shuofeng_slot = true;
          await player.expandEquip(1);
        },
      },
    },
  },
  fan_xijuan: {
    enable: "phaseUse",
    position: "h",
    filterCard(card, player) {
      return get.type(card, player) === "trick" && materialEnabled(card, player)
        && player.canEquip({ name: weaponName(get.name(card, player)) }, true);
    },
    selectCard: 1, discard: false, lose: false, delay: false,
    prompt: "将一张普通锦囊牌置为武器",
    prompt2: false,
    check: card => 7 - get.value(card),
    async content(event, trigger, player) {
      const material = event.cards[0];
      if (!player.getCards("h").includes(material) || get.type(material, player) !== "trick") return;
      const card = get.autoViewAs({ name: weaponName(get.name(material, player)) }, [material]);
      if (player.canEquip(card, true)) await player.equip(card);
    },
    ai: { order: 9, result: { player: 1 } },
  },
  fan_xijuan_effect: {
    equipSkill: true,
    trigger: { player: "useCardToPlayered" },
    direct: true,
    filter: (event, player) => event.card.name === "sha" && weapons(player).some(card =>
      card.name.startsWith(prefix) && canInvoke(card.name.slice(prefix.length), player, event.target)),
    async content(event, trigger, player) {
      const snapshot = weapons(player).filter(card => card.name.startsWith(prefix));
      for (const weapon of snapshot) {
        const name = weapon.name.slice(prefix.length), target = trickTarget(name, player, trigger.target);
        if (!weapons(player).includes(weapon) || !canInvoke(name, player, trigger.target)) continue;
        const card = { name, isCard: true };
        if (name === "jiedao") {
          // 第一个目标已绑定，只选择尚未确定的出杀目标。
          const result = await player.chooseTarget("席卷：选择【借刀杀人】的出杀目标", (cardx, source, current) =>
            _status.event.borrower.isIn() && lib.card.jiedao.filterAddedTarget({ name: "jiedao" }, source, current, _status.event.borrower))
            .set("borrower", target).set("prompt2", false).set("fanPairedConfirm", true)
            .set("ai", current => -get.attitude(target, current)).forResult();
          if (result.bool && canInvoke(name, player, trigger.target)
            && lib.card.jiedao.filterAddedTarget(card, player, result.targets[0], target)) {
            player.logSkill("fan_xijuan_effect", target);
            await player.useCard(card, [target, result.targets[0]]);
          }
        } else {
          const result = await player.chooseBool(`席卷：对${get.translation(target)}使用【${get.translation(name)}】？`)
            .set("prompt2", false).set("ai", () => get.effect(target, card, player, player) > 0).forResult();
          if (result.bool && canInvoke(name, player, trigger.target)) {
            player.logSkill("fan_xijuan_effect", target);
            // 指定目标已由杀确定，群体锦囊也只对本目标结算。
            await player.useCard(card, target);
          }
        }
      }
    },
  },
  fan_kaige: {
    zhuSkill: true,
    round: 1,
    trigger: { global: "cardsDiscardAfter" },
    filter(event, player) {
      // useCardAfter 时素材可能仍在处理区；等结算清理真正入弃牌堆后再回收。
      const use = kaigeUse(event);
      return !!use && player.hasZhuSkill("fan_kaige") && use.player !== player && use.player.group === "wu"
        && get.type(use.card) === "trick" && event.cards?.some(card =>
          use.cards?.includes(card) && get.position(card, true) === "d");
    },
    prompt: "是否发动【凯歌】获得锦囊对应的实体牌？",
    prompt2: false,
    check: () => true,
    async content(event, trigger, player) {
      const use = kaigeUse(trigger);
      const cards = trigger.cards.filter(card => use?.cards?.includes(card) && get.position(card, true) === "d");
      if (cards.length) await player.gain(cards, "gain2");
    },
  },
};
