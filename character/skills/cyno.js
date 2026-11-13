import { gainCynoPackCards } from "../../ui/cyno-rarity.js";
import { game, get, lib, ui, _status } from "../../../../noname.js";
import { cynoCardFaceMap } from "../../card/cyno-faces.js";

export const cynoPacks = [
  "fan_heimoshumiyi", "fan_qingyanlonghonglin", "fan_yingxiongderonghe",
  "fan_xingchendehuiguang", "fan_xiwangdechaoyue", "fan_lingbaizhiqiji",
  "fan_dianzijielianjie", "fan_zhenhongzhijuexing", "fan_jiguanglongxilei",
  "fan_chaonujilieche", "fan_qiheizhixuanfeng", "fan_fanshenzhidiwang",
  "fan_liuwuzhijiezhen", "fan_shandaozhijilve",
];
export const cynoPackArt = cynoPacks.map((name, index) =>
  `image/card/cyno-packs/${index + 1}-display.png`
);

const reserves = new WeakMap();
const initialized = new WeakSet();
const voicedUses = new WeakSet();
const summonAudio = (count, extension = "ogg") =>
  `ext:原神/audio/cyno/skill:${count}:${extension}`;

function isSummonCard(event) {
  return [event.card, ...(event.cards || [])].some(card =>
    lib.card[card?.name]?.derivation === "fan_cyno");
}

function updatePrivateReserveView(player) {
  if (player.isOnline()) {
    player.send((playerId, names) => {
      if (game.me?.playerid === playerId) game.me.fanCynoPrivateReserve = names;
    }, player.playerid, reserves.get(player).slice());
  }
}

async function gainPack(player, name) {
  const next = game.createEvent("fan_zhaohuan_gain");
  next.player = player;
  next.setContent(lib.card[name].content);
  await next;
}

function packRows(names = cynoPacks) {
  const buttons = names.map(name => ["trick", "", name]);
  return [[buttons.slice(0, 7), "vcard"], [buttons.slice(7), "vcard"]];
}

function stylePackDialog(dialog) {
  dialog.classList.add("fan-cyno-packs");
  for (const button of dialog.buttons) {
    const name = button.link[2];
    const title = get.translation(name);
    const label = ui.create.div(".fan-cyno-pack-title", button);
    label.textContent = title;
    button._customintro = [title, "可能获得的牌：" + lib.translate[name + "_pack_rewards"]];
  }
}

export function installCynoPackReplay() {
  game.videoContent.fanCynoPackOpen = (player, { id, title, names }) => {
    if (get.idDialog(id)) return;
    const dialog = ui.create.dialog(title, "notouchscroll", "hidden");
    for (const row of packRows(names)) dialog.add(row, true);
    stylePackDialog(dialog);
    dialog.videoId = id;
    dialog.open();
  };
  game.videoContent.fanCynoPackClose = (player, id) => {
    get.idDialog(id)?.close();
  };
}

function packValue(name, player) {
  const enemies = game.countPlayer(target => get.attitude(player, target) < 0);
  const vulnerable = game.countPlayer(target =>
    get.attitude(player, target) < 0 && player.inRange(target) && target.hp <= 2);
  const damaged = player.maxHp - player.hp;
  const scores = {
    fan_heimoshumiyi: 1 + vulnerable,
    fan_qingyanlonghonglin: 1 + 2 * vulnerable,
    fan_yingxiongderonghe: damaged + enemies,
    fan_xingchendehuiguang: enemies,
    fan_xiwangdechaoyue: 2 + vulnerable,
    fan_lingbaizhiqiji: 2,
    fan_dianzijielianjie: enemies + vulnerable,
    fan_zhenhongzhijuexing: 2 + vulnerable,
    fan_jiguanglongxilei: 1 + enemies,
    fan_chaonujilieche: 3 * vulnerable,
    fan_qiheizhixuanfeng: 2 + damaged,
    fan_fanshenzhidiwang: 2 * enemies,
    fan_liuwuzhijiezhen: 1 + enemies,
    fan_shandaozhijilve: 3 + damaged,
  };
  return scores[name] ?? 0;
}

