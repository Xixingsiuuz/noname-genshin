export const sixSamuraiFaces={fan_liuwuzhijiezhen:["diamond",13],fan_ziyan:["diamond",5],fan_zhenmoziyan:["diamond",6],fan_shinai:["diamond",3],fan_ruisui:["diamond",3]};
export function sampleSixSamurai(random=Math.random){
 const roll=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n;};
 const count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",name:roll()<2/3?"sha":"taoyuan"});
 for(let i=count;i<5;i++){let name=["fan_ziyan","fan_shinai","fan_ruisui"][Math.floor(roll()*3)];if(name==="fan_ziyan"&&roll()<1/3)name="fan_zhenmoziyan";result.push({source:"derived",name});}
 return result;
}
