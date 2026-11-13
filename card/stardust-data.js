export const stardustFaces = Object.freeze({
  fan_xingchendehuiguang: ["heart",13], fan_xingchenlong: ["heart",8],
  fan_liuxinglong: ["heart",10], fan_tiaolv: ["heart",1],
  fan_feipinhuishou: ["heart",3], fan_yuzhouyaobian: ["heart",12],
});
export function sampleStardust(random = Math.random) {
  const roll = () => { const n = random(); if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError("随机数须在[0,1)内"); return n; };
  const count = roll() < .5 ? 2 : 3, result = [];
  for (let i=0;i<count;i++) result.push({source:"pile",kind:roll()<2/3?"shan":"lowNumber"});
  for (let i=count;i<5;i++) {
    let name=["fan_xingchenlong","fan_tiaolv","fan_feipinhuishou"][Math.floor(roll()*3)];
    if(name==="fan_xingchenlong"&&roll()<1/3) name="fan_liuxinglong";
    result.push({source:"derived",name});
  }
  return result;
}
