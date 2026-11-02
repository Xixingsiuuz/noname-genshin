import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const material={id:"material"};
let hand=[material],used=false,submitted=0,closed=0,targetsLegal=true;
const status={event:null};
const ui={selected:{cards:[material]},confirm:{close(){closed++}},create:{dialog(){return {addText(){}}}},click:{ok(){submitted++;game.paused=false;status.event.result={bool:true}}}};
const lib={card:{wuzhong:{selectTarget:-1},shan:{notarget:true},sha:{}},config:{auto_confirm:false}};
const get={info:id=>id==="fan_bowen_convert_backup"?backup:{},card:()=>backup.viewAs,translation:x=>x};
const owner={hasSkill:()=>used,getCards:()=>hand};
const game={checkMod:()=>"unchanged",pause(){this.paused=true},check(){return backup.viewAsFilter(owner)&&backup.filterCard(material,owner)&&targetsLegal&&backup.filterOk()}};
const skills=new Function("lib","game","get","ui","_status",read("../character/skills/linnea.js").replace(/^import .*;\r?\n/gm,"").replace("export default","return"))(lib,game,get,ui,status);
let backup;
const content=read("../../../noname/library/element/content.js");
function pauseStep(name){
  const section=content.slice(content.indexOf(`  ${name}: [`));
  const start=section.indexOf("const ok = game.check();");
  const end=section.indexOf("      } else if (event.isOnline())",start);
  assert.ok(start>=0&&end>start);
  return new Function("game","get","ui","lib","player",`return function(event){${section.slice(start,end)}\n}`)(game,get,ui,lib,owner);
}
const useStep=pauseStep("chooseToUse"),respondStep=pauseStep("chooseToRespond");
for(const auto of [false,true])for(const [name,card] of [["chooseToUse","wuzhong"],["chooseToRespond","shan"],["chooseToRespond","sha"]]){
  lib.config.auto_confirm=auto;hand=[material];used=false;targetsLegal=true;ui.selected.cards=[material];
  const event={name,skill:"fan_bowen_convert_backup",player:owner,isMine:()=>true,fanBowenMaterial:material,prompt:"test"};
  status.event=event;backup=skills.fan_bowen_convert.chooseButton.backup([["trick","",card]]);
  const before=submitted;
  (name==="chooseToUse"?useStep:respondStep)(event);
  assert.equal(game.paused,true,"native step may pause even with auto-confirm on because this automatic conversion is deferred");
  assert.equal(submitted,before,"must not submit before native pause");
  await Promise.resolve();
  assert.equal(submitted,before+1);assert.equal(game.paused,false);
}
assert.equal(closed,6,"no empty confirmation control remains after submission");
for(const invalidate of [()=>{hand=[]},()=>{status.event={}},()=>{used=true},()=>{targetsLegal=false}]){
  hand=[material];used=false;targetsLegal=true;ui.selected.cards=[material];
  const event={name:"chooseToUse",skill:"fan_bowen_convert_backup",player:owner,isMine:()=>true,fanBowenMaterial:material,prompt:"test"};
  status.event=event;backup=skills.fan_bowen_convert.chooseButton.backup([["trick","","wuzhong"]]);
  const before=submitted;useStep(event);invalidate();await Promise.resolve();assert.equal(submitted,before);
}
hand=[material];used=false;targetsLegal=true;
status.event={name:"chooseToUse",skill:"fan_bowen_convert_backup",player:owner,isMine:()=>true,fanBowenMaterial:material};
backup=skills.fan_bowen_convert.chooseButton.backup([["basic","","sha"]]);
const before=submitted;assert.equal(backup.filterOk(),true);await Promise.resolve();assert.equal(submitted,before,"active Sha still waits for target confirmation");
console.log("Native pause-step regression: auto-confirm ON/OFF, Wuzhong, Shan/Sha responses, cancellation, moved material, spent quota, invalid target and manual attack passed.");
