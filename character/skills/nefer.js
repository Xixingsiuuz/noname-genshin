import { game, get, _status } from "../../../../noname.js";

const tag = "visible_fan_huanwu";
const damageTag = "fan_huanwu_damage_eligible";
const shown = card => get.is.shownCard(card) || card.hasGaintag("faceup_tag");
const phaseOf = event => event.getParent("phaseUse");
const usedIn = (player, phase) => player.getHistory("useCard", event => phaseOf(event) === phase);

export default {
  fan_huanwu: {
    audio: "ext:原神/audio/nefer/skill:3",
    trigger: { player: "phaseUseBegin" },
    filter: (event, player) => player.countCards("h") > 0,
    prompt: "是否发动【幻舞】，明置所有手牌？",
    prompt2: false,
    check: (event, player) => player.countCards("h") > 0,
    async content(event, trigger, player) {
      trigger.fan_huanwu = true;
      const cards = player.getCards("h");
      // 先取发动前的明置快照，兼容其他技能明置及旧版 faceup_tag。
      // 加伤标签独立于明置标签，重复发动不会叠加伤害。
      const alreadyShown = cards.filter(shown);
      if (alreadyShown.length) {
        player.addGaintag(alreadyShown, damageTag);
        // 展示标签与规则资格分离，非伤害牌转化为伤害牌仍能读取原资格。
        player.removeGaintag("fan_huanwu_bonus", cards);
        const damageCards = alreadyShown.filter(card => get.tag(card, "damage"));
        if (damageCards.length) player.addGaintag(damageCards, "fan_huanwu_bonus");
      }
      await player.addShownCards(cards, tag);
    },
    group: ["fan_huanwu_damage", "fan_huanwu_record", "fan_huanwu_draw", "fan_huanwu_end"],
    subSkill: {
      use_voice: {
        audio: "ext:原神/audio/nefer/skill:3",
        // 仅提供原生音频池及台词页试听，不挂载对局触发器。
      },
      record: {
        trigger: { player: "useCard1" },
        forced: true,
        locked: false,
        popup: false,
        async content(event, trigger, player) {
          // 使用牌先失去素材，须读取失牌快照，不能检查已被清除的明置标签。
          const phase = phaseOf(trigger);
          const index = usedIn(player, phase).indexOf(trigger);
          if (phase?.fan_huanwu && index >= 0 && index < 3 && trigger.addCount !== false) {
            trigger.addCount = false;
            const stat = player.getStat().card;
            if (stat[trigger.card.name] > 0) stat[trigger.card.name]--;
          }
          trigger.fan_huanwu_damage = player.getHistory("lose", loss =>
            loss.getParent() === trigger && loss.hs?.some(card =>
              trigger.cards?.includes(card) && loss.gaintag_map?.[card.cardid]?.includes(damageTag))
          ).length > 0;
        },
      },
      damage: {
        trigger: { source: "damageBegin1" },
        forced: true,
        locked: false,
        popup: false,
        filter(event, player) {
          const use = event.getParent("useCard");
          return !!use?.fan_huanwu_damage && use.player === player && event.card === use.card;
        },
        async content(event, trigger) { trigger.num++; },
      },
      draw: {
        trigger: { player: "useCard" },
        forced: true,
        locked: false,
        popup: false,
        filter(event, player) {
          const phase = phaseOf(event);
          // 前三张牌统一享受效果，不要求明置或实体素材。
          const index = usedIn(player, phase).indexOf(event);
          return phase?.fan_huanwu && index >= 0 && index < 3;
        },
        async content(event, trigger, player) {
          game.trySkillAudio("fan_huanwu_use_voice", player);
          await player.draw();
        },
        mod: {
          cardUsable(card, player) {
            const phase = _status.event.getParent("phaseUse", true);
            if (phase?.player === player && phase.fan_huanwu
              && usedIn(player, phase).length < 3) return Infinity;
          },
        },
      },
      end: {
        trigger: { player: "phaseUseEnd" },
        forced: true,
        locked: false,
        popup: false,
        filter(event, player) {
          const turn = event.getParent("phase");
          return event.fan_huanwu && turn?.name === "phase" && !turn.fan_huanwu_awarded
            && usedIn(player, event).length === 3
            && !player.hasHistory("sourceDamage", damage => phaseOf(damage) === event);
        },
        async content(event, trigger, player) {
          const turn = trigger.getParent("phase");
          // 获得时即占用次数，额外阶段再次满足条件也不能递归获得。
          turn.fan_huanwu_awarded = true;
          if (player.isIn()) await player.phaseUse();
        },
      },
    },
  },
  fan_miwen: {
    audio: "ext:原神/audio/nefer/skill:3",
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
