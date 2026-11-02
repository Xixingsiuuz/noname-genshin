import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../character/skills/flins.js', import.meta.url), 'utf8');
const ui = { selected: { cards: [], targets: [] } }, status = {};
const get = { name: c => c.name, type: c => c.type || "basic", is: { shownCard: c => c.shown }, value: () => 3 };
const game = { trySkillAudio() {}, checkMod: c => c.disabled ? false : 'unchanged', hasPlayer: f => people.some(f), filterPlayer: f => people.filter(f) };
const lib = { filter: { cardEnabled: c => !c.disabled, filterTarget: (c,p,t) => p !== t && !t.protected } };
const skills = new Function('lib','game','get','ui','_status', source.replace(/^import .*;\r?\n/, '').replace('export default','return'))(lib,game,get,ui,status);
const card = (name, shown=false) => ({ name, shown, zone: 'h', hasGaintag: () => false });
const holder = cards => ({ cards, isIn: () => true, getCards(z,f=()=>true) { return this.cards.filter(c => z.includes(c.zone || "h") && f(c)); }, hasCard(f,z="h") { return this.getCards(z,f).length > 0; }, canUse: () => true, async addShownCards(cs,tag) { assert.equal(tag,'visible_fan_zhangdeng'); cs.forEach(c => c.shown=true); } });
const p = holder([card('sha'),card('shan')]), target = holder([card('sha'),card('sha'),card('tao')]);
const other = holder([card('tao',true)]), people = [p,target,other];
let choices=0;
p.chooseToUse = opts => { choices++; assert.equal(opts.fan_zhangdeng_target,target); assert.equal(opts.prompt2,false); assert(!opts.filterCard({name:'shan'},p)); assert(opts.filterCard({name:'shunshou'},p)); assert(!opts.filterCard({name:'shunshou',disabled:true},p)); return { backup(n) { assert.equal(n,'fan_zhangdeng_backup'); }, set() {} }; };
await skills.fan_zhangdeng.content({ target },null,p);
assert.equal(choices,1);
assert.deepEqual(target.cards.map(c=>c.shown),[true,true,false]);
p.cards=[];
assert(target.cards[0].shown); // 来源同名牌离开不暗置。
target.cards.push(card('sha'));
assert(!target.cards.at(-1).shown); // 新获同名牌不自动明置。
const moke=skills.fan_moke, backup=skills.fan_zhangdeng.subSkill.backup;
assert.equal(moke.mod.globalTo(target,p,2),3);
assert.equal(moke.mod.globalTo(p,p,0),undefined);
const hit=[]; hit.addArray=cs=>hit.push(...cs);
await moke.content({}, { directHit: hit },p);
assert(hit.includes(target) && hit.includes(other) && !hit.includes(p));
target.cards=[]; other.cards=[];
assert(!moke.filter({},p));
other.cards=[{ shown:false,hasGaintag:t=>t==='faceup_tag' }];
assert(moke.filter({},p));
assert.equal(skills.fan_zhangdeng.mod.targetInRange({ storage:{fan_zhangdeng:true} }),true);
assert.equal(skills.fan_zhangdeng.mod.targetInRange({ name:'shunshou' }),undefined);
status.event={fan_zhangdeng_target:target};
assert(backup.filterTarget({},p,target)); assert(!backup.filterTarget({},p,other));
target.protected=true; assert(!backup.filterTarget({},p,target));
assert(!backup.filterCard({disabled:true},p));
for (const first of ['cards','targets']) {
 ui.selected={cards:[],targets:[]}; ui.selected[first]=[{}]; assert(!backup.filterOk());
 ui.selected.cards=[{}]; ui.selected.targets=[target]; assert(backup.filterOk());
 ui.selected[first]=[]; assert(!backup.filterOk());
}
console.log('Flins: snapshot reveal, response restriction, distance, material legality and selection checks passed.');

