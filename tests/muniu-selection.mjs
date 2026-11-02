import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installMuniuSelection } from "../ui/confirm.js";

// 使用本地武器的实际 backup，核对接入后仍保留原生结算函数。
const nativeSource = readFileSync(new URL("../../../card/extra.js", import.meta.url), "utf8");
const start = nativeSource.indexOf("        backup(links, player) {", nativeSource.indexOf("    muniu_skill: {"));
const end = nativeSource.indexOf("        prompt(links, player) {", start);
const native = new Function(`return ({${nativeSource.slice(start, end)}}).backup;`)();
const wagon = { vcardID: "wagon1" };
const player = { countCards: zone => zone === "h" ? 3 : 0 };
const status = { event: { name: "chooseToUse", player, muniu_skill: [wagon], isMine: () => true } };
const lib = { skill: { muniu_skill: {
  filter: (event, owner) => owner.countCards("h") && event.muniu_skill.length,
  chooseButton: { backup: native },
} } };
const calls = [];
const ui = { click: { skill(id) { calls.push(id); status.event.skill = id; } } };
installMuniuSelection(ui, status, lib);
const installed = ui.click.skill;
installMuniuSelection(ui, status, lib);
assert.equal(ui.click.skill, installed);
ui.click.skill("muniu_skill");
assert.equal(calls.at(-1), "muniu_skill_backup");
const backup = lib.skill.muniu_skill_backup;
assert.equal(backup.position, "h");
assert.equal(backup.selectCard, 1);
assert.equal(backup.filterCard, true);
assert.equal(backup.manualConfirm, true);
assert.equal(backup.muniu, wagon.vcardID);
assert.equal(backup.discard, false);
assert.equal(backup.lose, false);
assert.equal(backup.content.toString(), native([wagon], player).content.toString());
assert.equal(backup.prepare.toString(), native([wagon], player).prepare.toString());

// 使用本地 GameEvent.backup/restore，确认扣置只能选择手牌，取消恢复原入口。
const eventSource = readFileSync(new URL("../../../noname/library/element/gameEvent.js", import.meta.url), "utf8");
const backupStart = eventSource.indexOf("  backup(skill) {");
const restoreEnd = eventSource.indexOf("  // #endregion", backupStart);
const methods = new Function("get", "game", "_status", `return new (class {${eventSource.slice(backupStart, restoreEnd)}})();`)(
  { info: id => lib.skill[id], filter: value => typeof value === "function" ? value : () => !!value }, {}, status);
const event = { ...status.event, filterCard: () => true, position: "hs", selectCard: 1,
  backup: methods.backup, restore: methods.restore };
event.backup("muniu_skill_backup");
assert.equal(event.position, "h");
assert.equal(event.filterCard({}, player), true);
event.restore();
assert.equal(event.position, "hs");
assert.equal(event.skill, undefined);
assert.equal(wagon.storage, undefined, "仅进入或取消选择不消耗次数");

status.event.muniu_skill = [wagon, { vcardID: "wagon2" }];
ui.click.skill("muniu_skill");
assert.equal(calls.at(-1), "muniu_skill", "多辆木牛保留原生装备选择");
status.event.muniu_skill = [wagon];
status.connectMode = true;
ui.click.skill("muniu_skill");
assert.equal(calls.at(-1), "muniu_skill");
ui.click.skill("zhangba_skill");
assert.equal(calls.at(-1), "zhangba_skill");
console.log("PASS: 单辆木牛直接选手牌、原生扣置结算保留、取消恢复、多辆及其他装备入口不变");
