import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installSharedZhinang} from '../character/zhinang.js';
Array.prototype.add = function(item) { if (!this.includes(item)) this.push(item); return this; };
const source = readFileSync(new URL('../character/skills/kokomi.js', import.meta.url), 'utf8');
const played = [], traces = [];
const target = { hp: 3, maxHp: 3, isIn: () => true };
const cards = [{name:'wuzhong'}, {name:'guohe'}];
let status = {};
const game = {roundNumber:1,trySkillAudio:id=>played.push(id),broadcastAll:(fn,...args)=>fn(...args)};
const get = {zhinangs:()=>['wuzhong'],cardPile:filter=>cards.find(filter),type:()=> 'trick',value:()=>1,translation:()=> '测试角色'};
const lib = {inpile:['wuzhong','guohe','shunshou']};
installSharedZhinang(get,()=>status);
installSharedZhinang(get,()=>status);
const skills = new Function('game','get','lib','_status',source.replace(/^import .*;\r?\n/gm,'').replace('export default','return'))(game,get,lib,status);
const choose = result => ({set(){return this;},forResult:async()=>result});
const player = {
 storage:{},isIn:()=>true,getStorage(key){return this.storage[key]||[];},
 gain:async list=>traces.push(['gain',list.map(c=>c.name)]),countCards:()=>3,
 chooseCard:()=>choose({bool:true,cards:[cards[1]]}),getCards:()=>cards,
 give:async list=>traces.push(['give',list.map(c=>c.name)]),
 chooseButton:()=>choose({bool:true,links:[[null,null,'guohe']]}),
};
const end=skills.fan_miaosuan.subSkill.end;
const record=skills.fan_miaosuan.subSkill.record;
assert.ok(skills.fan_miaosuan.group.includes('fan_miaosuan_record'));
assert.equal(skills.fan_miaosuan.mod,undefined);
async function settle(recovered,full){
 traces.length=played.length=0;target.hp=full?3:2;
 player.storage={fan_miaosuan:{target}};
 if(recovered) await record.content({}, {player:target,num:1},player);
 assert.ok(end.filter({},player));
 await end.content({}, {},player);
 assert.equal(player.storage.fan_miaosuan,undefined);
}
await settle(false,false);assert.equal(traces.length,0);
await settle(false,true);assert.equal(traces[0][0],'gain');assert.equal(played.includes('fan_miaosuan_chengshi_voice'),false);
await settle(true,false);assert.equal(traces[0][0],'gain');assert.equal(played.includes('fan_miaosuan_chengshi_voice'),false);
await settle(true,true);assert.deepEqual(status.fan_miaosuan_names,['guohe']);assert.deepEqual(traces[1],['give',['guohe']]);
assert.deepEqual(get.zhinangs(),['wuzhong','guohe']);
player.storage={};assert.ok(get.zhinangs().includes('guohe'),'shared record survives owner storage removal');
player.storage.fan_miaosuan={target};traces.length=0;
await end.content({}, {},player);assert.deepEqual(traces[0],['gain',['wuzhong','guohe']]);
game.roundNumber=2;target.hp=2;player.storage.fan_miaosuan={target};traces.length=0;
await end.content({}, {},player);assert.equal(traces.length,0,'previous-round recovery must expire');
player.chooseTarget=()=>choose({bool:true,targets:[{isIn:()=>true,recover:async n=>traces.push(['heal',n])}]});
let cancelled=false;
await skills.fan_haiji.content({}, {num:4,cancel(){cancelled=true;}},player);
assert.ok(cancelled);assert.deepEqual(traces.at(-1),['heal',1]);
assert.equal(record.filter({num:0}),false);
const ineffaSource=readFileSync(new URL('../character/skills/ineffa.js',import.meta.url),'utf8');
const options=new Function('get',ineffaSource.slice(ineffaSource.indexOf('const options ='),ineffaSource.indexOf('const pendingConfirm'))+'return options;')(get);
assert.deepEqual(options({filterCard:()=>true},player),['wuzhong','guohe'],'Ineffa reads shared names');
assert.deepEqual(options({filterCard:card=>card.name!=='guohe'},player),['wuzhong'],'Ineffa retains legality filter');
status={};assert.deepEqual(get.zhinangs(),['wuzhong'],'new game has no old additions');
console.log('PASS Kokomi: mounted recovery recorder, round expiry, four reward/乘势 conditions, arbitrary hand gift, recorded names, fixed 1 healing (simulation).');