// 使用本地引擎八卦阵的真实过滤器，验证其虚拟闪探测不再误触发。
const standard = readFileSync(new URL('../../../card/standard.js', import.meta.url), 'utf8');
const baguaSource = standard.slice(standard.indexOf('    bagua_skill: {'));
const filterSource = baguaSource.slice(baguaSource.indexOf('      filter(event, player) {'), baguaSource.indexOf('      audio: true,'));
const baguaFilter = new Function('lib', 'return ({' + filterSource + '}).filter;')(lib);
p.hasSkillTag = () => false;
const realShan=card('shan'), disabled=card('sha'); disabled.disabled=true;
p.cards=[realShan,disabled];
assert(backup.filterCard(realShan,p));
assert(!backup.filterCard(disabled,p));
assert(!backup.filterCard({name:'shan'},p));
const probe = { name:'chooseToUse', filterCard:backup.filterCard, getParent:()=>({player:p}) };
assert(!baguaFilter(probe,p));
// 正常需要闪的流程仍可触发八卦阵。
probe.filterCard=c=>c.name==='shan';
assert(baguaFilter(probe,p));
console.log('Flins: native Bagua probe rejected; real Shan conversion and normal Bagua preserved.');

// 复现有装备的谋孙权：不需要掌灯或明置手牌，也必须被禁止响应。
p.cards=[]; other.cards=[];
const equipment=card('bagua'); equipment.zone='e';
target.cards=[equipment];
assert(moke.filter({},p));
const equipmentHit=[]; equipmentHit.addArray=cs=>equipmentHit.push(...cs);
await moke.content({}, {card:{name:'sha'},directHit:equipmentHit},p);
assert(equipmentHit.includes(target));
assert(!equipmentHit.includes(p));
// 判定区牌虽然公开，但不属于“角色的明置牌”。
const judgment=card('lebu',true); judgment.zone='j';
target.cards=[judgment];
assert(!moke.filter({},p));
const judgmentHit=[]; judgmentHit.addArray=cs=>judgmentHit.push(...cs);
await moke.content({}, {directHit:judgmentHit},p);
assert.equal(judgmentHit.length,0);
// 装备被获得为暗置手牌后，不再满足；重新装备后恢复。
equipment.zone='h'; target.cards=[equipment];
assert(!moke.filter({},p));
equipment.zone='e'; assert(moke.filter({},p));
console.log('Flins: equipment blocks responses without Zhangdeng; judgment excluded; zone changes respected.');

// 直接使用本地引擎选择检查器：无需点击，自动选中唯一原目标。
const checkSource=readFileSync(new URL('../../../noname/game/check.js',import.meta.url),'utf8');
const nativeGet={select:n=>Array.isArray(n)?n:[n,n]};
const nativeLib={filter:{cardAiIncluded:()=>true}};
const nativeGame={callHook(){}};
const Check=new Function('ui','get','lib','game','_status',checkSource.replace(/^import .*;\r?\n/gm,'').replace(/export \{[\s\S]*$/, 'return Check;'))(ui,nativeGet,nativeLib,nativeGame,status);
for(const person of people){
 const classes=new Set();
 person.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)};
}
ui.selected.targets=[];
ui.selected.targets.add=function(x){if(!this.includes(x))this.push(x)};
ui.selected.targets.remove=function(x){const i=this.indexOf(x);if(i>=0)this.splice(i,1)};
ui.selected.cards=[];
const selectionEvent={selectTarget:backup.selectTarget,targetRequired:true};
const nativeCheck=new Check();
target.protected=false;
function updateTarget(){return nativeCheck.processSelection({type:'target',items:people,event:selectionEvent,useCache:false,isSelectable:t=>backup.filterTarget({},p,t)});}
assert(updateTarget().ok);
assert.deepEqual([...ui.selected.targets],[target]);
assert(!backup.filterOk());
ui.selected.cards=[{}]; assert(backup.filterOk());
ui.selected.cards=[]; updateTarget(); assert(!backup.filterOk());
ui.selected.cards=[{}]; target.protected=true;
assert(!updateTarget().ok); assert(!backup.filterOk());
console.log('Flins: native selection auto-selects original target; material required; illegal target removed.');
