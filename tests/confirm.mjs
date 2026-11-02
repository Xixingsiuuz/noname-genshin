import assert from "node:assert/strict";
import { installSelectionConfirm, installXiajiControls } from "../ui/confirm.js";

// 保留本地引擎的状态缓存、按钮替换、关闭及自定义回调语义。
const ui = { create: { confirm(str, func) {
  if (ui.confirm && ui.confirm.str === str) return;
  const links = str === "o" ? ["ok"] : str === "c" ? ["cancel"]
    : str === "oc" || str === "co" ? ["ok", "cancel"] : null;
  if (!links) { delete ui.confirm; return; }
  ui.confirm ??= { style: {} };
  ui.confirm.childNodes = links.map(link => ({ link, style: {}, offsetWidth: 50,
    attributes: {}, setAttribute(k,v) { this.attributes[k]=v; },
    classList: { values: new Set(), toggle(k,on) { if(on) this.values.add(k); else this.values.delete(k); }, contains(k) { return this.values.has(k); } },
  }));
  ui.confirm.str = str;
  if (func) ui.confirm.custom = func;
  else delete ui.confirm.custom;
} } };
const status = { event: { name: "chooseToUse", skill: "zhangba_skill", isMine: () => true } };
const lib = {skill:{fan_kuanghuo:{fanPairedConfirm:true}}};
installSelectionConfirm(ui, status, lib);
const installed = ui.create.confirm;
installSelectionConfirm(ui, status);
assert.equal(ui.create.confirm, installed);
const links = () => ui.confirm?.childNodes.map(node => node.link);
ui.create.confirm("c");
assert.deepEqual(links(), ["cancel"]);
assert.equal(ui.confirm.str, "c");
ui.create.confirm("oc");
assert.deepEqual(links(), ["ok", "cancel"]);
assert.equal(ui.confirm.childNodes[1].style.marginLeft, "32px");
assert.equal(ui.confirm.style.width, "132px");
// 丈八选牌后撤销选择、退出技能，再正常使用牌并指定目标。
ui.create.confirm("c");
assert.deepEqual(links(), ["cancel"]);
delete status.event.skill;
ui.create.confirm("c");
ui.create.confirm("oc");
assert.deepEqual(links(), ["ok", "cancel"]);
assert.equal(ui.confirm.str, "oc");
ui.create.confirm("o");
assert.deepEqual(links(), ["ok"]);
assert.equal(ui.confirm.childNodes[0].style.marginLeft, "");
assert.equal(ui.confirm.style.width, "50px");
const custom = () => {};
ui.create.confirm("co", custom);
assert.equal(ui.confirm.custom, custom);
ui.create.confirm("c");
assert.equal(ui.confirm.custom, undefined);
ui.create.confirm("");
assert.equal(ui.confirm, undefined);
status.event = {name:"chooseButton", fanPairedConfirm:true, isMine:()=>true};
ui.create.confirm("c");
assert.deepEqual(links(),["ok","cancel"]);
assert(ui.confirm.childNodes[0].classList.contains("disabled"));
assert.equal(ui.confirm.childNodes[0].style.pointerEvents,"none");
assert.equal(ui.confirm.childNodes[0].attributes['aria-disabled'],'true');
assert(!ui.confirm.childNodes[1].classList.contains("disabled"));
// 原生缓存同一个 oc 控件，仍需逐次刷新灰色/可点击状态。
ui.create.confirm("o");
assert.deepEqual(links(),["ok","cancel"]);
assert(!ui.confirm.childNodes[0].classList.contains("disabled"));
assert.equal(ui.confirm.childNodes[0].style.pointerEvents,"");
ui.create.confirm("c");
assert(ui.confirm.childNodes[0].classList.contains("disabled"));
status.event = {name:"chooseToUse", isMine:()=>true};
ui.create.confirm("oc");
assert(!ui.confirm.childNodes[0].classList.contains("disabled"));
ui.create.confirm("c"); assert.deepEqual(links(),["cancel"]);
ui.create.confirm(""); assert.equal(ui.confirm,undefined);
status.event = {name:"chooseToUse", skill:"fan_kuanghuo", isMine:()=>true};
ui.create.confirm("c");assert.deepEqual(links(),["ok","cancel"]);
assert(ui.confirm.childNodes[0].classList.contains("disabled"));
ui.create.confirm("o");assert(!ui.confirm.childNodes[0].classList.contains("disabled"));
delete status.event.skill;ui.create.confirm("c");assert.deepEqual(links(),["cancel"]);
console.log("PASS: 原生按钮状态、技能取消后普通用牌、自定义回调及按钮关闭保持一致，支持技能声明成对确认");


let charge=1, clicks=0;
const controlStatus={event:{name:'chooseControl',fan_xiaji_count_choice:true,player:{countCharge:()=>charge}}};
const nativeUI={click:{control(){clicks++}},create:{control(links){return {childNodes:links.map(link=>({link,style:{},attributes:{},setAttribute(k,v){this.attributes[k]=v},classList:{toggle(){}}}))}}}};
installXiajiControls(nativeUI,controlStatus);
const controls=nativeUI.create.control(['1','2','3','cancel2']);
controls.childNodes.forEach(node=>node.parentNode=controls);
assert.deepEqual(controls.childNodes.map(n=>n.link),['1','2','3','cancel2']);
assert.equal(controls.childNodes[0].style.pointerEvents,'');
assert.equal(controls.childNodes[1].attributes['aria-disabled'],'true');
nativeUI.click.control.call(controls.childNodes[1]);assert.equal(clicks,0,'unaffordable click rejected');
nativeUI.click.control.call(controls.childNodes[0]);assert.equal(clicks,1,'affordable amount reaches native handler');
nativeUI.click.control.call(controls.childNodes[3]);assert.equal(clicks,2,'return reaches native handler');
charge=3;nativeUI.click.control.call(controls.childNodes[2]);assert.equal(clicks,3,'resources checked again on click');
assert.equal(controls.childNodes[2].style.opacity,'');
controlStatus.event={name:'chooseToMove',forced:true,isMine:()=>true};
nativeUI.click.control.call(controls.childNodes[2]);assert.equal(clicks,4,'other controls unchanged');
status.event={name:'chooseToMove',forced:true,isMine:()=>true};
ui.create.confirm('o');assert.deepEqual(ui.confirm.childNodes.map(n=>n.link),['ok']);
console.log('PASS: 夏祭原生小型数量按钮、足额点击、返回、资源变化、其他控件和强制顶牌流程（模拟）');
