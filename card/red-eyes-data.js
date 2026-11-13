export const redEyesFaces={fan_zhenhongzhijuexing:["spade",13],fan_heilong:["spade",7],fan_heiganglong:["spade",7],fan_chuanshuoheishi:["spade",1],fan_heiyandan:["spade",7]};
function checkedRoll(random){const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n;}
function upgradedDragon(roll){return roll()<1/3?"fan_heiganglong":"fan_heilong";}
export function sampleBlackStone(random=Math.random){
 const roll=()=>checkedRoll(random);
 if(roll()<.5)return{source:"pile",name:roll()<2/3?"sha":"huogong"};
 return{source:"derived",name:roll()<.5?upgradedDragon(roll):"fan_heiyandan"};
}
export function sampleRedEyes(random=Math.random){
 const roll=()=>checkedRoll(random),count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",name:roll()<2/3?"sha":"huogong"});
 for(let i=count;i<5;i++){let name=["fan_heilong","fan_chuanshuoheishi","fan_heiyandan"][Math.floor(roll()*3)];if(name==="fan_heilong")name=upgradedDragon(roll);result.push({source:"derived",name});}
 return result;
}
