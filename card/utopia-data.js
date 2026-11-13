export const utopiaFaces = Object.freeze({
  fan_xiwangdechaoyue: ["diamond",13], fan_xiwanghuang: ["diamond",4],
  fan_weilaihuang: ["diamond",1], fan_xingguangliqiu: ["diamond",1],
  fan_fanbeijihui: ["diamond",1],
});
export function sampleUtopia(random = Math.random) {
  const roll = () => { const n=random(); if(!Number.isFinite(n)||n<0||n>=1) throw new RangeError("随机数须在[0,1)内"); return n; };
  const count=roll()<.5?2:3, result=[];
  for(let i=0;i<count;i++) result.push({source:"pile",name:roll()<2/3?"sha":"wuxie"});
  for(let i=count;i<5;i++) {
    let name=["fan_xiwanghuang","fan_xingguangliqiu","fan_fanbeijihui"][Math.floor(roll()*3)];
    if(name==="fan_xiwanghuang"&&roll()<1/3) name="fan_weilaihuang";
    result.push({source:"derived",name});
  }
  return result;
}

