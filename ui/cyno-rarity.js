const mirrorFacets = [
  ['8% 28%, 30% 8%, 34% 33%', '#e2f8ffb5'],
  ['38% 9%, 63% 24%, 40% 36%', '#91d7ff98'],
  ['67% 15%, 91% 28%, 73% 46%', '#f2ecffa5'],
  ['12% 39%, 33% 36%, 24% 63%', '#c8efff91'],
  ['36% 40%, 61% 29%, 56% 57%', '#e8f7ff92'],
  ['67% 45%, 91% 33%, 90% 58%', '#b9c7ff95'],
  ['28% 64%, 53% 60%, 46% 81%', '#e2f8ffaf'],
  ['57% 61%, 84% 64%, 64% 85%', '#d4bcff90'],
  ['68% 86%, 92% 66%, 86% 91%', '#f2faff90'],
];

export function applyCynoRarity(cardNode, rarity) {
  if (rarity != null && !['gold', 'mirror', 'holo'].includes(rarity)) {
    throw new RangeError('Unknown Cyno card rarity: ' + rarity);
  }
  cardNode.querySelector(':scope > .cyno-foil')?.remove();
  if (rarity == null) return;

  const overlay = cardNode.ownerDocument.createElement('span');
  overlay.className = 'cyno-foil cyno-foil--' + rarity;
  overlay.setAttribute('aria-hidden', 'true');
  if (rarity === 'mirror') {
    mirrorFacets.forEach(([shape, glint], index) => {
      const facet = cardNode.ownerDocument.createElement('span');
      facet.className = 'cyno-foil__shard';
      facet.style.setProperty('--shape', shape);
      facet.style.setProperty('--glint', glint);
      facet.style.setProperty('--delay', -(index * 0.47) + 's');
      overlay.append(facet);
    });
  }
  cardNode.append(overlay);
}

const colorArtCards = new Set([
  "fan_baizhishaonv",
  "fan_chaonujilieche",
  "fan_chongzhuangkaiyi",
  "fan_chuanshuoheishi",
  "fan_dianzijielianjie",
  "fan_diwanglingyu",
  "fan_fanbeijihui",
  "fan_fanshenzhidiwang",
  "fan_feipinhuishou",
  "fan_heiganglong",
  "fan_heiguafuqian",
  "fan_heilong",
  "fan_heimodaozhen",
  "fan_heimoshumiyi",
  "fan_heimoshushi",
  "fan_heixuanfeng",
  "fan_heiyandan",
  "fan_huizhuandiaoche",
  "fan_jiguanglongxilei",
  "fan_jinjihujiao",
  "fan_jueduilingdu",
  "fan_kaiyiya",
  "fan_lianmayuzhe",
  "fan_lingbaizhiqiji",
  "fan_liuwuzhijiezhen",
  "fan_liuxinglong",
  "fan_modaoqishi",
  "fan_paotalieche",
  "fan_potianjuai",
  "fan_qiheizhixuanfeng",
  "fan_qingyanbailong",
  "fan_qingyanlonghonglin",
  "fan_ronghe",
  "fan_ruisui",
  "fan_shandaojiling",
  "fan_shandaoqidong",
  "fan_shandaozhijilve",
  "fan_shanguangxinyi",
  "fan_shinai",
  "fan_tiandi",
  "fan_tiankonghongcai",
  "fan_tiaolv",
  "fan_wangjichongtu",
  "fan_wangjiwakuang",
  "fan_weilaihuang",
  "fan_wuxian",
  "fan_wuxianpaoying",
  "fan_xiedi",
  "fan_xingchendehuiguang",
  "fan_xingchenlong",
  "fan_xingguangliqiu",
  "fan_xinxing",
  "fan_xinyuzhouxia",
  "fan_xiwangdechaoyue",
  "fan_xiwanghuang",
  "fan_yihualingyi",
  "fan_yingxiongderonghe",
  "fan_yiyanbawang",
  "fan_yiyanhulong",
  "fan_yiyannilong",
  "fan_yongyuanzhihun",
  "fan_yuanshishengming",
  "fan_yuanxiedi",
  "fan_yuzhouyaobian",
  "fan_zhengyichuanshuo",
  "fan_zhengyihuoban",
  "fan_zhenhongzhijuexing",
  "fan_zhenmoziyan",
  "fan_zhouyuleiqie",
  "fan_zhunwuweijian",
  "fan_ziyan"
]);
const rarityKey = "fanCynoRarity";
const levels = ["normal", "gold", "mirror", "holo"];

export function rollCynoRarity(random = Math.random) {
  const roll = Math.floor(random() * 100) + 1;
  if (roll <= 20) return "gold";
  if (roll <= 30) return "mirror";
  if (roll <= 35) return "holo";
  return "normal";
}

