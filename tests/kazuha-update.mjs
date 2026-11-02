import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('character/skills/kazuha.js','utf8').replace(/^import .*;$/m,'');
const skills=(await import('data:text/javascript,'+encodeURIComponent('const get = { suit: () => "club" };\n' + source))).default;
for(const [initial,num,expected] of [[0,5,3],[2,3,3],[3,2,3]]) {
 let marks=initial;
 const player={countMark:()=>marks,addMark:(id,n)=>marks+=n};
 await skills.fan_jilv.content({}, {name:'damage',num},player);
 assert.equal(marks,expected);
}
let marks=2;
await skills.fan_jilv.content({}, {name:'lose',cards2:[1,2,3]}, {countMark:()=>marks,addMark:(id,n)=>marks+=n});

assert.equal(marks,3);
const calls=[];
const player={storage:{},countMark:()=>3,awakenSkill:()=>calls.push('awaken'),recover:async()=>calls.push('recover'),draw:async n=>calls.push(['draw',n]),addSkill:async id=>calls.push(id)};
assert.equal(skills.fan_zhenxiu.filter({},player),true);
await skills.fan_zhenxiu.content({}, {},player);
assert.deepEqual(calls,['awaken','recover',['draw',2],'fan_huanlei']);
assert.equal(skills.fan_zhenxiu.filter({},player),false);
console.log('万叶：标记上限、批量失牌、觉醒顺序及重复觉醒检查通过');
