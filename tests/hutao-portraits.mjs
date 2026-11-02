import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../ui/detail-portraits.js",import.meta.url),"utf8");
const dialogs=[],observers=[];let writes=0;
const lib={config:{skin:{}},assetURL:""};
const document={getElementById:()=>true,querySelectorAll:()=>dialogs};
class MutationObserver { constructor(callback){this.callback=callback;observers.push(this);}observe(node,options){this.node=node;assert.deepEqual(options.attributeFilter,["style"]);} }
const ui={create:{buttonPresets:{character(id){return {link:id,style:{}};}}},click:{charactercard(){
  const style=new Proxy({}, {set(target,key,value){writes++;target[key]=value;return true;}});
  const portrait={style};const dialog={portrait,querySelector:()=>portrait,classList:{add(){}}};dialogs.push(dialog);return dialog;
}}};
const {installDetailPortraits,hutaoPortrait}=new Function("document","MutationObserver",source.replace(/export function/g,"function")+"\nreturn {installDetailPortraits,hutaoPortrait};")(document,MutationObserver);
installDetailPortraits(ui,lib);const wrapped=ui.click.charactercard;installDetailPortraits(ui,lib);assert.equal(ui.click.charactercard,wrapped);
const dialog=ui.click.charactercard("fan_hutao");assert(dialog.portrait.style.backgroundImage.includes("hutao-detail.png"));
assert(ui.create.buttonPresets.character("fan_hutao").style.backgroundImage.includes("hutao-select.png"));
for(const [skin,name] of [["1.png","hutao-skin1"],["2.png","hutao-skin2"]]) {
  lib.config.skin.fan_hutao=[skin,"extension/原神/image/skin/fan_hutao/"+skin];
  // Native skin click saves config and changes the main portrait. The observer only substitutes its detail crop.
  dialog.portrait.style.backgroundImage="native-avatar";observers[0].callback();
  assert(dialog.portrait.style.backgroundImage.includes(name+"-detail.png"));
  assert(ui.create.buttonPresets.character("fan_hutao").style.backgroundImage.includes(name+"-select.png"));
  assert.equal(dialog.portrait.style.backgroundSize,"cover");
  assert.equal(dialog.portrait.style.backgroundPosition,"center center");
  const before=writes;observers[0].callback();assert.equal(writes,before,"no MutationObserver feedback loop");
}
delete lib.config.skin.fan_hutao;observers[0].callback();assert(hutaoPortrait(lib,"detail").endsWith("hutao-detail.png"));
assert.equal(ui.create.buttonPresets.character("other").style.backgroundImage,undefined);
console.log("PASS: Hu Tao native skin config selects independent small/detail crops; live-style refresh is idempotent (DOM simulation, no game UI).");