export default {
  fan_lengfeng: {
    audio: "ext:原神/audio/cyno/skill:13",
    locked: false,
    forced: true,
    trigger: { source: "damageBegin1" },
    filter(event, player) {
      return event.player !== player && event.player.isIn() && event.num > 0;
    },
    async content(event, trigger, player) {
      const target = trigger.player;
      if (target.countDiscardableCards(target, "he") < 2) return;
      const result = await target.chooseToDiscard("he", 2, "冷风：你可以弃置两张牌，然后获得1点护甲")
        .set("ai", card => {
          const owner = get.owner(card);
          const damage = _status.event.getParent("damage");
          if (!owner || owner.hujia >= 5 || owner.hasSkillTag("nohujia") || damage?.nohujia) return -1;
          const urgent = damage && damage.num >= owner.hp + (owner.hujia || 0);
          return (urgent ? 8 : 4) - get.value(card, owner);
        }).forResult();
      if (!result.bool || result.cards?.length !== 2) return;
      game.trySkillAudio("fan_lengfeng", player, true);
      if (target.isIn()) await target.changeHujia(1, "gain", 5);
    },
  },
  fan_zhaohuan: {
    audio: false,
    locked: true,
    forced: true,
    trigger: { global: "gameDrawAfter", player: "enterGame" },
    filter(event, player) {
      return !initialized.has(player);
    },
    async content(event, trigger, player) {
      if (initialized.has(player)) return;
      initialized.add(player);
      const hand = player.getCards("h");
      if (hand.length) {
        game.trySkillAudio("fan_zhaohuan_open", player, true);
        await player.discard(hand);
      }
      if (!player.isIn()) return;

      const rows = packRows();
      const id = lib.status.videoId++;
      const title = get.translation(player) + "展示收藏的召唤王卡牌包";
      game.addVideo("fanCynoPackOpen", player, { id, title, names: cynoPacks.slice() });
      game.broadcastAll((chooser, title, rows, id, styleDialog) => {
        if (game.me === chooser) return;
        const dialog = ui.create.dialog(title, "notouchscroll", "hidden");
        for (const row of rows) dialog.add(row, true);
        styleDialog(dialog);
        dialog.videoId = id;
        dialog.open();
      }, player, title, rows, id, stylePackDialog);
      let result;
      try {
        if (!player.isMine() && !player.isOnline()) await game.delay(3);
        if (!player.isIn()) return;
        result = await player.chooseButton([
          "用一个召唤王卡牌包中的牌替换你的手牌", ...rows,
          [stylePackDialog, "handle"],
        ], true).set("ai", button => packValue(button.link[2], player)).forResult();
      } finally {
        game.addVideo("fanCynoPackClose", player, id);
        game.broadcastAll("closeDialog", id);
      }
      const selected = result.links?.[0]?.[2];
      if (!player.isIn() || !cynoPacks.includes(selected)) return;
      await gainPack(player, selected);
      if (!player.isIn()) return;
      reserves.set(player, cynoPacks.filter(name => name !== selected).randomGets(6));
      updatePrivateReserveView(player);
      player.addMark("fan_zhaohuan_reserve", 6, false);
    },
    group: ["fan_zhaohuan_reserve", "fan_zhaohuan_card_voice"],
  },
  fan_zhaohuan_reserve: {
    audio: false,
    locked: true,
    forced: true,
    popup: false,
    marktext: "包",
    intro: {
      content(storage, player) {
        if (player === game.me) {
          const names = reserves.get(player) ?? player.fanCynoPrivateReserve;
          if (names?.length) return "扣置的卡牌包：" + names.map(name => get.translation(name)).join("、");
        }
        return "扣置的卡牌包：" + player.countMark("fan_zhaohuan_reserve") + "个";
      },
    },
    trigger: { player: "phaseUseBegin" },
    filter(event, player) {
      return reserves.has(player);
    },
    async content(event, trigger, player) {
      const name = reserves.get(player)?.randomRemove();
      if (!name) {
        await player.die();
        return;
      }
      updatePrivateReserveView(player);
      player.removeMark("fan_zhaohuan_reserve", 1, false);
      const card = game.createCard(name, ...cynoCardFaceMap[name]);
      game.trySkillAudio("fan_zhaohuan_pack", player, true);
      await gainCynoPackCards(player, card, "draw");
    },
  },
  fan_zhaohuan_open: { audio: summonAudio(1, "mp3") },
  fan_zhaohuan_pack: { audio: summonAudio(5) },
  fan_zhaohuan_negate: { audio: summonAudio(3) },
  fan_zhaohuan_damage: { audio: summonAudio(3) },
  fan_zhaohuan_other: { audio: summonAudio(3) },
  fan_zhaohuan_self: { audio: summonAudio(3) },
  fan_zhaohuan_card_voice: {
    audio: false,
    silent: true,
    forced: true,
    popup: false,
    trigger: { player: "useCardToPlayer", global: "eventNeutralized" },
    filter(event, player, timing) {
      if (timing === "eventNeutralized") {
        const counter = event._neutralize_event;
        return counter?.player === player && event.player !== player &&
          !voicedUses.has(counter) && isSummonCard(counter);
      }
      const use = event.getParent();
      return !voicedUses.has(use) && isSummonCard(use);
    },
    async content(event, trigger, player) {
      const neutralized = event.triggername === "eventNeutralized";
      const use = neutralized ? trigger._neutralize_event : trigger.getParent();
      if (voicedUses.has(use)) return;
      voicedUses.add(use);
      const other = use.targets?.some(target => target !== player);
      const damage = get.type(use.card) !== "equip" && get.tag(use.card, "damage");
      const branch = neutralized ? "negate" : !other ? "self" : damage ? "damage" : "other";
      game.trySkillAudio("fan_zhaohuan_" + branch, player, true);
    },
  },
};
