import { get } from "../../../noname.js";
import { yaemikoCards, yaemikoCardTranslate } from "./yaemiko.js";
import { xianyunCards, xianyunCardTranslate } from "./xianyun.js";
import { cynoCards, cynoCardTranslate } from "./cyno.js";
import { blueEyesCards, blueEyesTranslate } from "./blue-eyes.js";
import { heroCards, heroTranslate } from "./heroes.js";
import { stardustCards, stardustTranslate } from "./stardust.js";
import { utopiaCards, utopiaTranslate } from "./utopia.js";
import { pendulumCards, pendulumTranslate } from "./pendulum.js";
import { cyberseCards, cyberseTranslate } from "./cyberse.js";
import { redEyesCards, redEyesTranslate } from "./red-eyes.js";
import { cyberDragonCards, cyberDragonTranslate } from "./cyber-dragon.js";
import { trainCards, trainTranslate } from "./trains.js";
import { blackwingCards, blackwingTranslate } from "./blackwing.js";
import { monarchCards, monarchTranslate } from "./monarch.js";
import { skyStrikerCards, skyStrikerTranslate } from "./sky-striker.js";
import { sixSamuraiCards, sixSamuraiTranslate } from "./six-samurai.js";

const deckTips = [
  ["黑魔术师", "fan_heimoshumiyi", cynoCards, ["wuxie", "wuzhong"]],
  ["青眼白龙", "fan_qingyanlonghonglin", blueEyesCards, ["sha", "jiu"]],
  ["元素英雄", "fan_yingxiongderonghe", heroCards, ["sha"], "装备牌"],
  ["星尘同步", "fan_xingchendehuiguang", stardustCards, ["shan"], "点数为1至3的牌"],
  ["希望皇霍普", "fan_xiwangdechaoyue", utopiaCards, ["sha", "wuxie"]],
  ["异色眼", "fan_lingbaizhiqiji", pendulumCards, ["sha", "jiu"]],
  ["码语者", "fan_dianzijielianjie", cyberseCards, ["sha", "guohe"]],
  ["真红眼", "fan_zhenhongzhijuexing", redEyesCards, ["sha", "huogong"]],
  ["电子龙", "fan_jiguanglongxilei", cyberDragonCards, ["tiesuo"], "防具牌"],
  ["列车", "fan_chaonujilieche", trainCards, ["sha", "tiesuo"]],
  ["黑羽", "fan_qiheizhixuanfeng", blackwingCards, [], "黑色【杀】、黑色非【杀】牌"],
  ["真帝王", "fan_fanshenzhidiwang", monarchCards, ["sha", "guohe"]],
  ["闪刀", "fan_shandaozhijilve", skyStrikerCards, ["shan", "tao"]],
  ["六武众", "fan_liuwuzhijiezhen", sixSamuraiCards, ["sha", "juedou"]],
];

// Card packs may not have registered their translations when this package is built.
const pileCardNames = {
  sha: "杀", jiu: "酒", shan: "闪", tao: "桃",
  wuxie: "无懈可击", wuzhong: "无中生有", guohe: "过河拆桥",
  huogong: "火攻", tiesuo: "铁索连环", taoyuan: "桃园结义",
};

function addDeckTips(translate) {
  for (const [name, starter, cards, pile, category] of deckTips) {
    const derived = Object.keys(cards).filter(id => id !== starter);
    translate[starter + "_pack_rewards"] = [...pile.map(id => get.poptip(id)), category,
      ...derived.map(id => get.poptip(id))].filter(Boolean).join("、");
    const pileText = [...pile.map(id => `【${pileCardNames[id]}】`), category].filter(Boolean).join("、");
    const info = `牌堆：${pileText}<br>衍生牌：${derived.map(id => get.poptip(id)).join("、")}`;
    const tip = get.poptip({ id: starter + "_deck", name: `【${name}】`, info });
    const hover = [
      "牌堆：" + [...pile.map(id => pileCardNames[id]), category].filter(Boolean).join("、"),
      "衍生牌：" + derived.map(id => translate[id]).join("、"),
    ].join("&#10;");
    const key = starter + "_info";
    translate[key] = translate[key].replace(`【${name}】`, tip.replace("<noname-poptip ", `<noname-poptip title="${hover}" `));
  }
}

export function createCardPackage() {
  const pack = {
    connect: true,
    card: {
      ...yaemikoCards,
      ...xianyunCards,
      ...cynoCards,
      ...blueEyesCards,
      ...heroCards,
      ...stardustCards,
      ...utopiaCards,
      ...pendulumCards,
      ...cyberseCards,
      ...redEyesCards,
      ...cyberDragonCards,
      ...trainCards,
      ...blackwingCards,
      ...monarchCards,
      ...sixSamuraiCards,
      ...skyStrikerCards,
    },
    translate: {
      ...yaemikoCardTranslate,
      ...xianyunCardTranslate,
      ...cynoCardTranslate,
      ...blueEyesTranslate,
      ...heroTranslate,
      ...stardustTranslate,
      ...utopiaTranslate,
      ...pendulumTranslate,
      ...cyberseTranslate,
      ...redEyesTranslate,
      ...cyberDragonTranslate,
      ...trainTranslate,
      ...blackwingTranslate,
      ...monarchTranslate,
      ...sixSamuraiTranslate,
      ...skyStrikerTranslate,
    },
    // 仅由仙助生成，不加入牌堆。
    list: [],
  };

  const numerals = "①②③④⑤⑥⑦⑧⑨⑩";
  for (const [name, card] of Object.entries(pack.card)) {
    if (card.derivation === "fan_cyno") {
      const globals = Array.isArray(card.global) ? card.global : card.global ? [card.global] : [];
      pack.card[name] = Object.defineProperties({}, Object.getOwnPropertyDescriptors(card));
      pack.card[name].global = [...globals, "fan_cyno_card_sound"];
    }
    const key = name + "_info";
    const description = pack.translate[key];
    if (!card.derivation || typeof description !== "string") continue;
    const effects = description.split(/(<br\s*\/?\s*>|\r?\n)/i);
    if (effects.length < 3) continue;
    pack.translate[key] = effects.map((part, index) =>
      index % 2 ? part : (numerals[index / 2] ?? `（${index / 2 + 1}）`) + part.replace(/^[①-⑳]/u, "")
    ).join("");
  }
  addDeckTips(pack.translate);
  return pack;
}
