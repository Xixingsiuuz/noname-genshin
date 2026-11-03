import assert from 'node:assert/strict';
import loadedCharacters from '../character/character.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
Array.prototype.randomGet=function(){return this[0];};
Array.prototype.sortBySeat=function(p){return this.sort((a,b)=>(a.seat-p.seat+8)%8-(b.seat-p.seat+8)%8);};
const trace=[],status={},ui={selected:{cards:[],buttons:[]},cardPile:{childNodes:[]}};
let accept=true, useAccept=true, chosenTarget, buttonChoice, onDraw, onLoseHp, onUse;
const lib={skill:{},inpile:['sha','shan','tao','jiu','wuzhong','shunshou','lebu'],filter:{cardEnabled:(c,p)=>!p.disabled?.includes(c.name)}};
const get={color:c=>c.color,type:c=>['sha','shan','tao','jiu'].includes(typeof c==='string'?c:c.name)?'basic':(typeof c==='string'?c:c.name)==='lebu'?'delay':'trick',
  attitude:(p,t)=>t===p?5:t.attitude??0,value:c=>c.value??5,effect:(t,c,p)=>c.name==='losehp'?-get.attitude(p,t)*2:get.attitude(p,t),
  player:()=>status.event.player,translation:c=>c?.name||c?.playerid||String(c),position:c=>c.pos,cards:n=>deck.splice(0,n),info:id=>lib.skill[id]};
