import { game, get, lib, ui } from "../../../../noname.js";

export default {
  fan_tiaoshuang: {
    audio: "ext:原神/audio/escoffier/skill:3",
    trigger: { player: "phaseUseBegin" },
    direct: true,
    filter(event, player) {
      return player.countDiscardableCards(player, "he") > 0 &&
        game.hasPlayer(receiver => game.hasPlayer(donor => donor !== receiver && donor.countGainableCards(receiver, "hej") > 0));
    },
    async content(event, trigger, player) {
      const result = await player.chooseCardTarget({
        prompt: "你可以发动【调霜】",
        prompt2: "弃置一张牌，依次选择获得牌的角色和被获得牌的角色",
        position: "he",
        filterCard: lib.filter.cardDiscardable,
        selectCard: 1,
        selectTarget: 2,
        multitarget: true,
        targetprompt: ["获得牌", "被获得牌"],
        filterTarget(card, owner, target) {
          const receiver = ui.selected.targets[0];
          if (!receiver) return game.hasPlayer(donor => donor !== target && donor.countGainableCards(target, "hej") > 0);
          return target !== receiver && target.countGainableCards(receiver, "hej") > 0;
        },
        ai1: card => 6 - get.value(card),
        ai2(target) {
          const owner = get.player();
          return ui.selected.targets.length ? -get.attitude(owner, target) : get.attitude(owner, target);
        },
      }).forResult();
      if (!result.bool) return;
      const [receiver, donor] = result.targets;
      player.logSkill("fan_tiaoshuang", result.targets);
      await player.discard(result.cards);
      // 弃牌触发的其他技能可能改变目标状态或使可获得的牌离场。
      if (!receiver.isIn() || !donor.isIn() || !donor.countGainableCards(receiver, "hej")) return;
      const gained = await receiver.gainPlayerCard(donor, "hej", true).forResult();
      if (!gained.bool || !receiver.isIn() || !donor.isIn()) return;
      const draw = receiver.countCards("h") <= donor.countCards("h");
      if (draw) await receiver.draw();
      // 先完整结算摸牌，再比较体力，不提前固定第二项条件。
      const recover = receiver.isIn() && donor.isIn() && receiver.hp <= donor.hp;
      if (recover) await receiver.recover(1, player);
      if (receiver !== player && player.isIn() && (draw || recover)) {
        player.popup("乘势");
        game.trySkillAudio("fan_tiaoshuang_chengshi", player, true, true);
        if (draw) await player.draw();
        if (recover && player.isIn()) await player.recover(1, player);
      }
    },
  },
  fan_xianggao: {
    audio: "ext:原神/audio/escoffier/skill:3",
    trigger: { global: "phaseJieshuBegin" },
    forced: true,
    filter(event, player) {
      if (!event.player.isIn()) return false;
      // 查询整局实际回复记录，兼容桃、技能、自身回复及中途获得本技能。
      return game.getAllGlobalHistory("changeHp", evt => {
        const recover = evt.getParent();
        return evt.player === event.player && evt.num > 0 &&
          recover.name === "recover" && recover.source === player;
      }).length > 0;
    },
    logTarget: "player",
    async content(event, trigger, player) {
      await trigger.player.draw();
    },
  },
  fan_tiaoshuang_chengshi: {
    audio: "ext:原神/audio/escoffier/skill:4",
  },
};
