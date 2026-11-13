export const blackwingFaces={fan_qiheizhixuanfeng:["club",13],fan_kaiyiya:["club",7],fan_chongzhuangkaiyi:["club",10],fan_zhouyuleiqie:["club",7],fan_heixuanfeng:["club",1]};
export function sampleBlackwing(random=Math.random){
 const roll=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n;};
 const count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",kind:roll()<2/3?"blackSha":"blackOther"});
 for(let i=count;i<5;i++){let name=["fan_kaiyiya","fan_zhouyuleiqie","fan_heixuanfeng"][Math.floor(roll()*3)];if(name==="fan_kaiyiya"&&roll()<1/3)name="fan_chongzhuangkaiyi";result.push({source:"derived",name});}
 return result;
}
