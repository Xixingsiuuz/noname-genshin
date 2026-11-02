import { lib, game, get, ui, _status } from "../../../../noname.js";

const giftTag = player => `fan_xiecui_${player.playerid}`;
const gifted = card => card.gaintag?.some(tag => tag.startsWith("fan_xiecui_"));
const giftable = card => ["basic", "trick"].includes(get.type2(card, false));
const options = () => get.inpileVCardList(([, , name, nature]) => giftable(name)
  && (name !== "sha" || !nature || ["fire", "thunder"].includes(nature)));
// 点击 chooseButton 技能后，引擎把原始用牌过滤器保存到 _backup。
const canChoose = (event, player, card) => (event._backup?.filterCard || event.filterCard)(card, player, event);
const legalOptions = (event, player) => options().filter(([, , name, nature]) =>
  player.countCards("h", card => gifted(card) && get.type2(card, false) === get.type2(name)) > 0
  && canChoose(event, player, { name, nature }));
const hasGiftMaterial = (player, name) => player.countCards("h", card => gifted(card)
  && get.type2(card, false) === get.type2(name)) > 0;

async function transferGift(player, cards, target) {
  // 来源编号用于区分多名艾梅莉埃，显示时统一翻译成技能名。
  game.broadcastAll(tag => { lib.translate[tag] = "撷萃"; }, giftTag(player));
  target.addSkill("fan_xiecui_gift");
  const gain = player.give(cards, target);
  gain.gaintag.add(giftTag(player));
  await gain;
  game.trySkillAudio("fan_xiecui_voice", player);
}

async function giveGift(event, trigger, player) {
  const result = await player.chooseCardTarget({
    position: "h", selectCard: 1, filterCard: giftable,
    filterTarget: (card, player, target) => target !== player,
    prompt: get.prompt("fan_xiecui"),
    prompt2: false,
    ai1: card => 7 - get.value(card),
    ai2: target => get.attitude(player, target),
  }).forResult();
  if (!result.bool) return;
  const target = result.targets[0];
  player.logSkill("fan_xiecui", target);
  await transferGift(player, result.cards, target);
}

