import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const strip=s=>s.replace(/^import.*;\r?\n/gm,'').replace(/export /g,'');
const data=new Function(strip(read('../card/six-samurai-data.js'))+';return{sixSamuraiFaces,sampleSixSamurai};')();
const{sixSamuraiFaces:faces,sampleSixSamurai:sample}=data;
assert.equal(sample(()=>0).filter(c=>c.source==='pile').length,2);assert(sample(()=>0).slice(0,2).every(c=>c.name==='sha'));
assert(sample(()=>.99).slice(0,3).every(c=>c.name==='juedou'));assert(sample(()=>0).slice(2).every(c=>c.name==='fan_zhenmoziyan'));
assert.throws(()=>sample(()=>1),RangeError);
let seed=1,pileCount=0,sha=0,up=0,base=0;
for(let i=0;i<20000;i++)for(const c of sample(()=>((seed=(1664525*seed+1013904223)>>>0)/2**32))){if(c.source==='pile'){pileCount++;sha+=c.name==='sha';}else{up+=c.name==='fan_zhenmoziyan';base+=c.name==='fan_ziyan';}}
assert(Math.abs(pileCount/20000-2.5)<.025);assert(Math.abs(sha/pileCount-2/3)<.015);assert(Math.abs(up/(up+base)-1/3)<.02);
const red={color:"red"},black={color:"black"};
const ui={cardPile:{childNodes:[red,black]}};
Array.prototype.randomGet=function(){return this[0];};
const get={poptip:id=>"【"+id+"】",color:card=>card.color};
const {sixSamuraiCards:cards,sixSamuraiSkills:skills}=new Function("get","ui","sixSamuraiFaces","sampleSixSamurai",strip(read("../card/six-samurai.js"))+";return {sixSamuraiCards,sixSamuraiSkills};")(get,ui,faces,sample);
for(const [name,card] of Object.entries(cards)){
 assert(faces[name]);
 assert(existsSync(new URL("../"+card.image.replace("ext:原神/",""),import.meta.url)));
}
for(const [id,used,gained] of [["fan_shinai_gain",black,red],["fan_ruisui_gain",red,black]]){
 const skill=skills[id];
 assert.equal(skill.trigger.player,"useCard");
 assert(skill.filter({card:used}));
 let actual;
 const player={async gain(card){actual=card;}};
 await skill.content({}, {card:used,cards:[used]},player);
 assert.equal(actual,gained);
 actual=undefined;
 await skill.content({}, {card:used,cards:[gained]},player);
 assert.equal(actual,undefined);
}
assert.equal(cards.fan_zhenmoziyan.distance.attackFrom,-2);
assert.equal(skills.fan_ziyan_convert.viewAs.name,"wuxie");
console.log("PASS six samurai sampling, assets, equipment and color exchange");
