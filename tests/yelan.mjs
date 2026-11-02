import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const source = readFileSync(new URL('../character/skills/yelan.js', import.meta.url), 'utf8');
const actors = [], log = [], status = {}, ui = { selected: { cards: [], targets: [] } };
Array.prototype.sortBySeat = function () { return this.sort((a,b) => a.seat-b.seat); };
const get = {
  type2: c => c.type === 'delay' ? 'trick' : c.type,
  number: c => c.number, value: c => c.value ?? 3, translation: p => p.id,
  tag: (c,tag) => c[tag] || 0,
  equipValue: c => c.equipValue ?? c.value ?? 3,
  attitude: (a,b) => a === b ? 10 : a.team === b.team ? 5 : -5, effect: (t,c,a) => a.team === t.team ? -5 : 8,
};
const lib = { filter: { canBeGained: c => !c.blocked } };
const game = { broadcastAll: (f,...args) => f(...args), log: (...args) => log.push('log'),
  filterPlayer: f => actors.filter(p=>p.isIn()&&f(p)), hasPlayer: f => actors.some(p=>p.isIn()&&f(p)) };
const skills = new Function('game','get','lib','ui','_status', source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,get,lib,ui,status);
const chain = (result, actor) => ({ set(k,v) { (actor.options??={})[k]=v; return this; }, async forResult() { actor.onSelect?.(); return result; } });
function actor(id,seat,team) {
  const p = { id, playerid:id, seat, team, hp:4, alive:true, hand:[], equip:[], judge:[], expansions:[], losses:[], owned:[],
    isIn(){return this.alive}, hasSkill(id){return this.owned.includes(id)&&!this.blocked}, hasSkillTag(){return false},
    getCards(zone, f){const all=[...(zone.includes('h')?this.hand:[]),...(zone.includes('e')?this.equip:[]),...(zone.includes('j')?this.judge:[])]; return f?all.filter(f):all},
    countCards(zone,f){return this.getCards(zone,f).length}, getExpansions(tag){return this.expansions.filter(c=>c.tags?.includes(tag))},
    getHistory(kind,f){return kind==='lose'?this.losses.filter(f):[]}, logSkill(id){log.push(id)},
    chooseCard(){return chain(this.selection??{bool:false},this)}, chooseBool(){return chain(this.selection??{bool:false},this)},
    give(c,target){this.hand=this.hand.filter(x=>x!==c); if(!this.failGive)target.hand.push(c); const out=Promise.resolve();out.getg=p=>p===target&&!this.failGive?[c]:[];return out},
    async addToExpansion({cards,source,gaintag}){source.hand=source.hand.filter(c=>!cards.includes(c));source.equip=source.equip.filter(c=>!cards.includes(c));for(const c of cards)c.tags=gaintag;this.expansions.push(...cards)},
    addSkill(id){if(!this.owned.includes(id))this.owned.push(id)},
    async loseToDiscardpile(c){this.expansions=this.expansions.filter(x=>x!==c);c.position='d';log.push('discard'+c.id);this.onDiscard?.(c)},
    async loseHp(){this.hp--;log.push('loseHp');if(this.hp<=0)this.alive=false},
    async gain(cards,from){this.gained=cards; for(const key of ['hand','equip','judge','expansions'])from[key]=from[key].filter(c=>!cards.includes(c));this.hand.push(...cards)},
  }; actors.push(p);return p;
}
const owner=actor('yelan',0,0), victim=actor('victim',2,1), other=actor('other',1,1);
owner.owned=['fan_kuanghuo','fan_yuantu'];
const card=(id,type='basic',number=7)=>({id,type,number});
const huo=(id,type='basic',n=7,who=owner)=>({...card(id,type,n),fan_kuanghuo_owner:who.playerid,tags:['fan_kuanghuo_mark']});
// 从持有技能展开分组，不无条件调用一个未挂载的记录器。
async function dispatch(event,name){for(const p of [...actors].sortBySeat(status.currentPhase||owner)){
 const ids=p.owned.flatMap(id=>[id,...(skills[id]?.group||[])]);
 for(const id of ids){const info=skills[id],global=info?.trigger?.global;if(!global||!(Array.isArray(global)?global:[global]).includes(name)||p.blocked)continue;
 if(info.filter(event,p))await info.content({triggername:name},event,p);
 }}}
