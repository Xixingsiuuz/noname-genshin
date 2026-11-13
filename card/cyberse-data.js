export const cyberseFaces={fan_dianzijielianjie:["spade",13],fan_lianmayuzhe:["spade",4],fan_yuanshishengming:["spade",11],fan_wangjichongtu:["spade",1],fan_wangjiwakuang:["spade",2]};
export function sampleCyberse(random=Math.random){
 const roll=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError("随机数须在[0,1)内");return n};
 const count=roll()<.5?2:3,result=[];
 for(let i=0;i<count;i++)result.push({source:"pile",name:roll()<2/3?"sha":"guohe"});
 for(let i=count;i<5;i++){let name=["fan_lianmayuzhe","fan_wangjichongtu","fan_wangjiwakuang"][Math.floor(roll()*3)];if(name==="fan_lianmayuzhe"&&roll()<1/3)name="fan_yuanshishengming";result.push({source:"derived",name});}
 return result;
}