export default {
  fan_xiecui: {
    audio: false,
    enable: "phaseUse", usable: 1,
    filter: (event, player) => player.countCards("h", giftable) > 0 && game.hasPlayer(target => target !== player),
    // 在原生出牌选择中完成选牌、选目标，确认后才进入 useSkill 并计次。
    position: "h",
    filterCard: giftable,
    selectCard: 1,
    filterTarget: (card, player, target) => target !== player,
    selectTarget: 1,
    discard: false,
    lose: false,
    delay: 0,
    check: card => 7 - get.value(card),
    async content(event, trigger, player) {
      await transferGift(player, event.cards, event.targets[0]);
    },
    group: "fan_xiecui_damage",
    ai: { order: 7, result: { target: (player, target) => 1 } },
    subSkill: {
      damage: {
        trigger: { global: "damageEnd" }, direct: true,
        filter: (event, player) => event.hasNature("fire") && player.countCards("h", giftable) > 0
          && game.hasPlayer(target => target !== player),
        content: giveGift,
      },
    },
  },
  // 受赠者保留此辅助技能；赠牌离开后使用失牌事件的标签快照识别来源。
  fan_xiecui_gift: {
    charlotte: true,
    // 此步只进入牌名选择，不选择实体牌；直接确认可避免关闭自动确认时停在灰牌界面。
    direct: true,
    enable: ["chooseToUse", "chooseToRespond"],
    filter: (event, player) => player.countCards("h", gifted) > 0 && legalOptions(event, player).length > 0,
    chooseButton: {
      dialog: (event, player) => ui.create.dialog("撷萃", [legalOptions(event, player), "vcard"]),
      check(button) {
        // 参考手杀杜预 spmiewu：响应需求与主动用牌收益分别评估。
        if (_status.event.getParent().type !== "phase") return 1;
        if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(button.link[2])) return 0;
        return get.player().getUseValue({ name: button.link[2], nature: button.link[3] });
      },
      backup(links) {
        return {
          filterCard: card => gifted(card) && get.type2(card, false) === get.type2(links[0][2]),
          position: "h", selectCard: 1,
          viewAs: { name: links[0][2], nature: links[0][3] }, popname: true,
          check: card => 8 - get.value(card),
        };
      },
      prompt: links => `将一张因【撷萃】获得的牌当${get.translation(links[0][3] || "")}${get.translation(links[0][2])}使用或打出`,
    },
    hiddenCard(player, name) {
      return lib.inpile.includes(name) && giftable(name) && hasGiftMaterial(player, name);
    },
    ai: {
      order: 7,
      fireAttack: true,
      respondSha: true,
      respondShan: true,
      save: true,
      skillTagFilter(player, tag, arg) {
        const name = tag === "respondSha" ? "sha" : tag === "respondShan" ? "shan"
          : tag === "fireAttack" ? "huogong" : "tao";
        if (tag === "save" && arg === player && hasGiftMaterial(player, "jiu")) return true;
        return hasGiftMaterial(player, name);
      },
      result: {
        player(player) {
          return _status.event.dying ? get.attitude(player, _status.event.dying) : 1;
        },
      },
    },
    group: ["fan_xiecui_gift_record", "fan_xiecui_gift_draw"],
    subSkill: {
      record: {
        trigger: { player: ["useCard", "respond"] }, forced: true, popup: false, charlotte: true,
        filter(event, player) {
          return player.hasHistory("lose", loss => (loss.relatedEvent || loss.getParent()) === event
            && event.cards?.some(card => loss.gaintag_map?.[card.cardid]?.some(tag => tag.startsWith("fan_xiecui_"))));
        },
        async content(event, trigger, player) {
          trigger.fan_xiecui_draw = true;
          // 打出会摸牌，但只有使用才产生余薰记录。
          if (trigger.name !== "useCard") return;
          const tags = new Set();
          for (const loss of player.getHistory("lose", loss => (loss.relatedEvent || loss.getParent()) === trigger)) {
            for (const card of trigger.cards || []) {
              for (const tag of loss.gaintag_map?.[card.cardid] || []) tags.add(tag);
            }
          }
          for (const owner of game.filterPlayer(owner => owner !== player && owner.hasSkill("fan_yuxun") && tags.has(giftTag(owner)))) {
            // useCard.card 是转化后实际使用的牌；cards 中的实体牌仅用于识别赠牌来源。
            if (!owner.getStorage("fan_yuxun").includes(trigger.card.name)) {
              owner.markAuto("fan_yuxun", [trigger.card.name]);
              game.trySkillAudio("fan_yuxun_record_voice", owner);
            }
          }
        },
      },
      draw: {
        trigger: { player: ["useCardAfter", "respondAfter"] }, forced: true, popup: false, charlotte: true,
        filter: event => event.fan_xiecui_draw === true,
        async content(event, trigger, player) { if (player.isIn()) await player.draw(); },
      },
    },
  },
  fan_yuxun: {
    audio: false,
    direct: true,
    enable: ["chooseToUse", "chooseToRespond"], onremove: true, marktext: "薰",
    intro: { content: "已记录牌名：$" },
    filter: (event, player) => player.countCards("hes") > 0
      && player.getStorage("fan_yuxun").some(name => canChoose(event, player, { name })),
    chooseButton: {
      dialog(event, player) {
        const list = player.getStorage("fan_yuxun").filter(name => canChoose(event, player, { name }))
          .map(name => [get.type(name), "", name]);
        return ui.create.dialog("余薰", [list, "vcard"]);
      },
      check: button => get.player().getUseValue({ name: button.link[2] }),
      backup(links) {
        return {
          audio: "fan_yuxun_convert_voice",
          filterCard: true, position: "hes", selectCard: 1,
          viewAs: { name: links[0][2] }, popname: true,
          check: card => 7 - get.value(card),
          onuse(result, player) { player.unmarkAuto("fan_yuxun", [result.card.name]); },
          onrespond(event, player) { player.unmarkAuto("fan_yuxun", [event.card.name]); },
        };
      },
      prompt: links => `移除“${get.translation(links[0][2])}”记录，将一张牌当此牌使用或打出`,
    },
    ai: {
      order: 8,
      respondSha: true,
      respondShan: true,
      skillTagFilter(player, tag) {
        return player.countCards("hes") > 0
          && player.getStorage("fan_yuxun").includes(tag === "respondSha" ? "sha" : "shan");
      },
      result: { player: 1 },
    },
  },
  fan_xiecui_voice: { audio: "ext:原神/audio/emilie/skill:3" },
  fan_yuxun_record_voice: { audio: "ext:原神/audio/emilie/skill:2" },
  fan_yuxun_convert_voice: { audio: "ext:原神/audio/emilie/skill:3" },
};