let deck=[];
const game={phaseNumber:0,players:[],filterPlayer(fn){return this.players.filter(t=>t.isIn()&&(!fn||fn(t)));},
 hasPlayer(fn){assert.equal(typeof fn,'function');return this.players.some(t=>t.isIn()&&fn(t));},
 checkMod:c=>c.disabled?false:'unchanged',trySkillAudio(id){trace.push(id);},
 createFakeCards(cards){return cards.map(c=>({name:c.name,isFake:true,_cardid:c.cardid,pos:'s',tags:[],hasGaintag(t){return this.tags.includes(t);}}));},
 deleteFakeCards(cards){for(const c of cards)for(const p of this.players)p.s=p.s.filter(x=>x!==c);},
 async cardsGotoOrdering(cs){cs.forEach(c=>c.pos='o');},async cardsDiscard(cs){cs.forEach(c=>c.pos='d');},
};
const skills=new Function('lib','game','get','ui','_status',read('../character/skills/citlali.js').replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(lib,game,get,ui,status);
for(const [id,s] of Object.entries(skills)){lib.skill[id]=s;for(const [sub,info] of Object.entries(s.subSkill||{}))lib.skill[id+'_'+sub]=info;}
// Actual local Audio + trySkillAudio, including the call made by skill logs.
lib.config={background_speak:true};lib.translate=new Function(read('../character/voices.js').replace('export default','return'))();lib.characterSubstitute={};lib.skill.global=[];
get.character=()=>({tempname:[]});
get.Audio=new Function('get','lib',read('../../../noname/get/audio.js').replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Audio;')(get,lib);
const played=[];game.broadcast=()=>{};game.tryAudio=({audioList})=>played.push(audioList);
const nativeMethod=read('../../../noname/game/index.js').match(/  trySkillAudio\(skill, player, directaudio, nobroadcast, skillInfo, args\) \{([\s\S]*?)\n  \}/);
const nativePlay=new Function('game','lib','get','return function(skill,player,directaudio,nobroadcast,skillInfo,args){'+nativeMethod[1]+'}')(game,lib,get);
game.trySkillAudio=(id,p)=>{trace.push(id);return nativePlay(id,p);};
const choice=(fn)=>({set(k,v){this[k]=v;return this;},backup(id){this.skill=id;},async forResult(){return fn(this);}});
function expanded(p){const all=new Set(p.mounted);for(const s of all){const group=lib.skill[s]?.group;if(group)for(const g of [].concat(group))all.add(g);}return [...all];}
async function dispatch(name,event){
 const pending=[];
 for(const p of game.players)if(p.isIn())for(const id of expanded(p)){
  const info=lib.skill[id],t=info?.trigger;
  if(t&&((t.global&&[].concat(t.global).includes(name))||(event.player===p&&t.player&&[].concat(t.player).includes(name))))pending.push({p,id,info});
 }
 pending.sort((a,b)=>(!!b.info.firstDo-!!a.info.firstDo)||(b.info.priority||0)-(a.info.priority||0));
 for(const {p,id,info} of pending){const old=status.event;status.event={player:p,triggername:name};
  if(!info.filter||info.filter(event,p)){trace.push('trigger:'+id+':'+name);await info.content({triggername:name},event,p);}
  status.event=old;
 }
}
function actor(seat,skills=[]){return {seat,playerid:'p'+seat,storage:{},mounted:new Set(skills),extra:{},temp:{},h:[],s:[],hp:3,maxHp:3,
 isIn(){return !this.out;},isTurnedOver(){return !!this.turned;},hasSkill(id){return expanded(this).includes(id);},
 getCards(zone,fn){const cs=[...(zone.includes('h')?this.h:[]),...(zone.includes('s')?this.s:[])];return fn?cs.filter(fn):cs;},countCards(zone){return this.getCards(zone).length;},
 directgains(cs,_,tag){cs.forEach(c=>c.tags.push(tag));this.s.push(...cs);},
 addAdditionalSkill(key,id){this.extra[key]=id;this.mounted.add(id);lib.skill[id]?.init?.(this,id);},
 removeAdditionalSkill(key){const id=this.extra[key];delete this.extra[key];if(id&&!Object.values(this.extra).includes(id)){this.mounted.delete(id);lib.skill[id]?.onremove?.(this,id);}},
 addTempSkill(id,until){this.mounted.add(id);this.temp[id]=until;},
 markSkill(){},markSkillCharacter(id,target,name,content){assert.equal(id,'fan_yingxin');assert.equal(name,'映心');assert(content.includes(target.playerid));},line(){},logSkill(id,t,a,b,args){assert.deepEqual(args,[]);assert.equal(lib.skill[id].audio,false);nativePlay(id,this,true,true,null,args);assert.deepEqual(played.at(-1),[]);trace.push('log:'+id);},
 chooseTarget(){return choice(()=>({bool:true,targets:[chosenTarget]}));},chooseBool(){return choice(()=>({bool:accept}));},
 chooseButton(arg){return choice(()=>({bool:accept,links:[buttonChoice||arg[1][0][0]]}));},
 chooseButtonTarget(){return choice(()=>({bool:true,targets:[chosenTarget],links:deckResult.splice(0,2)}));},
 chooseToUse(args){return choice(async evt=>{Object.assign(evt,args);if(!useAccept)return {bool:false};const old=status.event;status.event=evt;evt.player=this;
   ui.selected.cards=this.h.slice();assert(lib.skill[evt.skill].filterOk());
   for(const card of this.h)assert(lib.skill[evt.skill].filterCard(card,this));
   await lib.skill[evt.skill].precontent({},null,this);await onUse?.(this,evt);status.event=old;return {bool:true};});},
 hasUseTarget(c,distance,include){assert.equal(distance,undefined);assert.equal(include,true);return !this.noTargets?.includes(c.name)&&c.name!=='shan';},
 getUseValue(c,distance,include){assert.equal(distance,undefined);assert.equal(include,true);return c.name==='wuzhong'?7:3;},
 async draw(n=1){trace.push('draw:'+this.playerid+':'+n);for(let i=0;i<n;i++)this.h.push(card('draw','red'));await onDraw?.(this);},
 async loseHp(){trace.push('losehp:'+this.playerid);this.hp--;await onLoseHp?.(this);},
 async turnOver(){trace.push('turn');this.turned=!this.turned;},
 gain(arg){const cs=Array.isArray(arg)?arg:arg.cards||[arg];return Object.assign(Promise.resolve().then(()=>{trace.push('gain:'+this.playerid);cs.forEach(c=>c.pos='h');this.h.push(...cs);}),{});},
 getHistory(type,fn){const list=this.history||[];if(fn)list.forEach(fn);return list;},
};}
let cardid=0,deckResult=[];
function card(name,color,value=5){return {name,color,value,cardid:String(++cardid),pos:'h'};}
const c=actor(0,['fan_yingxin','fan_zhuyao','fan_miyan']),ally=actor(2),enemy=actor(5);ally.attitude=5;enemy.attitude=-5;game.players=[c,ally,enemy];status.currentPhase=ally;
assert.throws(()=>game.hasPlayer(),/function/);
chosenTarget=ally;c.h=[card('sha','black'),card('tao','red')];ally.h=[card('shan','red')];
await dispatch('phaseBefore',{name:'phase',player:enemy});
assert.equal(c.storage.fan_yingxin_target,ally);assert(ally.hasSkill('fan_yingxin_share'));assert.equal(c.s.length,1);assert.equal(ally.s.length,2);
// Borrowed card replacement occurs before use content; no gain/transfer to borrower.
const fake=ally.s[0],real=c.h[0],borrow={name:'useCard',player:ally,cards:[fake],card:{name:'sha',cards:[fake]},cancel(){this.cancelled=true;}};
await dispatch('useCardBefore',borrow);assert.equal(borrow.cards[0],real);assert.equal(borrow.card.cards[0],real);assert(c.h.includes(real));assert(!ally.h.includes(real));
const stale={name:'respond',player:ally,cards:[fake],card:{cards:[fake]},cancel(){this.cancelled=true;}};c.h=c.h.filter(x=>x!==real);await dispatch('respondBefore',stale);assert(stale.cancelled);c.h.unshift(real);
async function loseAll(p,cs=p.h.slice()){
 const e={name:'lose',player:p,cards:cs};await dispatch('loseBefore',e);
 p.h=p.h.filter(x=>!cs.includes(x));cs.forEach(x=>x.pos='o');e.hs=cs;e.cards2=cs;p.history=[e];
 await dispatch('loseEnd',e);await dispatch('loseAfter',e);return e;
}
trace.length=0;chosenTarget=enemy;
const loss=await loseAll(c);
assert(loss.fan_yingxin_loss.last);assert.equal(c.h.length,2);assert.equal(ally.h.length,2);assert.equal(enemy.hp,2);
assert(c.hasSkill('fan_citlali_lianying'));assert.deepEqual(c.temp.fan_zhuyao_chengshi_effect,{player:'phaseBegin'});
assert(trace.indexOf('draw:p0:1')<trace.indexOf('losehp:p5'));
assert(trace.indexOf('draw:p2:1')<trace.lastIndexOf('draw:p0:1'),'red draw seats start from current player');
assert.equal(trace.filter(x=>x==='fan_yingxin_draw1').length,1);assert.equal(trace.filter(x=>x==='fan_zhuyao_draw1').length,1);
// Stale current hand state cannot invalidate the original event, nor can repeated filters consume the snapshot.
assert(lib.skill.fan_zhuyao.filter(loss,c));c.h.push(card('extra','black'));assert(lib.skill.fan_zhuyao.filter(loss,c));
// Partner empty-hand draw belongs to the partner; no Zhuyao grant from partner loss.
trace.length=0;await loseAll(ally);assert.equal(ally.h.length,1);assert(!trace.some(x=>x==='fan_zhuyao_chengshi'));
// Partial loss and non-hand fake-card loss never count as losing the last hand.
c.h=[card('a','red'),card('b','black')];trace.length=0;const partial=await loseAll(c,[c.h[0]]);assert(!lib.skill.fan_zhuyao.filter(partial,c));
const fakeLoss={name:'lose',player:c,hs:[],fan_yingxin_before:c.h.map(card=>({card,color:card.color}))};await dispatch('loseEnd',fakeLoss);assert(!lib.skill.fan_zhuyao.filter(fakeLoss,c));
// Single color, nested player departure, and only-Zhuyao ownership.
c.mounted.delete('fan_yingxin');c.h=[card('a','red')];trace.length=0;await loseAll(c);assert.equal(c.h.length,1);assert(!trace.includes('fan_zhuyao_chengshi'));assert(!trace.includes('fan_zhuyao_lose1'));c.mounted.add('fan_yingxin');
c.h=[card('a','black')];trace.length=0;await loseAll(c);assert(!trace.includes('fan_zhuyao_draw1'));assert(!trace.includes('fan_zhuyao_chengshi'));
c.h=[card('a','red'),card('b','black')];onLoseHp=()=>c.out=true;trace.length=0;await loseAll(c);assert(!trace.includes('fan_zhuyao_draw1'));assert(!trace.includes('fan_zhuyao_chengshi'));onLoseHp=null;c.out=false;
// Full Miyan -> last-hand triggers -> Wuzhong -> flip -> random pile basic.
c.h=[card('sha','black'),card('tao','red')];c.turned=false;ally.h=[];chosenTarget=enemy;buttonChoice=['trick','','wuzhong'];
ui.cardPile.childNodes=[card('lebu','black'),card('sha','black'),card('tao','red')];trace.length=0;
onUse=async p=>{await loseAll(p);trace.push('wuzhong');await p.draw(2);trace.push('useCardAfter');};
const damage={name:'damage',player:ally,num:1};assert(lib.skill.fan_miyan.filter(damage,c));
await lib.skill.fan_miyan.content({},damage,c);
assert.equal(c.h.length,5);assert.equal(ally.h.length,1);assert(c.turned);
assert(trace.indexOf('fan_yingxin_draw1')<trace.indexOf('fan_zhuyao_lose1'));assert(trace.indexOf('fan_zhuyao_chengshi')<trace.indexOf('wuzhong'));
assert(trace.indexOf('useCardAfter')<trace.indexOf('turn'));assert(trace.indexOf('turn')<trace.lastIndexOf('gain:p0'));
assert.equal(trace.filter(x=>x==='fan_miyan_use1').length,1);assert.equal(trace.filter(x=>x==='fan_miyan_turn1').length,1);
assert(!lib.skill.fan_miyan.filter(damage,c));assert(!lib.skill.fan_miyan.filter({name:'damage',player:enemy},c));
// Both cancellation steps leave cards, orientation, and audio untouched.
c.turned=false;c.h=[card('sha','red')];const before=c.h.slice();accept=false;trace.length=0;await lib.skill.fan_miyan.content({},damage,c);assert.deepEqual(c.h,before);assert.deepEqual(trace,[]);
accept=true;useAccept=false;await lib.skill.fan_miyan.content({},damage,c);assert.deepEqual(c.h,before);assert.deepEqual(trace,[]);useAccept=true;
// Native selection constraints: immutable entire-hand snapshot and ordinary range/count checks.
status.event={player:c,fan_miyan_hand:before,fan_miyan_card:{name:'sha'}};ui.selected.cards=before.slice();
assert(lib.skill.fan_miyan_backup.filterOk());c.h.push(card('new','black'));assert(!lib.skill.fan_miyan_backup.filterOk());c.h=before.slice();
ui.selected.cards=[];assert(!lib.skill.fan_miyan_backup.filterOk());ui.selected.cards=before.slice();c.turned=true;assert(!lib.skill.fan_miyan_backup.filterOk());c.turned=false;
c.h[0].disabled=true;assert(!lib.skill.fan_miyan.filter(damage,c));delete c.h[0].disabled;c.h=[];assert(!lib.skill.fan_miyan.filter(damage,c));
c.h=[card('sha','red')];c.noTargets=lib.inpile.slice();assert(!lib.skill.fan_miyan.filter(damage,c));delete c.noTargets;
// Exact classic Sha attributes, delayed trick excluded; small vs expensive hand changes AI choice.
const dialogs=[];c.chooseButton=arg=>{dialogs.push(arg);return choice(()=>({bool:false}));};await lib.skill.fan_miyan.content({},damage,c);
const names=dialogs[0][1][0];assert.deepEqual(names.filter(x=>x[2]==='sha').map(x=>x[3]),[undefined,'fire','thunder']);assert(!names.some(x=>x[2]==='lebu'));
const score=new Function('lib','game','get','ui','_status',read('../character/skills/citlali.js').replace(/^import .*;\r?\n/gm,'').replace('export function miyanValue','function miyanValue').replace('export default','const unused =')+'\nreturn miyanValue;')(lib,game,get,ui,status);
c.h=[card('a','red',1)];const small=score(c,{name:'wuzhong'});c.h=Array.from({length:10},()=>card('a','red',10));assert(score(c,{name:'wuzhong'})<small);
// Lianying reads all losses of THIS turn, capped at five; skip/cancel and expiry.
assert(!lib.skill.fan_citlali_lianying.filter({player:c},c));assert(lib.skill.fan_citlali_lianying.filter({player:enemy},c));
c.history=[{cards2:Array.from({length:8},()=>card('a','red'))}];deck=Array.from({length:5},()=>card('a','red'));deckResult=deck.slice();chosenTarget=ally;trace.length=0;accept=true;
const allyBefore=ally.h.length;await lib.skill.fan_citlali_lianying.content({}, {player:enemy},c);assert.equal(ally.h.length-allyBefore,5);assert.equal(deck.length,0);assert.equal(trace.filter(x=>x==='fan_citlali_lianying1').length,1);
accept=false;trace.length=0;await lib.skill.fan_citlali_lianying.content({}, {player:enemy},c);assert.deepEqual(trace,[]);accept=true;
lib.skill.fan_zhuyao_chengshi_effect.onremove(c);assert(!c.hasSkill('fan_citlali_lianying'));
// Clean shared cards when source skill is actually removed; preserve separate sources.
c.mounted.delete('fan_yingxin');lib.skill.fan_yingxin.onremove(c);assert(!ally.hasSkill('fan_yingxin_share'));assert.equal(ally.s.length,0);assert.equal(c.s.length,0);
const loop=read('../../../noname/library/element/gameEvent.js');assert(loop.indexOf('await trigger("End", 3)')<loop.indexOf('await trigger("After", 4)'));
// Every specified branch resolves to its exact local original/output/subtitle.
const manifest=JSON.parse(read('../audio/citlali/originals/citlali-sources.json'));
assert.equal(Object.keys(manifest.clips).length,17);
const labels=['突破的感受·合','加入队伍·其三','关于欧洛伦…','元素战技·其一','元素战技·其三','元素战技·其四','元素战技·其五','元素战技·其二','打开宝箱·其二','打开宝箱·其一','元素爆发·其二','元素爆发·其三','闲聊·喝酒','下雨的时候…','倒下·其一','倒下·其二','倒下·其三'];
assert.deepEqual(Object.values(manifest.clips).map(c=>c.label),labels);
for(const [id,clip] of Object.entries(manifest.clips)){
 for(const [path,bytes,hash] of [[clip.original,clip.bytes,clip.original_sha256],[clip.output,clip.output_bytes,clip.sha256]]){
  const data=readFileSync(new URL('../'+path,import.meta.url));assert.equal(data.length,bytes);assert.equal(createHash('sha256').update(data).digest('hex'),hash);
 }
 assert(clip.volume.after.true_peak_dbtp<=-1);assert(read('../extension.js').includes('"'+clip.output+'"'));
 if(id==='fan_yingxin_start'){assert.deepEqual(clip.trim_seconds,[0,2.95]);assert.equal(clip.text,'从今以后，我会一直与你同行。');}else assert.equal(clip.trim_seconds,null);
 if(lib.skill[id]){const parsed=get.Audio.skill({skill:id});assert.deepEqual(parsed.fileList,['ext:原神/'+clip.output]);assert(parsed.textList.includes(clip.text));}
}
const characters=loadedCharacters;
assert.deepEqual(get.Audio.die({player:'fan_citlali',info:characters.fan_citlali[4].find(t=>t.startsWith('die:')).slice(4)}).fileList,[1,2,3].map(i=>`ext:原神/audio/citlali/die/fan_citlali${i}.mp3`));
lib.config.background_speak=false;const playCount=played.length;nativePlay('fan_yingxin_draw1','fan_citlali');assert.equal(played.length,playCount);lib.config.background_speak=true;
for(const id of ['fan_yingxin_draw1','fan_zhuyao_lose1','fan_zhuyao_draw1','fan_zhuyao_chengshi','fan_citlali_lianying1','fan_miyan_use1','fan_miyan_turn1']){nativePlay(id,'fan_citlali');assert.equal(played.at(-1).length,1);}
console.log('PASS Citlali mounted-group event simulation: loseEnd/loseAfter snapshots, original-owner borrowed material/response, stale card cancellation, red/black branches/seat order/departure, complete Miyan chain/cancellation/selection/AI/range-count checks, SB Lianying allocation/cap/expiry. No live game UI.');
console.log('PASS Citlali native audio: 17 exact source entries, original/output hashes, encoded peaks, trim/subtitles, silent log calls, native branch playback, death clips and mute switch. No manual listening.');
