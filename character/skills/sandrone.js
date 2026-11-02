import {lib,game,get,ui,_status} from "../../../../noname.js";
const state=p=>p.storage.fan_xigou ||= [];
const values=[[1,2,3,4,5,6,7,8,9,10,11,12,13],["spade","heart","club","diamond"],["basic","trick","equip"]];
const value=(c,i)=>i===2?get.type2(c,false):i===1?get.suit(c,false):get.number(c,false);
async function record(p,v){
 const s=state(p); game.trySkillAudio(["fan_xigou_number","fan_xigou_suit","fan_xigou_type"][s.length],p); s.push(v);p.syncStorage("fan_xigou");p.markSkill("fan_xigou");
 if(s.length<3)return;
 const snapshot=s.slice();
 try {
   const includeDiscard=!!p.storage.fan_wanli_discard;
   delete p.storage.fan_wanli_discard;
   const others=game.filterPlayer(c=>c!==p).sortBySeat(_status.currentPhase||p);
   const pool=[...ui.cardPile.childNodes,...(includeDiscard?ui.discardPile.childNodes:[])];
   for(const owner of others)if(owner.isIn())pool.push(...owner.getCards("hejx"));
   const matches=()=>[...new Set(pool)].filter(c=>snapshot.every((entry,i)=>value(c,i)===entry));
   const cards=matches();
   let gained=false, count=0;
   if(cards.length){
     const gain=p.gain(cards,"gain2");
     await gain;
     // Native gain removes destroyed/unobtainable cards from its final cards list.
     count=gain.cards.length;gained=count>0;
   }
   if(!gained&&p.isIn()){
     const draw=p.draw(2);await draw;count=draw.result.cards.length;
   }
   if(count>=2&&Math.random()<0.5)game.trySkillAudio("fan_xigou_view",p);
 } finally {p.storage.fan_xigou=[];p.syncStorage("fan_xigou");p.markSkill("fan_xigou");}

}
async function selectValue(p,i){
 const labels=values[i].map(v=>i===0&&v>=11?["J","Q","K"][v-11]:String(v));
 const r=await p.chooseControl(...labels).set("prompt","析构：选择记录结果").set("prompt2",false).set("ai",()=>{ // Evaluate complete three-field combinations; no match yields two draws.
 const score=v=>{
   const entries=state(p).slice();entries[i]=v;
   const matches=(lib.card.list||[]).filter(c=>entries.every((entry,j)=>entry===undefined||value({name:c[2],suit:c[0],number:c[1]},j)===entry)).length;
   return entries.filter(x=>x!==undefined).length===3?(matches||2):Math.max(2,matches);
 };
 const scores=values[i].map(score);return scores.indexOf(Math.max(...scores)); }).forResult();
 return values[i][r.index];
}
export default {
 fan_xigou_number:{audio:"ext:原神/audio/sandrone/skill:true"},
 fan_xigou_suit:{audio:"ext:原神/audio/sandrone/skill:true"},
 fan_xigou_type:{audio:"ext:原神/audio/sandrone/skill:true"},
 fan_xigou_view:{audio:"ext:原神/audio/sandrone/skill:true"},
 fan_wanli_choice:{audio:"ext:原神/audio/sandrone/skill:3"},
 fan_wanli_beishui:{audio:"ext:原神/audio/sandrone/skill:3"},
 fan_yaoyue_voice:{audio:"ext:原神/audio/sandrone/skill:2"},
 fan_xigou:{audio:false,locked:true,forced:true,trigger:{player:["useCard","respond"]},
 filter:e=>!!e.card&&!get.is.virtualCard(e.card)&&!get.is.convertedCard(e.card),
 async content(e,t,p){await record(p,value(t.card,state(p).length));},
 mark:true,intro:{content(storage){return storage?.length?storage.map((v,i)=>["点数：","花色：","类型："][i]+get.translation(v)).join("<br>"):"尚未记录";}},onremove(p){delete p.storage.fan_xigou;delete p.storage.fan_wanli_discard;}},
 fan_wanli:{audio:false,locked:false,enable:"phaseUse",usable:1,
 // Suppress native synchronous submission; the extension checkEnd hook submits after pause.
 manualConfirm:true,direct:false,fan_wanli_auto:true,ai:{order:2,result:{player:1}},
 async content(e,t,p){
 game.trySkillAudio("fan_wanli_choice",p);
 const canBack=()=>state(p).length===2;
 const allowed=choice=>choice!=="修改点数"&&choice!=="修改花色"||state(p).length>(choice==="修改点数"?0:1);
 const options=[...(state(p).length?["修改点数"]:[]),...(state(p).length>1?["修改花色"]:[]),"弃牌堆获得牌",...(canBack()?["背水"]:[]),"取消"];
 const r=await p.chooseControl(...options).set("prompt","你可以发动【万理】").set("prompt2",false)
 .set("ai",()=>canBack()&&p.hp>1?"背水":state(p).length>0?"修改点数":p.storage.fan_wanli_discard?"取消":"弃牌堆获得牌").forResult();
 const choice=r.control;
 if(!options.includes(choice)||choice==="取消"||!allowed(choice)||(choice==="背水"&&!canBack())){p.getStat("skill").fan_wanli--;return;}
 p.logSkill("fan_wanli");
 if(choice==="背水")game.trySkillAudio("fan_wanli_beishui",p);
 if((["修改点数","修改花色","背水"].includes(choice))&&state(p).length){
   const options=state(p).length>1?["修改点数","修改花色"]:["修改点数"];
   const selected=choice!=="背水"?choice:options.length===1?options[0]:(await p.chooseControl(...options).set("prompt","万理：修改一项记录").set("prompt2",false).set("ai",()=>0).forResult()).control;
   const i=selected==="修改花色"?1:0;
   if(state(p).length>i){state(p)[i]=await selectValue(p,i);p.syncStorage("fan_xigou");p.markSkill("fan_xigou");}
 }
 if(!p.isIn())return;
 if(choice==="弃牌堆获得牌"||choice==="背水")p.storage.fan_wanli_discard=true;
 if(choice==="背水"){
   await p.loseHp(1);
   if(p.isIn()&&canBack())await record(p,await selectValue(p,2));
 }

 }},
 fan_yaoyue:{audio:false,locked:false,trigger:{player:"phaseUseBegin"},direct:true,
 filter:(e,p)=>game.hasPlayer(c=>c!==p&&(c.hasSex("female")||c.hasSex("male"))&&c.countCards("h")>0),
 filterTarget(c,p,t){return t!==p&&t.countCards("h")>0&&(t.hasSex("female")||(t.hasSex("male")&&ui.selected.targets.filter(x=>x.hasSex("male")&&!x.hasSex("female")).length<2));},
 multitarget:true,multiline:true,
 async content(e,t,p){
 const selected=await p.chooseTarget([1,Infinity],"你可以发动【邀月】",(card,player,target)=>lib.skill.fan_yaoyue.filterTarget(card,player,target))
 .set("prompt2",false).set("fanPairedConfirm",true).set("manualConfirm",true)
 .set("ai",target=>get.attitude(p,target)>0?0.3:1).forResult();
 if(!selected.bool||!selected.targets?.length)return;
 p.logSkill("fan_yaoyue",selected.targets);
 game.trySkillAudio("fan_yaoyue_voice",p);
 const targets=selected.targets.slice().sortBySeat(_status.currentPhase||p);
 for(const target of targets){if(!target.isIn()||!target.countCards("h"))continue;const r=await p.choosePlayerCard(target,"h",true,"邀月：获得一张手牌").set("ai",b=>get.buttonValue(b)).forResult();if(r.cards?.length&&target.getCards("h").includes(r.cards[0]))await p.gain(r.cards,target,"giveAuto");}
 for(const target of targets){if(!p.isIn())break;if(!target.isIn()||!p.countCards("he"))continue;const r=await p.chooseCard("he",true,"邀月：交给"+get.translation(target)+"一张牌").set("ai",c=>get.attitude(p,target)>0?get.value(c,target)-get.value(c,p):8-get.value(c,p)).forResult();if(r.cards?.length&&target.isIn())await p.give(r.cards,target);}
 },ai:{order:5,result:{target(p,t){return get.attitude(p,t)>0?0.3:-1;}},threaten:1.3}}
};
