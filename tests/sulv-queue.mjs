import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const timers=[];
function node(){return {
  children:[],attributes:{},style:{values:{},setProperty(k,v){this.values[k]=v;}},
  classList:{values:new Set(),add(x){this.values.add(x);},toggle(x,on){if(on)this.values.add(x);else this.values.delete(x);},contains(x){return this.values.has(x);}},
  setAttribute(k,v){this.attributes[k]=v;},appendChild(c){this.children.push(c);c.parent=this;},
  insertBefore(c,before){this.children=this.children.filter(x=>x!==c);this.children.splice(this.children.indexOf(before),0,c);c.parent=this;},
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);},
};}
const body=node(),head=node(),arena=node();body.appendChild(arena);
const find=(root,id)=>root.id===id?root:root.children.map(c=>find(c,id)).find(Boolean);
const document={body,head,documentElement:{clientWidth:1920},getElementById:id=>find(body,id)||find(head,id),createElement:node};
const selected={cards:['untouched'],targets:['untouched']};
const ui={arena,selected,create:{card(parent){const c=node();c.init=data=>{c.face=data;};parent.appendChild(c);return c;}}};
const source=readFileSync(new URL('../ui/sulv-queue.js',import.meta.url),'utf8');
const show=new Function('ui','document','setTimeout',source.replace(/^import .*;\r?\n/gm,'').replace('export function showSulvQueue','return function showSulvQueue'))(ui,document,fn=>timers.push(fn));
const records=Array.from({length:12},(_,i)=>({name:i%2?'sha':'shunshou',nature:i%2?'fire':undefined}));
const snapshot=JSON.stringify(records);
show('start',records,0,'a');
const root=document.getElementById('fan-sulv-queue-a');
assert.equal(root.fanCards.size,6);assert.equal(root.attributes['aria-hidden'],'true');
assert.equal(root.fanCards.get(0).style.values['--fan-offset'],'0px');
assert.equal(root.fanCards.get(5).style.values['--fan-offset'],`${-104*(1.1+4*.66)}px`);
assert.equal(root.fanCards.get(0).style.values['--fan-card-w'],undefined);
assert.equal(root.fanCards.get(0).style.values['--fan-card-h'],undefined);
assert.equal(root.fanCards.get(0).parent,arena);
assert(root.fanCards.get(0).classList.contains('thrown'));
assert.equal(root.fanCards.get(0).fixed,true); // 响应牌结算时原生 ui.clear 不误删牌列。
assert(!head.children[0].textContent.includes('>.image'));
assert(!head.children[0].textContent.includes('width:'));
assert.equal(root.fanCards.get(0).style.values['--fan-scale'],'1');
assert.equal(root.fanCards.get(0).style.zIndex,'3');
assert(!head.children[0].textContent.includes('z-index:30'));
assert(parseFloat(root.fanCards.get(1).style.values['--fan-offset'])<=-104); // 当前牌无遮挡。
assert(root.fanCards.get(0).classList.contains('fan-sulv-queue-current'));
assert.deepEqual(root.fanCards.get(1).face,['none','','sha','fire']);
for(let i=0;i<records.length;i++){
  const next=root.fanCards.get(i+1);
  show('settle',[],i,'a');assert(root.fanCards.get(i).classList.contains('fan-sulv-card-done'));
  show('advance',[],i+1,'a');
  assert.equal(root.fanCards.size,Math.min(6,records.length-i-1));
  assert(!root.fanCards.has(i));
  if(next){assert.equal(root.fanCards.get(i+1),next);assert.equal(next.style.values['--fan-offset'],'0px');}
}
assert.equal(JSON.stringify(records),snapshot);assert.equal(ui.selected,selected);
show('stop',[],0,'a');show('start',records,0,'a');
const replacement=document.getElementById('fan-sulv-queue-a');timers.shift()();assert.equal(document.getElementById('fan-sulv-queue-a'),replacement);
document.documentElement.clientWidth=320;show('advance',[],0,'a');
const width=104*parseFloat(replacement.fanCards.get(0).style.values['--fan-scale']);
assert(width*4.24<=160); // 留出当前牌完整展示的间距后，六张仍不越界。
show('start',records,0,'b');show('stop',[],0,'a');timers.shift()();assert(!document.getElementById('fan-sulv-queue-a'));assert(document.getElementById('fan-sulv-queue-b'));
show('stop',[],0,'b');timers.shift()();assert.equal(arena.children.length,0);
show('start',[],0,'empty');assert.equal(arena.children.length,0);assert.equal(head.children.length,1);
console.log('Sulv queue: 12-card sequence, six-card cap, native faces, current fade, rightward reuse, refill, narrow screens, restart and cleanup passed.');
