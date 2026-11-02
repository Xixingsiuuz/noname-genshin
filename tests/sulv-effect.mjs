import assert from 'node:assert/strict';
import { setSulvEffect } from '../ui/sulv-effect.js';

// 独立于游戏流程验证视觉层生命周期，不需要真实牌桌 DOM。
const node = () => ({
  children: [], attributes: {},
  style: {setProperty() {}},
  classList: {values:new Set(),add(x){this.values.add(x);},remove(x){this.values.delete(x);},contains(x){return this.values.has(x);}},
  appendChild(child) { this.children.push(child);child.parent=this; },
  setAttribute(k,v) {this.attributes[k]=v;},
  remove() {this.parent.children=this.parent.children.filter(child=>child!==this);},
});
const head=node(),body=node();
const find=(root,id)=>root.id===id?root:root.children.map(child=>find(child,id)).find(Boolean);
const pending=[];
const previousDocument=globalThis.document,previousTimer=globalThis.setTimeout;
globalThis.document={head,body,createElement:node,getElementById:id=>find(head,id)||find(body,id)};
globalThis.setTimeout=fn=>pending.push(fn);
try {
  setSulvEffect(true,'a');
  const effect=body.children[0];
  assert.equal(effect.attributes['aria-hidden'],'true');
  assert.equal(effect.children.length,51);
  setSulvEffect(true,'a'); assert.equal(body.children.length,1);
  setSulvEffect(true,'b'); setSulvEffect(false,'a');
  assert(!effect.classList.contains('fan-sulv-leaving'));
  setSulvEffect(false,'b'); assert(effect.classList.contains('fan-sulv-leaving'));
  setSulvEffect(true,'a'); pending.shift()();
  assert.equal(body.children[0],effect); // 旧淡出计时器不移除重新发动的特效。
  assert(!effect.classList.contains('fan-sulv-leaving'));
  setSulvEffect(false,'a'); pending.shift()(); assert.equal(body.children.length,0);
  setSulvEffect(false,'a');
  setSulvEffect(true,'c'); assert.equal(head.children.length,1); // 样式只注入一次。
  setSulvEffect(false,'c'); pending.shift()(); assert.equal(body.children.length,0);
} finally {
  globalThis.document=previousDocument;globalThis.setTimeout=previousTimer;
}
console.log('Sulv VFX: reuse, multiple owners, fade cleanup, restart during fade and style deduplication passed.');