function use(c, materials=[c], hands=materials,name='useCard'){
 const parent={name:'chooseToRespond',result:{bool:true,card:c}}, event={name,player:victim,card:c,cards:materials,targets:[owner],getParent:()=>parent};
 victim.losses=[{hs:hands,es:materials.filter(c=>!hands.includes(c)),getParent:()=>event}];return event;
}
// 两种选择顺序与取消状态，保持玩家合法目标，素材重新检查。
assert.equal(skills.fan_kuanghuo.selectCard[0],0);
ui.selected.cards=[];ui.selected.targets=[victim];assert.equal(skills.fan_kuanghuo.filterOk(),false);
const planted=card('planted');ui.selected.cards=[planted];assert.equal(skills.fan_kuanghuo.filterOk(),true);
ui.selected.targets=[];assert.equal(skills.fan_kuanghuo.filterOk(),false);
owner.hand=[planted];await skills.fan_kuanghuo.content({target:victim,cards:[planted]},null,owner);
assert.equal(planted.fan_kuanghuo_owner,owner.playerid);assert.ok(victim.owned.includes('fan_kuanghuo_mark'));
assert.equal(skills.fan_kuanghuo.filterTarget(null,owner,owner),false);
// 新版只扩大放惑素材至手牌/装备，不扩大征税所检查的手牌或支付区域。
assert.equal(skills.fan_kuanghuo.position,'he');
const equipped={...card('placed-equip','equip',11),equipValue:2};
owner.hand=[];owner.equip=[equipped];assert.equal(skills.fan_kuanghuo.filter({},owner),true);
status.event={player:owner};assert.equal(skills.fan_kuanghuo.check(equipped),5);
equipped.equipValue=9;assert.equal(skills.fan_kuanghuo.check(equipped),-2);
await skills.fan_kuanghuo.content({target:victim,cards:[equipped]},null,owner);
assert.equal(owner.equip.length,0);assert.ok(victim.expansions.includes(equipped));
assert.equal(skills.fan_kuanghuo.filter({},owner),false);
const judged=card('judged','trick');owner.judge=[judged];const originalCount=victim.expansions.length;
await skills.fan_kuanghuo.content({target:victim,cards:[judged]},null,owner);assert.equal(victim.expansions.length,originalCount);
owner.equip=[equipped];owner.equip=[];await skills.fan_kuanghuo.content({target:victim,cards:[equipped]},null,owner);assert.equal(victim.expansions.length,originalCount,'lost equipment cannot be placed');
owner.judge=[];
// 素材先离开手牌，再触发useCard；无交牌保留使用记录/次数，整张牌无效，之后逐张扣血。
victim.expansions=[huo('h1'),huo('h2')];victim.hand=[];victim.selection={bool:false};victim.hp=4;
const used=card('sha'),evt=use(used);evt.usedCount=1;
await dispatch(evt,'useCard');assert.equal(evt.all_excluded,true);assert.equal(evt.usedCount,1);assert.equal(victim.hp,4);
log.length=0;await dispatch(evt,'useCardAfter');assert.equal(victim.hp,2);assert.deepEqual(log,['discardh1','loseHp','discardh2','loseHp']);
await dispatch(evt,'useCardAfter');assert.equal(victim.hp,2,'no duplicate loss');
// 同类别多个惑只索取一张；交牌完成才有效。
victim.expansions=[huo('a','trick',4),huo('b','delay',5)];const gift=card('gift');victim.hand=[gift];victim.selection={bool:true,cards:[gift]};
const delay=use(card('lebu','delay',8));await dispatch(delay,'useCard');assert.ok(owner.hand.includes(gift));assert.equal(delay.all_excluded,undefined);
victim.hand=[gift];victim.failGive=true;const failed=use(card('trick','trick',9));await dispatch(failed,'useCard');assert.equal(failed.all_excluded,true);victim.failGive=false;
// 选后状态变更，素材不再合法时不能部分支付或偷取离手牌。
victim.hand=[gift];victim.onSelect=()=>victim.hand=[];const stale=use(card('t','trick',9));await dispatch(stale,'useCard');assert.equal(stale.all_excluded,true);delete victim.onSelect;
// 响应失败必须改chooseToRespond的结果；不触发点数惩罚。
victim.expansions=[huo('respond')];victim.hand=[];victim.selection={bool:false};victim.hp=4;
const response=use(card('shan'),undefined,undefined,'respond');await dispatch(response,'respond');
assert.equal(response.getParent().result.bool,false);assert.equal(response.result.bool,false);await dispatch(response,'respondAfter');assert.equal(victim.hp,4);
// 杀的闪在本地是useCard；万箭齐发的闪才是respond。无目标使用也须付牌。
victim.expansions=[huo('usedshan')];victim.hand=[gift];victim.selection={bool:true,cards:[gift]};
const usedShan=use(card('usedshan'));usedShan.targets=[];usedShan.respondTo=[owner,card('attack')];
await dispatch(usedShan,'useCard');assert.equal(usedShan.all_excluded,undefined);assert.ok(victim.options.ai(gift)>0,'AI pays for targetless defensive use');
await dispatch(usedShan,'useCardAfter');assert.equal(victim.hp,3,'used Shan triggers number penalty');victim.hp=4;
victim.expansions=[huo('unpaidshan')];victim.hand=[];victim.selection={bool:false};
const unpaidShan=use(card('unpaidshan'));unpaidShan.targets=[];await dispatch(unpaidShan,'useCard');assert.equal(unpaidShan.all_excluded,true);
// 装备素材、无素材虚拟牌不征税；点数惩罚不限手牌和类别。
const equipment=card('equip','equip');const eq=use(equipment,[equipment],[]);await dispatch(eq,'useCard');assert.equal(eq.all_excluded,undefined);await dispatch(eq,'useCardAfter');assert.equal(victim.hp,3);
const virtual=use(card('virtual','basic',null),[],[]);await dispatch(virtual,'useCard');assert.equal(virtual.all_excluded,undefined);await dispatch(virtual,'useCardAfter');assert.equal(victim.hp,3);
// 使用时点数快照、嵌套移走与后来放置的同点数牌。
victim.hp=4;const h1=huo('snapshot'),h2=huo('nested');victim.expansions=[h1,h2];
const outer=use(card('outer','equip'));await dispatch(outer,'useCard');outer.card.number=2;
const nested=use(card('inner','equip'));await dispatch(nested,'useCard');victim.expansions=[h2];await dispatch(nested,'useCardAfter');
const fresh=huo('fresh');victim.expansions=[fresh];const before=victim.hp;await dispatch(outer,'useCardAfter');assert.equal(victim.hp,before);assert.deepEqual(victim.expansions,[fresh]);
// 濒死/离场中止余项，不把逐次失血合并成一次；技能封锁不清惑，解除恢复。
victim.hp=1;victim.expansions=[huo('lethal1'),huo('lethal2')];const lethal=use(card('lethal','equip'));await dispatch(lethal,'useCard');await dispatch(lethal,'useCardAfter');assert.equal(victim.hp,0);assert.equal(victim.expansions.length,1);victim.alive=true;victim.hp=4;
owner.blocked=true;const blocked=use(card('blocked'));await dispatch(blocked,'useCard');assert.equal(blocked.all_excluded,undefined);owner.blocked=false;
// 多夜兰的惑来源独立；渊图统计全部惑。
other.owned=['fan_kuanghuo'];victim.expansions=[huo('other','basic',7,other)];const own=use(card('otheruse'));await dispatch(own,'useCard');assert.equal(own.fan_kuanghuo_numbers?.[owner.playerid],undefined);await dispatch(own,'useCardAfter');assert.equal(victim.hp,3);other.owned=[];
// 渊图仅结束阶段开始、重新校验3张门槛，手/装/判全部拿，其它扩展牌保留。
victim.expansions=[huo('x'),huo('y'),huo('z'),{id:'sealed',tags:['other']}];victim.hand=[card('hand')];victim.equip=[card('equip')];victim.judge=[card('judge')];
owner.selection={bool:true};assert.equal(skills.fan_yuantu.filter({player:victim},owner),true);
await dispatch({player:victim},'phaseJieshuBegin');assert.equal(owner.gained.length,6);assert.equal(victim.expansions[0].id,'sealed');
victim.expansions=[huo('x'),huo('y'),huo('z')];owner.onSelect=()=>victim.expansions.pop();owner.gained=null;await dispatch({player:victim},'phaseJieshuBegin');assert.equal(owner.gained,null);delete owner.onSelect;
// AI计入敌友支付代价、多惑失血、低血量；偏好不进入规则filterTarget。
victim.expansions=[huo('ai','basic',5)];const play=card('aiuse','basic',8),spare={...card('spare'),value:4};victim.hand=[play,spare];
const evaluate=()=>skills.fan_kuanghuo_mark.ai.effect.player(play,victim,owner);
owner.team=0;const enemy=evaluate()[1];owner.team=1;assert.ok(evaluate()[1]>enemy);owner.team=0;
play.number=5;victim.hp=4;const healthy=evaluate()[1];victim.hp=1;assert.ok(evaluate()[1]<healthy);victim.hp=4;
victim.hand=[play];assert.equal(evaluate()[2],0);assert.equal(evaluate()[0],0,'nullify intrinsic card effect, engine retains separate additive skill benefits');owner.blocked=true;assert.equal(evaluate(),undefined);owner.blocked=false;
assert.equal(skills.fan_kuanghuo_mark.ai.effect.player(play,victim,owner,1,true),undefined,'chain propagation is not a new use');
// 本地get.effect的加值会再次乘自身态度；用真实的10复现旧版被放大的交牌代价。
const evaluateAction = (c, target=owner) => {
  const modifier = skills.fan_kuanghuo_mark.ai.effect.player(c,victim,target,0) || [1,0,1,0];
  return 7.5 * (modifier[2] ?? 1) + (modifier[1] || 0) * get.attitude(victim,victim);
};
play.number=8;victim.hp=4;victim.hand=[play,spare];victim.expansions=[huo('tax','basic',5)];
assert.ok(evaluateAction(play)>0,'worthwhile attack remains profitable after gifting value-4 card');
spare.value=9;assert.ok(evaluateAction(play)<0,'expensive gift may reasonably deter a weak attack');spare.value=4;
// 不硬编码神赵云：龙魂转化牌按实际类别匹配、按完整实体素材集扣除付款资源。
const material=card('diamond-material','trick',11);
const converted={...card('converted-sha','basic',8),cards:[material]};victim.hand=[material,spare];
assert.ok(evaluateAction(converted)>0);
const material2=card('diamond-material-2','equip',12);converted.cards.push(material2);victim.hand=[material,material2,spare];
assert.ok(evaluateAction(converted)>0);victim.hand=[material,material2];assert.ok(evaluateAction(converted)<0,'two-card conversion cannot pay using its own materials');
// 模拟本地效果权重，在实际付款回调内再次进入get.effect，不能重复扣无法避免的同点数失血。
const originalEffect=get.effect;
get.effect=(target,c,actor)=>{
  const modifier=skills.fan_kuanghuo_mark.ai.effect.player(c,actor,target,0)||[1,0,1,0];
  return 7.5*(modifier[2]??1)+(modifier[1]||0)*get.attitude(actor,actor);
};
victim.expansions=[huo('pending','basic',7)];victim.hand=[spare];victim.selection={bool:true,cards:[spare]};victim.hp=4;
const pending=use(card('pending-use'));await dispatch(pending,'useCard');
assert.ok(victim.options.ai(spare)>0,'pay to preserve positive card effect even when inevitable point loss follows');
assert.equal(pending.all_excluded,undefined);assert.equal(victim.hp,4);
await dispatch(pending,'useCardAfter');assert.equal(victim.hp,3);
assert.equal(skills.fan_kuanghuo_mark.ai.effect.player(play,victim,owner),undefined,'payment evaluation guard is cleared after evaluation');
get.effect=()=>{throw new Error('evaluation failure')};
// 用现存付款闭包检查异常也清理保护，不把后续正常AI永久绕过。
assert.throws(()=>victim.options.ai(spare),/evaluation failure/);
get.effect=originalEffect;
victim.expansions=[huo('after-error','basic',5)];victim.hand=[play,spare];assert.ok(evaluate()[1]<0);
// 濒死求桃的原生_save先检查effect_use，再检查effect；本技能不能压掉有效自救。
const recoveryEffect=get.effect;
get.effect=(target,c,actor)=>{
  const modifier=skills.fan_kuanghuo_mark.ai.effect.player(c,actor,target,0)||[1,0,1,0];
  return 20*(modifier[2]??1)+(modifier[1]||0)*get.attitude(actor,actor);
};
const peach={...card('peach','basic',7),recover:1,save:1};
const costly={...card('costly-gift','trick',12),value:18};
for(const hp of [0,-1])for(const n of [7,8]){
  victim.hp=hp;victim.hand=[peach,costly];victim.expansions=[huo('dying','basic',n)];
  assert.ok(get.effect(victim,peach,victim,victim)>0,'same/different point self-save stays positive at zero/negative hp');
}
const heart=card('heart-material','trick',7),heart2=card('heart-material-2','equip',9);
const soulPeach={...peach,cards:[heart]};victim.hp=0;victim.hand=[heart,costly];
assert.ok(get.effect(victim,soulPeach,victim,victim)>0,'one-material dragon soul self-save');
soulPeach.cards.push(heart2);victim.hand=[heart,heart2,costly];
assert.ok(get.effect(victim,soulPeach,victim,victim)>0,'two-material dragon soul self-save');
victim.hand=[heart,heart2];assert.ok(get.effect(victim,soulPeach,victim,victim)<0,'no extra gift cannot restore an invalid self-save');
victim.hand=[peach,{...costly,blocked:true}];assert.ok(get.effect(victim,peach,victim,victim)<0,'blocked gift cannot be used');
// 付款回调真实走自救目标，贵重牌也支付，但同一界面仍优先便宜牌。
victim.hp=0;victim.expansions=[huo('pay-rescue','basic',8)];victim.hand=[costly];victim.selection={bool:true,cards:[costly]};
const rescue=use(peach);rescue.targets=[victim];await dispatch(rescue,'useCard');
assert.equal(rescue.all_excluded,undefined);assert.ok(victim.options.ai(costly)>0);
assert.ok(victim.options.ai(spare)>victim.options.ai(costly),'prefer cheaper legal gift');
rescue.all_excluded=true;get.effect=()=>0;assert.ok(victim.options.ai(costly)<0,'already invalid card is not restored by more gifts');
// 保命优先只对濒死自救生效；普通回合和救队友保留各自成本与风险。
get.effect=recoveryEffect;victim.hp=2;victim.expansions=[huo('ordinary','basic',7)];victim.hand=[peach,costly];
const ordinary=skills.fan_kuanghuo_mark.ai.effect.player(peach,victim,victim);
victim.hp=0;const savingOther=skills.fan_kuanghuo_mark.ai.effect.player(peach,victim,other);
assert.ok(ordinary[1]<-1);assert.ok(savingOther[1]<ordinary[1]);
victim.hp=4;
assert.equal(skills.fan_kuanghuo.locked,false);assert.equal(skills.fan_kuanghuo_tax.locked,false);assert.equal(skills.fan_yuantu.locked,false);
const manifest=JSON.parse(readFileSync(new URL('../audio/yelan/originals/yelan-sources.json',import.meta.url),'utf8'));
for(const clip of Object.values(manifest.clips)){const original=readFileSync(new URL('../'+clip.original,import.meta.url));assert.equal(original.length,clip.bytes);assert.deepEqual(original,readFileSync(new URL('../'+clip.output,import.meta.url)));}
assert.ok(existsSync(new URL('../image/character/portraits/yelan.png',import.meta.url)));
console.log('Yelan: attached groups, real movement order, payment/cancellation, respond result, snapshots/nesting, dying, sealing, Yuantu, AI and original audio passed (simulation).');
