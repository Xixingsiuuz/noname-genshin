import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const spoken=[], game={trySkillAudio(id){spoken.push(id)},hasPlayer(fn){return people.some(fn)}};
const ui={selected:{cards:[],targets:[]}};
const get={name:c=>c.name,value:()=>1,attitude:(p,t)=>t.enemy?-5:5,tag:(c,t)=>c.damage};
const skills=new Function('game','get','ui',read('../character/skills/zhongli_rework.js').replace(/^import .*;\r?\n/,'').replaceAll('export const','const').replaceAll('export function','function').replace('export default','return'))(game,get,ui);
function person(){return {storage:{},hp:2,hujia:1,inGame:true,hand:[{name:'jiu'}],contracts:[],owned:[],stat:{},isIn(){return this.inGame},getCards(){return this.hand},getExpansions(){return this.contracts},getStat(){return this.stat},hasSkill(){return false},canSaveCard(c,t){assert.equal(t,this);return !c.banned},logSkill(){},addSkill(id){this.owned.push(id)},removeSkill(id){this.owned=this.owned.filter(x=>x!==id)},async addToExpansion({cards,gaintag,source}){assert.deepEqual(gaintag,['fan_dingqi']);source.hand=source.hand.filter(c=>!cards.includes(c));this.contracts.push(...cards)},async loseToDiscardpile(cards){this.contracts=this.contracts.filter(c=>!cards.includes(c));},async draw(n){this.drawn=(this.drawn||0)+n},async loseHp(n){this.hp-=n;if(this.hp===0){if(this.hand.length){this.hand.pop();this.hp=1}else this.inGame=false}},async changeHujia(n,type,cap){this.hujia=Math.max(0,Math.min(cap??Infinity,this.hujia+n))},hasZhuSkill(id){assert.equal(id,'fan_re_xianyou');return true},countCards(){return this.hand.length},countDiscardableCards(){return 1},discardPlayerCard(){return {forResult:async()=>({bool:true})}}};}
const owner=person(),target=person(),people=[owner,target];
// 原生 nodeintro 仅接受字符串或 false；契牌应添加到对话框而非返回数组。
const intro=skills.fan_dingqi_contract.intro;
const contractCards=[{name:'sha'},{name:'shan'}];
target.contracts=contractCards;
let shown;
const introResult=intro.mark({addAuto(cards){shown=cards}},undefined,target);
assert.equal(introResult,undefined);
assert.equal(shown,contractCards);
assert.equal(intro.markcount(undefined,target),2);
get.translation=cards=>cards.map(c=>c.name).join('、');
assert.equal(intro.content(undefined,target),'sha、shan');
// 直接执行本地 storageintro 方法体，第三个回调参数实际为技能 ID。
const engineSource=read('../../../noname/get/index.js');
const storageIntroSource=engineSource.slice(engineSource.indexOf('  storageintro(type,'),engineSource.indexOf('  nodeintro(',engineSource.indexOf('  storageintro(type,'))).trim();
const nativeStorageIntro=new Function('get',`return ({${storageIntroSource}}).storageintro`)(get);
assert.equal(nativeStorageIntro(intro.content,undefined,target,{},'fan_dingqi_contract'),'sha、shan');
target.contracts=[];
assert.equal(nativeStorageIntro(intro.content,undefined,target,{},'fan_dingqi_contract'),'没有卡牌');
assert.equal(intro.mark({addAuto(){throw Error('empty cards')}},undefined,target),'没有卡牌');
let picked,options;
owner.chooseCardTarget=o=>{options=o;return {forResult:async()=>picked}};
picked={bool:false};await skills.fan_dingqi.content({}, {},owner);assert.equal(target.contracts.length,0);
const card=owner.hand[0];picked={bool:true,cards:[card],targets:[target]};
await skills.fan_dingqi.content({}, {},owner);assert.equal(target.contracts[0],card);assert(target.owned.includes('fan_dingqi_contract'));
ui.selected.cards=[];ui.selected.targets=[target];assert(!options.filterOk());ui.selected.cards=[card];assert(options.filterOk());ui.selected.targets=[];assert(!options.filterOk());
// 派发真正获得的契技能；先取消伤害，再消耗全部，防止重入重复消耗。
async function dispatch(event){for(const id of target.owned.slice()){const s=skills[id];if(s?.filter(event,target))await s.content({},event,target)}}
target.contracts.push({});let cancelled=false;
await dispatch({name:'damage',num:3,cancel(){cancelled=true}});assert(cancelled);assert.equal(target.contracts.length,0);assert.equal(target.drawn,undefined);
await dispatch({name:'damage',num:2,cancel(){throw Error('empty contract retriggered')}});
for(const hp of [1,4,7]){target.hp=hp;target.contracts=[{},{}];target.addSkill('fan_dingqi_contract');target.drawn=0;owner.inGame=false;await dispatch({name:'phase'});assert.equal(target.drawn,Math.min(5,hp));assert.equal(target.contracts.length,0)}
owner.inGame=true;owner.hp=1;owner.hujia=2;owner.hand=[{name:'jiu'}];
const ai=skills.fan_re_dixin_give.ai;assert(ai.order(null,owner)>0);assert(ai.result.player(owner)+ai.result.target(owner,owner)>0);
await skills.fan_re_dixin_give.content({target:owner},{},owner);assert.equal(owner.hujia,4);assert.equal(owner.hp,1);assert.equal(owner.hand.length,0);assert.equal(ai.order(null,owner),0);
owner.hp=2;owner.hujia=5;target.hujia=5;spoken.length=0;await skills.fan_re_dixin_give.content({target:target},{},owner);assert.equal(spoken.length,0);
owner.hp=2;target.hujia=3;await skills.fan_re_dixin_remove.content({target}, {},owner);assert.equal(target.hujia,0);assert.equal(spoken.at(-1),'fan_re_dixin_remove');
assert.equal(skills.fan_dingqi.locked,false);assert.equal(skills.fan_dingqi_contract.locked,false);assert.equal(skills.fan_dingqi.audio,false);
assert.equal(skills.fan_re_dixin_give.logAudio({}),false);assert.equal(skills.fan_re_xianyou.logAudio({}),false);
console.log('PASS: reworked Zhongli contracts, shared armor skill, self-rescue AI, cap, full consumption and voice timing; simulated only');
// 取消、成功放置、防伤、摸牌分别验证播音一次，空契不再播音。
owner.hp=2; owner.hand=[{name:'sha'}]; target.contracts=[]; target.storage={}; target.owned=[];
spoken.length=0; picked={bool:false}; await skills.fan_dingqi.content({}, {},owner); assert.equal(spoken.length,0);
picked={bool:true,cards:[owner.hand[0]],targets:[target]};
await skills.fan_dingqi.content({}, {},owner); assert.deepEqual(spoken,['fan_dingqi_start']);
await dispatch({name:'damage',num:2,cancel(){}}); assert.deepEqual(spoken,['fan_dingqi_start','fan_dingqi_prevent']);
await dispatch({name:'damage',num:2,cancel(){throw Error('empty contracts')}}); assert.equal(spoken.length,2);
target.contracts=[{}]; target.storage.fan_dingqi_speaker=owner; target.addSkill('fan_dingqi_contract'); target.hp=3;
await dispatch({name:'phase'}); assert.equal(spoken.at(-1),'fan_dingqi_draw'); assert.equal(spoken.length,3);
console.log('PASS: Dingqi three voice nodes, cancellation and empty-contract silence');
