import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../character/skills/sp_citlali.js',import.meta.url),'utf8');
Array.prototype.randomGet=function(){return this[0]};
Array.prototype.sortBySeat=function(){return this};
let accept=true, used, log=[], source={isIn:()=>true};
const status={}, ui={cardPile:{childNodes:[]}}, lib={inpile:['sha','nanman','shan','juedou'],filter:{cardDiscardable:c=>!c.fixed}};
const get={type:n=>['nanman','juedou'].includes(n)?'trick':'basic',tag:c=>c.name!=='shan',value:()=>1,attitude:()=>1,effect:()=>5};
const game={filterPlayer:fn=>[p,source].filter(fn),trySkillAudio:id=>log.push(id),hasPlayer:fn=>[p,source].some(fn)};
const p={storage:{},hand:[{}],skills:new Set(),isIn:()=>true,isTurnedOver:()=>false,
 getCards(){return this.hand},hasSkill(id){return this.skills.has(id)},canUse(c,t,d){assert.equal(d,false);return t===source},
 chooseBool(){return {set(){return this},forResult:async()=>({bool:accept})}},addTempSkill(id,expiry){assert.equal(expiry,'phaseAfter');this.skills.add(id)},logSkill(){},
 async discard(cards){assert.deepEqual(cards,this.hand);this.hand=[];log.push('discard')},useCard(card,targets){used={card,targets};log.push('use');return used},async turnOver(){log.push('turn')},async gain(){},
};
const skills=new Function('lib','game','get','ui','_status',text.replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(lib,game,get,ui,status);
const m=skills.fan_sp_miyan, e={player:p,source};
assert(m.filter(e,p));p.hand=[];assert(!m.filter(e,p));p.hand=[{fixed:true}];assert(!m.filter(e,p));p.hand=[{}];assert(!m.filter({player:p},p));
accept=false;await m.content({},e,p);assert.equal(p.skills.size,0);assert.equal(p.hand.length,1);
accept=true;await m.content({},e,p);assert.equal(used.addCount,false);assert.deepEqual(used.targets,[source]);assert(log.indexOf('discard')<log.indexOf('use'));assert(log.indexOf('use')<log.indexOf('turn'));assert(!m.filter(e,p));
p.skills.clear();p.hand=[{}];lib.inpile=['nanman'];await m.content({},e,p);assert.equal(used.card.name,'nanman');assert.deepEqual(used.targets,[source]);
const z=skills.fan_sp_zhuyao, loss={fan_sp_yingxin_loss:{last:true,colors:['red']}};
assert(z.filter(loss,p));p.skills.add('fan_sp_zhuyao_used');assert(!z.filter(loss,p));
assert(text.includes('name.replace("fan_sp_", "fan_")'));assert(!text.includes('if (black && red && player.isIn())'));
console.log('PASS SP Citlali simulation: empty/undiscardable hand, no source, cancellation, quota, discard/use/turn order, global attack targets, independent IDs and shared audio paths. No live game UI.');
