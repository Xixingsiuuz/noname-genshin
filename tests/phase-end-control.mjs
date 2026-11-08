import assert from "node:assert/strict";
import { installPhaseEndControl } from "../ui/confirm.js";
const visible = new Set();
const status = { event: { name: "chooseToUse", type: "phase", isMine: () => true } };
const ui = { create: { control(...args) {
  const node = { args, close() { visible.delete(this); } };
  visible.add(node);
  return node;
} } };
installPhaseEndControl(ui, status);
const installed = ui.create.control;
installPhaseEndControl(ui, status);
assert.equal(ui.create.control, installed);
const callback = () => {};
// 复现本地原生 chooseToUse 的创建并覆盖引用操作。
const create = () => status.event.endButton = ui.create.control("结束回合", "stayleft", callback);
create();
const first = status.event.endButton;
create(); create();
assert.equal(visible.size, 1);
assert.equal(visible.has(first), false);
assert.equal(status.event.endButton.args[2], callback);
const end = status.event.endButton;
ui.create.control("取消");
assert.equal(visible.has(end), true);
status.event.endButton.close();
delete status.event.endButton;
assert.equal(visible.has(end), false);
console.log("PASS: 原生出牌步骤重复创建只保留一个结束回合，回调与正常关闭不变");

for (const node of [...visible]) node.close();
// A new native chooseToUse owns no reference to the old event's control.
create();
const oldEvent=status.event, oldButton=oldEvent.endButton;
oldButton.style={};
status.event={name:"chooseToUse",type:"phase",isMine:()=>true};
create();
assert.equal(visible.has(oldButton),false);
assert.equal(oldButton.style.display,"none");
assert.equal(visible.size,1);
// Creation can occur while the engine status still refers to a nested event.
status.event={name:"trigger"};
create();assert.equal(visible.size,1);
assert.equal(status.event.endButton.args[2],callback);
status.event.endButton.close();assert.equal(visible.size,0);
create();assert.equal(visible.size,1);
console.log("PASS: 跨事件残留、关闭动画立即隐藏、嵌套事件创建和关闭后重新创建");
