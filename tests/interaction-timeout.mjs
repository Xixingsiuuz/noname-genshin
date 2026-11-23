import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../character/skills/ororon.js',import.meta.url),'utf8')
 .replace(/^import .*;\r?\n/gm,'').replace('export function','function');
const helpers=source.slice(0,source.indexOf('// Re-evaluated'));
class Node {
 constructor(link){this.link=link;this.listeners=new Map();this.style={};this.classList={toggle(){},remove(){}};}
 addEventListener(type,fn){this.listeners.set(type,fn);}
 removeEventListener(type,fn){if(this.listeners.get(type)===fn)this.listeners.delete(type);}
 click(){this.listeners.get('click')?.({stopImmediatePropagation(){},preventDefault(){}});}
 querySelector(){return null;} appendChild(){} setAttribute(){} close(){this.closed=true;}
}
let alive=true;
const ally=Object.assign(new Node(),{isIn:()=>alive,countCards:()=>0,node:{avatar:{style:{}}}});
const enemy=Object.assign(new Node(),{isIn:()=>true,countCards:()=>0,node:{avatar:{style:{}}}});
const cards=[{value:3},{value:4}];
const game={filterPlayer:fn=>[ally,enemy].filter(fn),resume(){this.resumes=(this.resumes||0)+1;}};
const get={translation:t=>t===ally?'友方':'敌方',attitude:(p,t)=>t===ally?5:-5,value:c=>c.value};
const ui={create:{control(label,fn){const node=new Node();node.firstChild=new Node();node.submit=fn;return node;}}};
const status={};const document={createElement:()=>new Node()};
const {assign,setupCangmiAssignment}=new Function('game','get','ui','_status','document',helpers+'return {assign,setupCangmiAssignment};')(game,get,ui,status,document);
for(let repeat=0;repeat<2;repeat++){
 for(const mode of ['manual','partial','leave','close','stale']){
  alive=true;game.resumes=0;
  const event={player:{},fanCangmiCards:cards,fanCangmiTargets:[ally,enemy]};status.event=event;
  const dialog=new Node();dialog.content={querySelectorAll:()=>[]};dialog.buttons=cards.map(c=>new Node(c));dialog.add=()=>{};
  setupCangmiAssignment(dialog);
  assert.equal(event.controlbar.firstChild.style.pointerEvents,'none');
  event.controlbar.submit();assert.equal(game.resumes,0);
  dialog.buttons[0].click();enemy.click();
  assert.equal(game.resumes,0,'分配不立即提交');
  if(mode==='manual'){
   dialog.buttons[1].click();ally.click();
   assert.equal(event.controlbar.firstChild.style.pointerEvents,'');
   event.controlbar.submit();
  }else if(mode==='close'){
   dialog.close();assert.equal(event.switchToAuto,undefined);
   for(const node of [...dialog.buttons,ally,enemy])assert.equal(node.listeners.size,0);
   continue;
  }else if(mode==='stale'){
   status.event={};event.switchToAuto();assert.equal(game.resumes,0);dialog.close();continue;
  }else{
   if(mode==='leave'){dialog.buttons[0].click();ally.click();alive=false;}
   event.switchToAuto();
  }
  assert.equal(game.resumes,1);
  const plan=new Map(event.result.fanCangmiAssignments);
  if(mode==='leave')assert.deepEqual(plan.get(enemy),cards);
  else {assert.deepEqual(plan.get(enemy),[cards[0]]);assert.deepEqual(plan.get(ally),[cards[1]]);}
  event.controlbar.submit();assert.equal(game.resumes,1,'禁止重复提交');
  for(const node of [...dialog.buttons,ally,enemy])assert.equal(node.listeners.size,0);
 }
}
let sent;
const player={chooseControl(label){assert.equal(label,'确定');return {set(k,v){this[k]=v;return this;},async forResult(){sent=this;return {control:'确定',fanCangmiAssignments:[[enemy,[cards[0],cards[0],{}]]]};}};}};
alive=true;const result=await assign(cards,player);
assert.deepEqual(result.get(enemy),[cards[0]]);assert.deepEqual(result.get(ally),[cards[1]]);
assert(sent.dialogcontrol);assert.deepEqual(sent.fanCangmiCards,cards);
// Remote callback survives function serialization, with no captured local variables.
const remote=new Function('game','get','ui','_status','document','return ('+sent.addDialog[0][0].toString()+');')(game,get,ui,status,document);
assert.equal(typeof remote,'function');
console.log('PASS 藏蜜：点击批量分配、确认门槛、托管保留方案并补全、离场重评、关闭清理、旧事件与重复提交保护');
const monarchSource=readFileSync(new URL('../card/monarch.js',import.meta.url),'utf8')
 .replace(/^import.*;\r?\n/gm,'').replace(/export /g,'');
const pile={childNodes:[]},good={parentNode:pile,value:8},bad={parentNode:pile,value:-1},gone={parentNode:null,value:99};
let checked=false;
const actor={hasUseTarget:()=>true,getUseValue:c=>c.value,chooseButton(){
 return {custom:{add:{}},isMine:()=>true,set(k,v){this[k]=v;return this;},async forResult(){
  assert.equal(this.filterOk(),false);
  assert.deepEqual(this.processAI(),{bool:true,links:[good]});
  good.parentNode=null;bad.parentNode=null;
  assert.deepEqual(this.processAI(),{bool:false});checked=true;
  return {bool:false};
 }};
}};
const mc=new Function('game','get','ui','_status','sampleHeavenlyMonarch',monarchSource+';return monarchCards;')
 ({},{name:c=>c.name},{cardPile:pile},{},()=>[bad,good,gone]);
await mc.fan_tiandi.content({target:actor});assert(checked);
console.log('PASS 天帝模拟：禁止原生确认时直接返回AI结果、过滤离开牌堆的牌、无合法牌结束');


