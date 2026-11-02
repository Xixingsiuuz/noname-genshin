import fs from 'node:fs';
import assert from 'node:assert/strict';
const src=fs.readFileSync('character/skills/sp_sandrone.js','utf8').replace(/^import .*;\r?\n/gm,'').replace('export default','return');
Array.prototype.randomGet=function(){return this[0];};
const ui={cardPile:{childNodes:[]},discardPile:{childNodes:[]}};
const get={number:c=>c.number,suit:c=>c.suit,type2:c=>c.type,translation:String,is:{virtualCard:c=>!c.cards?.length,convertedCard:c=>!c.isCard}};
const skills=new Function('game','get','ui','_status','standard',src)({trySkillAudio(){}},get,ui,{}, {fan_yaoyue:{}});
const p={storage:{},markSkill(){},isIn:()=>true,gained:[],async gain(cards,animation){assert.equal(animation,'gain2');this.gained.push(cards);for(const c of cards){const a=c.parentNode.childNodes;a.splice(a.indexOf(c),1);c.parentNode=null;}}};
const main=skills.fan_sp_xigou;
assert.equal(main.filter({card:{cards:[],isCard:true}}),false);
assert.equal(main.filter({card:{cards:[{}],isCard:false}}),false);
const card={number:1,suit:'heart',type:'basic',cards:[{}],isCard:true};
await main.content({}, {card},p);await main.content({}, {card},p);
assert.deepEqual(p.storage.fan_sp_xigou,[[1],['heart'],['basic']]);
p.storage.fan_sp_xigou=[Array.from({length:13},(_,i)=>i+1),['spade','heart','club','diamond'],['basic']];
for(let i=1;i<=13;i++){const pile=i%2?ui.cardPile:ui.discardPile;pile.childNodes.push({number:i,suit:['spade','heart','club','diamond'][(i-1)%4],type:'basic',parentNode:pile});}
// 持有主技能后按 group 展开，而非调用未挂载的记录器。
assert.equal(main.group,'fan_sp_xigou_reward');
const reward=main.subSkill.reward;
assert.equal(reward.filter({},p),true);
await reward.content({}, {},p);
assert.equal(p.gained[0].length,13);
assert.deepEqual(p.storage.fan_sp_xigou,[[],[],['basic']]);
assert.equal(reward.filter({},p),false);
assert.equal(skills.fan_sp_wanli.filter({},p),true);
p.storage.fan_sp_xigou=[[],[],[]];assert.equal(skills.fan_sp_wanli.filter({},p),false);
console.log('SP Sandrone simulation passed: eligibility, deduplication, grouped reward, combined sources, independent clearing, exhausted pool');

// 对话框类型必须走原生 Dialog.add 的 textbutton 分支；text 会落入非法 Button。
const dialogSource=fs.readFileSync('../../noname/library/element/dialog.js','utf8');
assert.ok(dialogSource.includes('item[1] == "textbutton"'));
const textSource=fs.readFileSync('../../noname/ui/create/index.js','utf8');
const method=textSource.slice(textSource.indexOf('  textbuttons(list,'),textSource.indexOf('  player(position,',textSource.indexOf('  textbuttons(list,')));
const nativeTextButtons=new Function('lib','ui','return ({'+method.trim()+'}).textbuttons')({config:{touchscreen:false},element:{Button:{prototype:{}}}},{click:{button(){}}});
p.storage.fan_sp_xigou=[[7],['heart'],['basic','trick','equip']];
let cancel=false;
p.logSkill=()=>{};
p.chooseButton=([prompt,[items,type]])=>{
 assert.equal(type,'textbutton');
 const dialog={buttons:{add(button){assert.ok(items.some(item=>item[0]===button.link));}},add(html){assert.ok(html.includes('textbutton'));return {firstChild:{addEventListener(){}}};}};
 nativeTextButtons(items,dialog,false);
 return {set(){return this;},async forResult(){return cancel?{bool:false}:{bool:true,links:['0:7']};}};
};
p.chooseControl=()=>({set(){return this;},async forResult(){return {index:0};}});
await skills.fan_sp_wanli.content({}, {},p);
assert.deepEqual(p.storage.fan_sp_xigou,[[],['heart','spade'],['basic','trick','equip']]);
const before=JSON.stringify(p.storage);cancel=true;
await skills.fan_sp_wanli.content({}, {},p);assert.equal(JSON.stringify(p.storage),before);
console.log('Wanli: native textbuttons, deletion, two additions and cancellation passed (simulation)');
