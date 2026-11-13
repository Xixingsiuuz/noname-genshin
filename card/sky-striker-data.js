export const skyStrikerFaces = {
 fan_shandaozhijilve: ["heart", 13],
 fan_shandaojiling: ["heart", 4],
 fan_yihualingyi: ["heart", 4],
 fan_shandaoqidong: ["heart", 1],
 fan_heiguafuqian: ["heart", 1],
};
export function sampleSkyStriker(random=Math.random){
 const roll=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n;};
 const count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",name:roll()<2/3?"shan":"tao"});
 for(let i=count;i<5;i++){let name=["fan_shandaojiling","fan_shandaoqidong","fan_heiguafuqian"][Math.floor(roll()*3)];if(name==="fan_shandaojiling"&&roll()<1/3)name="fan_yihualingyi";result.push({source:"derived",name});}
 return result;
}
