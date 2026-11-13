import{game,get,lib,ui}from"../../../noname.js";
import{sixSamuraiFaces,sampleSixSamurai}from"./six-samurai-data.js";
function samuraiEquip(subtype, skill, distance, value) {
 return {type:"equip",subtype,skills:[skill],distance,enable:true,selectTarget:-1,toself:true,modTarget:true,
  filterTarget:(card,player,target)=>player===target&&target.canEquip(card,true),
  async content(event){await event.target.equip(event.cards[0]);},
  ai:{order:9,value,basic:{equipValue:value},result:{target:1}}};
}
function colorExchange(from,to) {
 return {equipSkill:true,forced:true,locked:false,trigger:{player:"useCard"},
  filter(event,player){return get.color(event.card,player)===from&&Array.from(ui.cardPile.childNodes).some(card=>get.color(card)===to);},
  async content(event,trigger,player){
   const cards=Array.from(ui.cardPile.childNodes).filter(card=>!trigger.cards?.includes(card)&&get.color(card)===to);
   if(cards.length)await player.gain(cards.randomGet(),"gain2");
  }};
}
function negate() {
 return {equipSkill:true,locked:false,enable:"chooseToUse",usable:1,position:"h",
  filter:event=>event.type==="wuxie",filterCard:true,viewAs:{name:"wuxie"},
  viewAsFilter:player=>player.countCards("h")>0,
  hiddenCard:(player,name)=>name==="wuxie"&&player.countCards("h")>0&&!player.getStat("skill").fan_ziyan_convert,
  check:card=>7-get.value(card),ai:{respondWuxie:true}};
}
const self={type:"trick",enable:true,selectTarget:-1,toself:true,filterTarget:(c,p,t)=>p===t};
export const sixSamuraiCards={
 fan_liuwuzhijiezhen:{...self,ai:{order:10,value:10,result:{target:5}},async content(event,trigger,player){
  const plan=sampleSixSamurai(),cards=[];
  for(const item of plan.filter(i=>i.source==="pile")){const c=get.cardPile2(c=>c.name===item.name);if(c){c.remove();c.original="c";cards.push(c);}else cards.push(...get.cards(1));}
  game.updateRoundNumber();if(cards.length)await player.gain(cards,"draw");
  if(player.isIn())await player.gain(plan.filter(i=>i.source==="derived").map(i=>game.createCard(i.name,...sixSamuraiFaces[i.name])),"draw");
 }},
 fan_ziyan:samuraiEquip("equip2","fan_ziyan_convert",{},7),
 fan_zhenmoziyan:samuraiEquip("equip1","fan_zhenmoziyan_convert",{attackFrom:-2},8),
 fan_shinai:samuraiEquip("equip3","fan_shinai_gain",{globalTo:1},8),
 fan_ruisui:samuraiEquip("equip4","fan_ruisui_gain",{globalFrom:-1},8),

};
for(const[name,c]of Object.entries(sixSamuraiCards))Object.assign(c,{derivation:"fan_cyno",destroy:"discardPile",fullskin:true,image:`ext:原神/image/card/${name}-framed.png`});
export const sixSamuraiSkills={
 fan_shinai_gain:colorExchange("black","red"),
 fan_ruisui_gain:colorExchange("red","black"),
 fan_ziyan_convert:negate(),
 fan_zhenmoziyan_convert:{
  equipSkill:true,locked:false,enable:"chooseToUse",usable:1,position:"h",selectCard:1,filterCard:true,
  filter(event,player){return player.countCards("h")>0&&lib.skill.fan_zhenmoziyan_convert.choices(event,player).length>0;},
  choices(event,player){
   return [...lib.inpile.filter(name=>get.type(name)==="basic").flatMap(name=>name==="sha"
    ? [[name],[name,"fire"],[name,"thunder"]] : [[name]]),["wuxie"]]
    .filter(([name,nature])=>event.filterCard({name,nature,isCard:true},player,event));
  },
  chooseButton:{
   dialog(event,player){return ui.create.dialog("真魔紫炎",[lib.skill.fan_zhenmoziyan_convert.choices(event,player).map(([name,nature])=>[get.type(name),"",name,nature]),"vcard"]);},
   check(button){return get.useValue({name:button.link[2],nature:button.link[3]});},
   backup(links){return {position:"h",selectCard:1,filterCard:true,viewAs:{name:links[0][2],nature:links[0][3]},check:card=>7-get.value(card)};},
  },
  hiddenCard(player,name){return player.countCards("h")>0&&!player.getStat("skill").fan_zhenmoziyan_convert&&(name==="wuxie"||lib.inpile.includes(name)&&get.type(name)==="basic");},
  ai:{respondSha:true,respondShan:true,respondWuxie:true,save:true,order:4},
 },

};
export const sixSamuraiTranslate={
 fan_liuwuzhijiezhen:"六武之结阵",fan_liuwuzhijiezhen_info:"出牌阶段，对你使用。你随机获得五张【六武众】卡组相关的牌。",
 fan_ziyan:"紫炎",fan_ziyan_info:"每回合限一次，你可以将一张手牌当"+get.poptip("wuxie")+"使用。",
 fan_zhenmoziyan:"真魔紫炎",fan_zhenmoziyan_info:"每回合限一次，你可以将一张手牌当"+get.poptip("wuxie")+"或任意基本牌使用。",
 fan_shinai:"志乃",fan_shinai_info:"你使用一张黑色牌时，从牌堆随机获得一张红色牌。",
 fan_ruisui:"瑞穗",fan_ruisui_info:"你使用一张红色牌时，从牌堆随机获得一张黑色牌。",
 fan_ziyan_convert:"紫炎",fan_zhenmoziyan_convert:"真魔紫炎",fan_shinai_gain:"志乃",fan_ruisui_gain:"瑞穗",
};