function restore(card, rarity) {
  if (!card?.ownerDocument || !levels.includes(rarity)) return;
  const colorArt = rarity === "holo" && colorArtCards.has(card.name);
  if (colorArt) {
    const image = new URL("../image/card/cyno-color/" + card.name + "-framed.png", import.meta.url);
    card.style.setProperty("--fan-cyno-color-art", 'url("' + image.href + '")');
  } else {
    card.style?.removeProperty("--fan-cyno-color-art");
  }
  if (card[rarityKey] === rarity && (rarity === "normal" ||
    card.querySelector(":scope > .cyno-foil--" + rarity))) return;
  card[rarityKey] = rarity;
  applyCynoRarity(card, rarity === "normal" ? null : rarity);
}

let previewRarity = () => null;

export function copyCynoRarity(card, source) {
  restore(card, previewRarity() ?? inheritCynoRarity("normal", source));
}

export function inheritCynoRarity(rolled, source) {
  const material = source?.cards?.length === 1 ? source.cards[0] : null;
  const floor = Math.max(levels.indexOf(source?.[rarityKey]), levels.indexOf(material?.[rarityKey]));
  return levels[Math.max(levels.indexOf(rolled), floor, 0)];
}

export function createCynoReward(game, source, ...args) {
  const card = game.createCard(...args);
  restore(card, previewRarity() ?? inheritCynoRarity(card[rarityKey] ?? rollCynoRarity(), source));
  return card;
}

export function gainCynoPackCards(player, cards, animate, source) {
  for (const card of Array.isArray(cards) ? cards : [cards]) {
    if (card[rarityKey] === undefined) restore(card, previewRarity() ?? inheritCynoRarity(rollCynoRarity(), source));
  }
  return player.gain(cards, animate);
}

const installed = new WeakSet();
export function installCynoRarity(get, lib, ui, game, getPreviewRarity) {
  previewRarity = () => {
    const rarity = getPreviewRarity();
    return levels.includes(rarity) ? rarity : null;
  };
  if (installed.has(get)) return;
  installed.add(get);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./cyno-rarity.css", import.meta.url).href;
  document.head.append(link);

  const createCard = game.createCard;
  game.createCard = function (...args) {
    const card = createCard.apply(this, args);
    if (lib.card[card.name]?.derivation === "fan_cyno" && card[rarityKey] === undefined) {
      restore(card, previewRarity() || rollCynoRarity());
    }
    return card;
  };

  const previewAnchors = new WeakMap();
  const placePoppedDialog = lib.placePoppedDialog;
  lib.placePoppedDialog = function (dialog, event, ...args) {
    const anchor = previewAnchors.get(dialog);
    if (anchor?.isConnected) {
      const bounds = anchor.getBoundingClientRect();
      event = {
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
      };
    }
    return placePoppedDialog.call(this, dialog, event, ...args);
  };

  const nodeintro = get.nodeintro;
  get.nodeintro = function (node, ...args) {
    const intro = nodeintro.call(this, node, ...args);
    const card = node?.link?.name ? node.link : node;
    const definition = lib.card[card?.name];
    if (definition?.derivation !== "fan_cyno" || !definition.type ||
      !intro?.content) return intro;

    const label = get.translation(definition.type) + "牌";
    const typeLine = Array.from(intro.content.children).find(child =>
      child.textContent.trim().startsWith(label) || child.textContent.trim().startsWith("特殊" + label));
    if (!typeLine || intro.content.querySelector(".fan-cyno-equip-preview")) return intro;
    const materials = card[card.cardSymbol]?.cards;
    const physical = materials?.length === 1 && materials[0].name === card.name ? materials[0] : card;
    const preview = ui.create.card().init([physical.suit, physical.number, card.name, physical.nature]);
    const rarity = physical[rarityKey] ?? card[rarityKey];
    restore(preview, rarity);
    const row = document.createElement("div");
    row.className = "fan-cyno-equip-preview";
    row.append(preview);
    typeLine.after(row);
    if (node?.getBoundingClientRect) previewAnchors.set(intro, node);
    return intro;
  };

  // The two native formats have different field order but both end at index 4.
  const { cardInfo, infoCard, cardInfoOL, infoCardOL } = get;
  get.cardInfo = function (card, ...args) {
    const info = cardInfo.call(this, card, ...args);
    if (levels.includes(card[rarityKey])) info[5] = card[rarityKey];
    return info;
  };
  get.infoCard = function (info, ...args) {
    const card = infoCard.call(this, info, ...args);
    restore(card, info?.[5]);
    return card;
  };
  const prefix = "_noname_card:";
  get.cardInfoOL = function (card, ...args) {
    const info = cardInfoOL.call(this, card, ...args);
    if (!levels.includes(card[rarityKey]) || !info.startsWith(prefix)) return info;
    const fields = JSON.parse(info.slice(prefix.length));
    fields[5] = card[rarityKey];
    return prefix + JSON.stringify(fields);
  };
  get.infoCardOL = function (info, ...args) {
    const card = infoCardOL.call(this, info, ...args);
    if (card?.ownerDocument && typeof info === "string" && info.startsWith(prefix)) {
      restore(card, JSON.parse(info.slice(prefix.length))[5]);
    }
    return card;
  };
}
