import { get, _status } from "../../../../noname.js";

const tag = "visible_fan_huanwu";
const damageTag = "fan_huanwu_bonus";
const shown = card => get.is.shownCard(card) || card.hasGaintag("faceup_tag");
const shownTag = tag => tag === "faceup_tag" || tag.startsWith("visible_") || tag.startsWith("eternal_visible_");
// 转化牌按其实际素材判断；装备区的牌天然属于角色的明置牌，判定牌不计。
const shownUse = (card, player) => {
  const cards = get.itemtype(card) === "card" ? [card] : card.cards || [];
  return cards.some(material => player.getCards("e").includes(material)
    || player.getCards("h").includes(material) && shown(material));
};
const phaseOf = event => event.getParent("phaseUse");
const usedIn = (player, phase) => player.getHistory("useCard", event => phaseOf(event) === phase);

export default {
  fan_huanwu: {
    trigger: { player: "phaseUseBegin" },
    filter: (event, player) => player.countCards("h") > 0,
    prompt: "是否发动【幻舞】，明置所有手牌？",
    prompt2: false,
    async content(event, trigger, player) {
      trigger.fan_huanwu = true;
      const cards = player.getCards("h");
      // 先取发动前的明置快照，兼容其他技能明置及旧版 faceup_tag。
      // 加伤标签独立于明置标签，重复发动不会叠加伤害。
      const alreadyShown = cards.filter(shown);
      if (alreadyShown.length) player.addGaintag(alreadyShown, damageTag);
      await player.addShownCards(cards, tag);
    },
    group: ["fan_huanwu_damage", "fan_huanwu_record", "fan_huanwu_draw", "fan_huanwu_end", "fan_huanwu_extra"],
    subSkill: {
      record: {
        trigger: { player: "useCard1" },
        forced: true,
        popup: false,
        async content(event, trigger, player) {
          // 使用牌先失去素材，须读取失牌快照，不能检查已被清除的明置标签。
          trigger.fan_huanwu_shown = player.getHistory("lose", loss =>
            loss.getParent() === trigger && (loss.es?.some(card => trigger.cards?.includes(card))
              || loss.hs?.some(card => trigger.cards?.includes(card)
                && loss.gaintag_map?.[card.cardid]?.some(shownTag)))
          ).length > 0;
          trigger.fan_huanwu_damage = player.getHistory("lose", loss =>
            loss.getParent() === trigger && loss.hs?.some(card =>
              trigger.cards?.includes(card) && loss.gaintag_map?.[card.cardid]?.includes(damageTag))
          ).length > 0;
        },
      },
      damage: {
        trigger: { source: "damageBegin1" },
        forced: true,
        popup: false,
        filter(event, player) {
          const use = event.getParent("useCard");
          return !!use?.fan_huanwu_damage && use.player === player && event.card === use.card;
        },
        async content(event, trigger) { trigger.num++; },
      },
      draw: {
        trigger: { player: "useCardAfter" },
        forced: true,
        popup: false,
        filter(event, player) {
          const phase = phaseOf(event);
          // 暗置牌也占用前三张的名额，只有其中的明置牌能摸牌。
          const index = usedIn(player, phase).indexOf(event);
          return phase?.fan_huanwu && event.fan_huanwu_shown && index >= 0 && index < 3;
        },
        async content(event, trigger, player) { await player.draw(); },
        mod: {
          cardUsable(card, player) {
            const phase = _status.event.getParent("phaseUse", true);
            if (phase?.player === player && phase.fan_huanwu && shownUse(card, player)
              && usedIn(player, phase).length < 3) return Infinity;
          },
        },
      },
      end: {
        trigger: { player: "phaseUseEnd" },
        forced: true,
        popup: false,
        filter(event, player) {
          const turn = event.getParent("phase");
          return event.fan_huanwu && turn?.name === "phase" && !turn.fan_huanwu_awarded
            && usedIn(player, event).length === 3
            && !player.hasHistory("sourceDamage", damage => phaseOf(damage) === event);
        },
        async content(event, trigger) {
          const turn = trigger.getParent("phase");
          // 获得时即占用次数，额外阶段再次满足条件也不能递归获得。
          turn.fan_huanwu_awarded = true;
          turn.fan_huanwu_pending = true;
        },
      },
      extra: {
        trigger: { player: "phaseAfter" },
        forced: true,
        popup: false,
        filter: event => !!event.fan_huanwu_pending,
        async content(event, trigger, player) {
          delete trigger.fan_huanwu_pending;
          await player.phaseUse();
        },
      },
    },
  },
  fan_miwen: {
    trigger: { source: "damageBegin2" },
    usable: 1,
    filter: (event, player) => event.player !== player && event.player.isIn(),
    prompt: "是否发动【秘闻】，防止伤害并明置目标两张手牌，获得其中一张？",
    prompt2: false,
    check: (event, player) => get.attitude(player, event.player) > 0 || event.player.hasCard(card => !shown(card), "h"),
    async content(event, trigger, player) {
      trigger.cancel();
      const target = trigger.player;
      if (!target.isIn() || !player.isIn()) return;
      const candidates = target.getCards("h", card => !shown(card));
      if (!candidates.length) return;
      let cards = candidates;
      if (candidates.length > 2) {
        const result = await player.choosePlayerCard(target, "h", 2, true, "秘闻：明置两张手牌")
          .set("filterButton", button => !shown(button.link))
          .set("prompt2", false).forResult();
        if (!result.bool) return;
        cards = result.cards;
      }
      cards = cards.filter(card => target.getCards("h").includes(card) && !shown(card));
      if (!cards.length) return;
      await target.addShownCards(cards, "visible_fan_miwen");
      if (!target.isIn() || !player.isIn()) return;
      const gainable = target.getGainableCards(player, "h").filter(card => cards.includes(card));
      if (!gainable.length) return;
      let chosen = gainable[0];
      if (gainable.length > 1) {
        const result = await player.chooseButton(["秘闻：获得其中一张牌", gainable], true)
          .set("ai", button => get.value(button.link, player)).forResult();
        if (!result.bool) return;
        chosen = result.links[0];
      }
      if (player.isIn() && target.isIn() && target.getGainableCards(player, "h").includes(chosen)) {
        await player.gain(chosen, target, "give");
      }
    },
  },
};
