import { lib, game, get, ui, _status } from "../../../../noname.js";

const available = player => !player.hasSkill("fan_huanxi_used") && game.hasPlayer(target => target !== player);
const options = (event, player) => get.inpileVCardList(([, , name]) => ["basic", "trick"].includes(get.type(name)))
  .filter(([, , name, nature]) => (event._backup?.filterCard || event.filterCard)({ name, nature, isCard: true }, player, event));
// 响应来源优先使用原生 respondTo；祖先 useCard 兼容决斗、南蛮等打出流程。
function blocked(player, event = _status.event) {
  if (!event || !["chooseToUse", "chooseToRespond"].includes(event.name)) return false;
  const source = event.respondTo?.[0] ||
    (["chooseToRespond"].includes(event.name) || event.type === "wuxie" ? event.getParent("useCard", true)?.player : null);
  return !!source && source !== player;
}

export default {
  fan_huanxi: {
    enable: ["chooseToUse", "chooseToRespond"],
    direct: true,
    filter: (event, player) => available(player) && options(event, player).length > 0,
    hiddenCard: (player, name) => available(player) && lib.inpile.includes(name) && ["basic", "trick"].includes(get.type(name)),
    chooseButton: {
      dialog: (event, player) => ui.create.dialog("幻戏：声明牌名", [options(event, player), "vcard"]),
      check: button => get.player().getUseValue({ name: button.link[2], nature: button.link[3] }) || 1,
      backup(links) {
        return {
          filterCard: () => false,
          selectCard: -1,
          filterTarget: (card, player, target) => target !== player,
          selectTarget: 1,
          discard: false,
          lose: false,
          // 此时没有 viewAs，选中的是猜测者，而非所声明牌的目标。
          async precontent(event, trigger, player) {
            const parent = event.getParent();
            const target = event.result.targets[0];
            const card = { name: links[0][2], nature: links[0][3], isCard: true,
              storage: { fan_huanxi: true } };
            const hasCard = player.countCards("h", item => get.name(item, player) === card.name) > 0;
            player.addTempSkill("fan_huanxi_used", { global: "phaseAfter" });
            player.logSkill("fan_huanxi", target);
            const guess = await target.chooseControl("有", "没有")
              .set("prompt", `幻戏：猜测${get.translation(player)}手牌中是否有【${get.translation(card.name)}】`)
              .set("ai", () => Math.random() < 0.5 ? 0 : 1).forResult();
            const correct = (guess.control === "有") === hasCard;
            game.log(target, "猜测", guess.control, "同名牌，", correct ? "猜对了" : "猜错了");
            // 原生无懈询问设有 nouse，precontent 延后在 _wuxie 中执行；
            // 该父事件没有 chooseToUse 的过滤器，也不能对它 backup 后重新选牌。
            if (parent.name !== "_wuxie") parent.restore();
            // 两种 chooseTo* 均识别 cancel 并返回选择步骤，不会提前结束出牌阶段。
            Object.assign(event.result, { bool: true, cancel: true, card, cards: [], targets: [] });
            delete event.result.skill;
            if (correct) {
              player.addTempSkill("fan_huanxi_blocked", { global: "phaseAfter" });
              return;
            }
            if (parent.name === "_wuxie") {
              event.result.cancel = card.name !== "wuxie"
                || !lib.filter.cardEnabled(card, player, "forceEnable");
              return;
            }
            // 没有目标选择的打出，以及原生自动确定目标的牌，直接交回引擎结算。
            // 不依赖玩家的“自动确认”设置，也不另行 useCard，保留原响应上下文。
            const info = get.info(card);
            const range = lib.filter.selectTarget(card, player);
            const automatic = parent.name === "chooseToRespond" ||
              (!info.complexTarget && !info.complexSelect &&
                (info.notarget || range?.[1] === -1 || (range?.[0] === 0 && range[1] === 0)));
            if (automatic && parent.filterCard(card, player, parent)) {
              event.result.cancel = false;
              if (parent.name !== "chooseToRespond" && !info.notarget && range?.[1] === -1) {
                const filter = parent.filterTarget || lib.filter.filterTarget;
                event.result.targets = game.filterPlayer(target => filter(card, player, target));
              }
              return;
            }
            lib.skill.fan_huanxi_use.viewAs = card;
            parent.backup("fan_huanxi_use");
            parent.openskilldialog = `幻戏：使用或打出${get.translation(card)}`;
          },
          ai1: () => 1,
          ai2: () => 1,
        };
      },
      prompt: links => `幻戏：声明【${get.translation(links[0][2])}】，选择猜测角色`,
    },
    group: "fan_huanxi_discard",
    ai: { order: 8, respondSha: true, respondShan: true, save: true,
      skillTagFilter: available, result: { player: 1 } },
  },
  fan_huanxi_use: {
    sourceSkill: "fan_huanxi",
    filterCard: () => false,
    selectCard: -1,
    viewAs: { name: "sha" },
    popname: true,
  },
  fan_huanxi_used: { charlotte: true },
  fan_huanxi_blocked: {
    charlotte: true,
    mark: true,
    marktext: "戏",
    intro: { content: "本回合不能响应其他角色使用的牌" },
    mod: {
      cardEnabled(card, player, event) { if (blocked(player, typeof event === "object" ? event : _status.event)) return false; },
      cardRespondable(card, player) { if (blocked(player)) return false; },
    },
    trigger: { global: "useCard1" },
    forced: true,
    popup: false,
    filter: (event, player) => event.player !== player,
    async content(event, trigger, player) { trigger.directHit.add(player); },
  },
  fan_huanxi_discard: {
    trigger: { player: ["useCardAfter", "respondAfter"] },
    forced: true,
    popup: false,
    filter: event => event.card?.storage?.fan_huanxi === true,
    async content(event, trigger, player) {
      const current = _status.currentPhase;
      if (player.isIn() && current?.isIn() && current.countDiscardableCards(player, "hej") > 0) {
        await player.discardPlayerCard(current, "hej", true);
      }
    },
  },
  fan_moshu: {
    enable: "chooseToUse",
    position: "he",
    filterCard: (card, player) => get.suit(card, player) === "heart",
    viewAs: { name: "wuzhong" },
    viewAsFilter: player => player.countCards("he", { suit: "heart" }) > 0,
    prompt: "将一张♥牌当【无中生有】使用",
    check: card => 8 - get.value(card),
    ai: { order: 7, result: { player: 1 } },
  },
};
