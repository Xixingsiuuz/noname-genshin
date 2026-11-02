import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// 真实 addSkill/awakenSkill/disableSkill/restoreSkill；事件分发模拟只调用已挂载技能。
const array=()=>{
  const a=[];
  a.add=function(x){if(!this.includes(x))this.push(x);};
  a.remove=function(x){const i=this.indexOf(x);if(i>=0)this.splice(i,1);};
  return a;
};
// 原生 disableSkill 内部创建普通数组，需要本地引擎同名数组辅助方法。
Object.defineProperty(Array.prototype,'add',{configurable:true,writable:true,value:function(x){if(!this.includes(x))this.push(x);return this;}});
Object.defineProperty(Array.prototype,'remove',{configurable:true,writable:true,value:function(x){const i=this.indexOf(x);if(i>=0)this.splice(i,1);return this;}});
const lib={skill:{},filter:{targetEnabledx:()=>true}};
const game={broadcast(){},broadcastAll(){},callHook(){},async delay(){},filterPlayer:()=>[p,other],countPlayer:()=>2};
const status={event:{clearStepCache(){}}},ui={};
const get={info:id=>lib.skill[id],type:c=>c.type||'basic',is:{shownCard:c=>!!c.shown},translation:c=>c.name};
const source=readFileSync(new URL('../character/skills/columbina.js',import.meta.url),'utf8');
const skills=new Function('lib','game','get','ui','_status','setSulvEffect','showSulvQueue',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(lib,game,get,ui,status,()=>{},()=>{});
Object.assign(lib.skill,skills);
for(const [id,skill] of Object.entries(skills))for(const [sub,info] of Object.entries(skill.subSkill||{}))lib.skill[id+'_'+sub]=info;
const engine=readFileSync(new URL('../../../noname/library/element/player.js',import.meta.url),'utf8');
function method(name,next){
  const body=engine.slice(engine.indexOf('  '+name+'('),engine.indexOf('  '+next+'('));
  return new Function('lib','game','get','ui','_status','return ({'+body+'}).'+name)(lib,game,get,ui,status);
}
const mounted=new Set();
const p={storage:{},skills:array(),awakenedSkills:array(),disabledSkills:{},
  isIn:()=>true,hasZhuSkill:()=>false,markSkill(){},unmarkSkill(){},
  hasSkill(id){return this.skills.includes(id)&&!this.disabledSkills[id];},
  addSkillTrigger(id){if(mounted.has(id))return;mounted.add(id);lib.skill[id].init?.(this);},
  getCards:()=>[],countCards:()=>0,
};
const other={getCards:()=>[],countCards:()=>0};
for(const [name,next] of [['addSkill','addAdditionalSkills'],['awakenSkill','awakenQidingSkill'],['restoreSkill','disableSkill'],['disableSkill','enableSkill'],['enableSkill','checkMarks']])p[name]=method(name,next);
const replay=[];
p.chooseUseTarget=opts=>({forResult:async()=>{replay.push(opts.card.name);await dispatch({card:opts.card,cards:[],targets:[other]});return {bool:true};}});
let loss;
p.getHistory=(type,f)=>loss&&f(loss)?[loss]:[];
async function dispatch(event){
  for(const id of mounted){
    const info=lib.skill[id];
    if(p.disabledSkills[id]||info.trigger?.player!=='useCard1')continue;
    if(!info.filter||info.filter(event,p))await info.content({},event,p);
  }
}
async function use(name,shown=true,isCard=true){
  const physical={cardid:'physical-'+name,hasGaintag:()=>false};
  const event={card:{name,isCard,cardid:physical.cardid},cards:[physical],targets:[other]};
  loss={hs:[physical],es:[],gaintag_map:{[physical.cardid]:shown?['visible_test']:[]},getParent:()=>event};
  await dispatch(event);
}
try{
  p.addSkill('fan_sulv');
  assert(mounted.has('fan_sulv_record'));assert(mounted.has('fan_sulv_refresh'));
  await use('sha');await use('shunshou');
  await skills.fan_sulv.content({},null,p);
  assert.deepEqual(replay,['shunshou','sha']);
  assert(p.disabledSkills.fan_sulv);
  assert(!p.disabledSkills.fan_sulv_record); // 首次发动后的记录器仍可运行。
  assert.equal(p.storage.fan_sulv_records.length,2); // 虚拟重放未污染记录。
  await use('juedou');await use('sha');
  await use('wuzhong',false);await use('nanman',true,false);
  assert.deepEqual(p.storage.fan_sulv_records.map(c=>c.name),['sha','shunshou','juedou','sha']);
  // 数量达标后真实恢复，再走第二次发动；不手动改写或重新初始化记录。
  other.countCards=z=>z.includes('e')?8:0;
  const refresh=lib.skill.fan_sulv_refresh;
  assert(refresh.filter({},p));await refresh.content({},null,p);
  assert(skills.fan_sulv.filter({},p));
  replay.length=0;await skills.fan_sulv.content({},null,p);
  assert.deepEqual(replay,['sha','juedou','shunshou','sha']);
  assert.equal(p.storage.fan_sulv_records.length,4);
  p.addSkill('fan_sulv');assert.equal(p.storage.fan_sulv_records.length,4);
  console.log('Sulv recording: native skill mounting/disable/restore; post-first-use updates; duplicate cards; dark/virtual exclusion; second replay uses latest reverse sequence passed.');
}finally{delete Array.prototype.add;delete Array.prototype.remove;}
