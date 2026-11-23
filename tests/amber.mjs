import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('character/skills/amber.js','utf8').replace(/^import .*;\r?\n/,'').replaceAll('export const','const').replace('export default','return');
const skills=new Function('game','get',source)({}, {attitude:()=>5,owner:card=>hand.includes(card)?target:recipient});
const a={},b={};let hand=[a,b],given=[],picks=[a],recipient,asks=0;
const choice=result=>({set(){return this},async forResult(){return result}});
const target={addGaintag(cards,tag){for(const card of cards)card.tag=tag},isIn:()=>true,getCards:()=>hand,countCards:()=>hand.length,async give(cards){given.push(...cards);hand=hand.filter(c=>!cards.includes(c))}};
recipient={addGaintag(cards,tag){for(const card of cards)card.tag=tag},isIn:()=>true,countCards:()=>0};
const player={storage:{},isIn:()=>true,getAttackRange:()=>2,choosePlayerCard:()=>choice({bool:true,cards:picks}),viewCards:async()=>{},chooseButtonTarget:()=>{asks++;return choice({bool:true,links:picks.slice(),targets:[recipient]})}};
await skills.fan_zhencha.content({targets:[target]},null,player);
assert.equal(a.tag,"eternal_fan_zhencha");assert.equal(given.length,0);assert.equal(asks,0);assert(player.storage.fan_zhencha.includes(a));
picks=[b];await skills.fan_zhencha.content({targets:[target]},null,player);assert.equal(given.length,0); // 未再次观看a不能交出a
picks=[a,b];await skills.fan_zhencha.content({targets:[target]},null,player);assert.deepEqual(given,[a,b]);
hand=[a];picks=[a];recipient=target;await skills.fan_zhencha.content({targets:[target]},null,player);assert.deepEqual(hand,[a]);assert(player.storage.fan_zhencha.includes(a));
let phases=[];player.phase=async id=>phases.push(id);await skills.fan_guanjun.content({}, {},player);assert.deepEqual(phases,['fan_guanjun']);
console.log('Amber: first/second viewing, current selection, all marked cards and self recipient passed');

// 同次观看两张已标记牌，可分别交给不同角色。
hand=[a,b];picks=[a,b];const first={isIn:()=>true,addGaintag(){}}, second={isIn:()=>true,addGaintag(){}};let step=0;const recipients=[];
player.chooseButtonTarget=()=>choice({bool:true,links:[step===0?a:b],targets:[step++===0?first:second]});
target.give=async(cards,to)=>{recipients.push(to);hand=hand.filter(c=>!cards.includes(c))};
await skills.fan_zhencha.content({targets:[target]},null,player);
assert.deepEqual(recipients,[first,second]);assert.equal(hand.length,0);
console.log('Multiple recipients passed');

