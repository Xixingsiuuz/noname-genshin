import {game,get,ui,_status} from "../../../../noname.js";
import standard from "./sandrone.js";
const values=[Array.from({length:13},(_,i)=>i+1),["spade","heart","club","diamond"],["basic","trick","equip"]];
const names=["点数","花色","类别"];
const state=p=>p.storage.fan_sp_xigou ||= [[],[],[]];
const value=(c,i)=>i===0?get.number(c,false):i===1?get.suit(c,false):get.type2(c,false);
const complete=(p,i)=>values[i].every(v=>state(p)[i].includes(v));
const missing=(p,i)=>values[i].filter(v=>!state(p)[i].includes(v));
export default {
 fan_sp_xigou:{audio:false,locked:true,forced:true,trigger:{player:["useCardAfter","respondAfter"]},
 filter:e=>!!e.card&&!get.is.virtualCard(e.card)&&!get.is.convertedCard(e.card),
 async content(e,t,p){for(let i=0;i<3;i++){const v=value(t.card,i);if(values[i].includes(v)&&!state(p)[i].includes(v))state(p)[i].push(v);}p.markSkill("fan_sp_xigou");},
 mark:true,onremove:true,intro:{content:(s)=>names.map((n,i)=>n+"："+(s?.[i]?.map(v=>get.translation(v)).join("、")||"无")).join("<br>")},
 group:"fan_sp_xigou_reward",subSkill:{reward:{audio:false,locked:true,forced:true,trigger:{global:"phaseAfter"},
 filter:(e,p)=>values.some((_,i)=>complete(p,i)),
 async content(e,t,p){for(let i=0;i<3&&p.isIn();i++){
 if(!complete(p,i))continue;
 game.trySkillAudio(["fan_xigou_number","fan_xigou_suit","fan_xigou_type"][i],p);
 const pool=[...ui.cardPile.childNodes,...ui.discardPile.childNodes],cards=[];
 for(const v of values[i]){const c=pool.filter(c=>value(c,i)===v).randomGet();if(c)cards.push(c);}
 if(cards.length){game.trySkillAudio("fan_xigou_view",p);const valid=cards.filter(c=>c.parentNode===ui.cardPile||c.parentNode===ui.discardPile);if(valid.length)await p.gain(valid,"gain2");}
 state(p)[i]=[];p.markSkill("fan_sp_xigou");
 }} }}},
 fan_sp_wanli:{audio:false,locked:false,trigger:{player:"phaseJieshuBegin"},direct:true,
 filter:(e,p)=>state(p).some(s=>s.length),
 async content(e,t,p){
 const links=[];for(let i=0;i<3;i++)for(const v of state(p)[i])links.push([i+":"+v,names[i]+"："+get.translation(v)]);
 const score=i=>values.reduce((s,_,j)=>s+(i===j?0:missing(p,j).length===1?values[j].length:1/Math.max(1,missing(p,j).length)),0)-state(p)[i].length/values[i].length;
 const r=await p.chooseButton(["万理：删除一个记录",[links,"textbutton"]]).set("ai",b=>score(Number(b.link.split(":")[0]))).set("prompt2",false).forResult();
 if(!r.bool)return;const [index,raw]=r.links[0].split(":"),i=Number(index),v=i===0?Number(raw):raw;
 if(!state(p)[i].includes(v))return;
 p.logSkill("fan_sp_wanli");game.trySkillAudio("fan_wanli_choice",p);state(p)[i].splice(state(p)[i].indexOf(v),1);p.markSkill("fan_sp_xigou");
 for(let j=0;j<3&&p.isIn();j++){if(j===i)continue;
 const opts=values[j].map(String);const choice=await p.chooseControl(...opts).set("prompt","万理：添加一个"+names[j]+"记录").set("prompt2",false).set("ai",()=>{const m=missing(p,j);return opts.indexOf(String(m[0]??values[j][0]));}).forResult();
 const selected=values[j][choice.index];if(selected!==undefined&&!state(p)[j].includes(selected))state(p)[j].push(selected);p.markSkill("fan_sp_xigou");
 }
 }},
 fan_sp_yaoyue:{...standard.fan_yaoyue,async content(e,t,p){
 // 复用同一规则与原声，仅替换主技能标识；座次和逐次合法性检查沿用标版。
 await standard.fan_yaoyue.content(e,t,p);
 }}
};
