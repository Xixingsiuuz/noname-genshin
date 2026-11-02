import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = { selected: { buttons: [], cards: [] } };
let sleeves, blocked = false, inPlay = true, selectedResult, inspect;
const material = { hasGaintag: () => true }, other = { hasGaintag: () => true };
const target = { isIn: () => inPlay };
const uses = [], logs = [], dialogs = [];
const game = { checkMod: () => blocked ? false : "unchanged" };
const get = { translation: () => "谋孙权", effect: () => 1, value: () => 1 };
const source = readFileSync(new URL("../character/skills/chiori.js", import.meta.url), "utf8");
const skills = new Function("game", "get", "ui", source.replace(/^import .*;\r?\n/gm, "")
  .replace("export default", "return"))(game, get, ui);
const player = {
  getCards: () => sleeves,
  canUse: () => inPlay,
  logSkill: id => logs.push(id),
  useCard: async (card, cards, to) => uses.push({ card, cards, to }),
  chooseCard() { throw Error("不应出现独立选牌界面"); },
  chooseButton(dialog) {
    dialogs.push(dialog);
    const event = { set(key, value) { this[key] = value; return this; },
      async forResult() { inspect(this, dialog); return selectedResult; } };
    return event;
  },
};
const skill = skills.fan_feiren;
const nameButton = nature => ({ link: ["基本", "", "sha", nature] });
const sleeveButton = { link: material };
const reset = () => {
  sleeves = [material, other]; blocked = false; inPlay = true;
  ui.selected.buttons = []; ui.selected.cards = []; uses.length = logs.length = dialogs.length = 0;
};

for (const nature of [undefined, "thunder", "fire"]) {
  for (const order of ["先袖", "先杀"]) {
    reset();
    const attack = nameButton(nature);
    inspect = (event, dialog) => {
      assert.equal(event.fanPairedConfirm, true);
      assert.equal(event.manualConfirm, true);
      assert.deepEqual(event.selectButton, [0, 1]);
      assert.deepEqual(event.selectCard, [0, 1]);
      assert.equal(event.position, "s");
      assert.equal(dialog.length, 2, "弹窗只展示杀，不重复展示袖");
      assert.equal(dialog[1][0].length, 3);
      assert.equal(event.filterOk(), false);
      assert.equal(event.filterButton(attack), true);
      assert.equal(event.filterCard(material), true);
      if (order === "先袖") ui.selected.cards = [material];
      else ui.selected.buttons = [attack];
      assert.equal(event.filterOk(), false);
      assert.equal(event.filterButton(attack), true);
      assert.equal(event.filterCard(material), true);
      ui.selected.buttons = [attack]; ui.selected.cards = [material];
      assert.equal(event.filterOk(), true);
      ui.selected.cards = [];
      assert.equal(event.filterOk(), false, "撤销任一必要选择立即禁用确定");
      ui.selected.cards = [material]; ui.selected.buttons = [];
      assert.equal(event.filterOk(), false);
      ui.selected.buttons = [attack];
      blocked = true; assert.equal(event.filterOk(), false); blocked = false;
      inPlay = false; assert.equal(event.filterOk(), false); inPlay = true;
      sleeves = [other]; assert.equal(event.filterOk(), false); sleeves = [material, other];
    };
    selectedResult = { bool: true, links: [attack.link], cards: [material] };
    const event = {};
    await skill.cost(event, { player: target }, player);
    assert.equal(dialogs.length, 1);
    assert.equal(event.result.bool, true);
    await skill.content({ cards: event.result.cards, cost_data: event.result.cost_data }, { player: target }, player);
    assert.equal(uses.length, 1);
    assert.equal(uses[0].card.nature, nature);
    assert.equal(uses[0].card.storage.fan_feiren, true);
    assert.equal(uses[0].cards[0], material);
    assert.equal(uses[0].to, target);
    assert.deepEqual(logs, ["fan_feiren"]);
  }
}
reset(); inspect = () => {}; selectedResult = { bool: false };
const cancelled = {};
await skill.cost(cancelled, { player: target }, player);
assert.equal(cancelled.result.bool, false);
assert.equal(uses.length, 0); assert.equal(logs.length, 0);
reset(); sleeves = [other];
await skill.content({ cards: [material] }, { player: target }, player);
assert.equal(uses.length, 0); assert.equal(logs.length, 0);

reset();
inspect = event => {
  const result = event.processAI();
  assert.equal(result.bool, true);
  assert.equal(result.cards[0], material);
  blocked = true;
  assert.equal(event.processAI().bool, false);
};
selectedResult = { bool: false };
await skill.cost({}, { player: target }, player);

// 用本地引擎的实际选择检查核对两类 [0,1] 均不会自动确认。
const checkSource = readFileSync(new URL("../../../noname/game/check.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/export\s*\{\s*Check\s*\};?\s*$/, "return Check;");
const Check = new Function("get", "ui", "lib", "game", checkSource)(
  { select: value => value }, ui, {}, {});
for (const type of ["button", "card"]) {
  const checked = new Check().processSelection({ type, items: [],
    event: { selectButton: [0, 1], selectCard: [0, 1] }, useCache: false, isSelectable: () => true });
  assert.equal(checked.auto, false);
}
console.log("PASS: 飞纫单界面、三种杀、任意选取顺序、撤销及失效检查、取消不耗次、原生检查不自动提交");
