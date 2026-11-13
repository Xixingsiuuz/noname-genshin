export const monarchFaces={fan_fanshenzhidiwang:["spade",13],fan_tiandi:["spade",8],fan_xiedi:["spade",6],fan_yuanxiedi:["spade",8],fan_diwanglingyu:["spade",1]};
function roll(random){const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n;}
export function sampleMonarch(random=Math.random){
 const count=roll(random)<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",name:roll(random)<2/3?"sha":"guohe"});
 for(let i=count;i<5;i++){let name=["fan_tiandi","fan_xiedi","fan_diwanglingyu"][Math.floor(roll(random)*3)];if(name==="fan_xiedi"&&roll(random)<1/3)name="fan_yuanxiedi";result.push({source:"derived",name});}
 return result;
}
// 不移动任何实体牌：先不放回抽牌名，再在该牌名中均匀抽一张。
export function sampleHeavenlyMonarch(cards,random=Math.random){
 const groups=new Map();for(const card of cards){if(!groups.has(card.name))groups.set(card.name,[]);groups.get(card.name).push(card);}
 const names=[...groups.keys()],result=[];
 while(names.length&&result.length<3){const name=names.splice(Math.floor(roll(random)*names.length),1)[0],list=groups.get(name);result.push(list[Math.floor(roll(random)*list.length)]);}
 return result;
}
