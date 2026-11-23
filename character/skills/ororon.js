import { installSelectionCount } from "../../ui/selection-count.js";
import { game, ui, get, _status, lib } from "../../../../noname.js";

export function automaticAssignment(cards, player, targets) {
  const map = new Map();
  targets = targets.filter(target => target.isIn());
  if (!targets.length) return map;
  for (const card of cards) {
    const target = targets.slice().sort((a,b) => score(b)-score(a))[0];
    function score(t) { return get.attitude(player,t)*get.value(card,t)/(1+t.countCards("h")+(map.get(t)?.length||0)); }
    if (!map.has(target)) map.set(target, []);
    map.get(target).push(card);
  }
  return map;
}

// Executed by native chooseControl on the choosing client, including remote clients.
// Keep this callback self-contained: GameEvent.send serializes it without closures.
function setupCangmiAssignment(dialog) {
  const event = _status.event;
  const cards = event.fanCangmiCards, targets = event.fanCangmiTargets;
  const owners = new Map(), selected = new Set(), cleanups = [];
  let settled = false;
  for (const node of dialog.content.querySelectorAll(".pointerdiv")) node.remove();
  dialog.add([cards, "card"]);
  // Native dialog width and left offset are paired by the active layout CSS.
  // Keep native sizing, positioning and content-container scrolling together.
  const cleanup = () => {
    settled = true;
    for (const remove of cleanups.splice(0)) remove();
    if (event.switchToAuto === automatic) delete event.switchToAuto;
  };
  const close = dialog.close;
  dialog.close = function (...args) { cleanup(); return close.apply(this, args); };
  const valid = () => cards.every(card => owners.get(card)?.isIn());
  const refresh = () => {
    const button = event.controlbar.firstChild;
    const ready = valid();
    button.classList.toggle("disabled", !ready);
    button.style.opacity = ready ? "" : ".4";
    button.style.pointerEvents = ready ? "" : "none";
    button.setAttribute("aria-disabled", String(!ready));
  };
  const finish = auto => {
    if (settled || _status.event !== event) return;
    if (!auto && !valid()) return;
    const map = new Map();
    for (const card of cards) {
      const target = owners.get(card);
      if (target?.isIn()) {
        if (!map.has(target)) map.set(target, []);
        map.get(target).push(card);
      }
    }
    if (auto) for (const card of cards.filter(card => !owners.get(card)?.isIn())) {
      const available = targets.filter(target => target.isIn());
      const score = target => get.attitude(event.player, target) * get.value(card, target)
        / (1 + target.countCards("h") + (map.get(target)?.length || 0));
      const target = available.sort((a, b) => score(b) - score(a))[0];
      if (!target) continue;
      if (!map.has(target)) map.set(target, []);
      map.get(target).push(card);
    }
    event.result = { control: "确定", fanCangmiAssignments: [...map] };
    cleanup();
    _status.imchoosing = false;
    game.resume();
  };
  const automatic = () => finish(true);
  event.switchToAuto = automatic;
  event.controlbar = ui.create.control("确定", () => finish(false));
  for (const button of dialog.buttons) {
    const click = e => {
      if (settled || _status.event !== event) return;
      e.stopImmediatePropagation();
      if (selected.has(button.link)) selected.delete(button.link); else selected.add(button.link);
      button.classList.toggle("selected", selected.has(button.link));
    };
    button.addEventListener("click", click, true);
    cleanups.push(() => button.removeEventListener("click", click, true));
  }
  for (const target of targets) {
    const click = e => {
      if (settled || _status.event !== event || !selected.size || !target.isIn()) return;
      e.stopImmediatePropagation(); e.preventDefault();
      for (const card of selected) {
        owners.set(card, target);
        const button = dialog.buttons.find(button => button.link === card);
        button.querySelector(".fan-ororon-owner")?.remove();
        const badge = document.createElement("div");
        badge.className = "fan-ororon-owner";
        badge.style.cssText = "position:absolute;right:0;bottom:0;width:30px;height:30px;border:2px solid gold;border-radius:50%;background-size:cover;pointer-events:none";
        badge.style.backgroundImage = target.node.avatar.style.backgroundImage;
        badge.title = get.translation(target);
        button.appendChild(badge); button.classList.remove("selected");
      }
      selected.clear(); refresh();
    };
    target.addEventListener("click", click, true);
    cleanups.push(() => target.removeEventListener("click", click, true));
  }
  refresh();
}

// Native chooseControl owns remote dispatch, pause/countChoose and final cleanup.
async function assign(cards, player) {
  const targets = game.filterPlayer(current => current.isIn());
  if (!cards.length || !targets.length) return new Map();
  const choice = await player.chooseControl("确定")
    .set("prompt", "藏蜜：将“蜜”分配给任意名角色")
    .set("dialogcontrol", true)
    .set("fanCangmiCards", cards).set("fanCangmiTargets", targets)
    .set("addDialog", [[setupCangmiAssignment, "handle"]])
    .set("ai", () => "确定").forResult();
  const map = new Map(), seen = new Set();
  for (const [target, assigned] of choice.fanCangmiAssignments || []) {
    if (!targets.includes(target) || !target.isIn() || !Array.isArray(assigned)) continue;
    const valid = assigned.filter(card => {
      if (!cards.includes(card) || seen.has(card)) return false;
      seen.add(card); return true;
    });
    if (valid.length) map.set(target, [...(map.get(target) || []), ...valid]);
  }
  for (const [target, remaining] of automaticAssignment(cards.filter(card => !seen.has(card)), player, targets)) {
    map.set(target, [...(map.get(target) || []), ...remaining]);
  }
  return map;
}

// Re-evaluated by native chooseCard after every selection. Pair lookahead keeps
// the first card attractive when the second unlocks Tonggan's single-loss reward.
function cangmiCardScore(card, player) {
  const selected=ui.selected.cards;
  const stock=player.getExpansions("fan_cangmi").length;
  const growth=stock*2+2<=player.hp?2:1;
  const tonggan=player.hasSkill("fan_tonggan") && game.hasPlayer(target=>target.isIn() && target.countCards("he",c=>lib.filter.cardDiscardable(c,target,"fan_tonggan"))>0 && get.effect(target,{name:"guohe"},player,player)>0)?2:0;
  const base=c=>5+growth-get.value(c,player);
  const emergency=c=>player.hp<=2 && get.name(c,player)==="tao" && player.countCards("h",h=>get.name(h,player)==="tao")<=1;
  if(emergency(card))return -10;
  if(selected.length)return base(card)+tonggan;
  const partners=player.getCards("he").filter(c=>c!==card&&!emergency(c));
  const partner=partners.reduce((best,c)=>Math.max(best,base(c)+tonggan),-Infinity);
  return base(card)+(partner>0?tonggan:0);
}

export default {
  fan_cangmi: {
    audio:false, locked:false, direct:true, trigger:{player:"phaseZhunbeiBegin"},
    marktext:"蜜", intro:{content:"expansion",markcount:"expansion"}, onremove(player){ const cards=player.getExpansions("fan_cangmi"); if(cards.length) player.loseToDiscardpile(cards); },
    group:"fan_cangmi_distribute",
    async content(event,trigger,player) {
      installSelectionCount();
      const choice=await player.chooseCard("he",[0,2],"你可以发动【藏蜜】：将至多两张牌置于武将牌上。")
        .set("prompt2",false).set("manualConfirm",true).set("fanPairedConfirm",true).set("fanSelectionCount",true)
        .set("ai",card=>cangmiCardScore(card,player)).forResult();
      if(!choice.bool) return;
      const chosen=(choice.cards||[]).filter(card=>player.getCards("he").includes(card));
      const top=get.cards(player.getExpansions("fan_cangmi").length);
      if(!chosen.length&&!top.length) return;
      player.logSkill("fan_cangmi");
      const next=player.addToExpansion([...top,...chosen],"giveAuto"); next.gaintag.add("fan_cangmi"); await next;
    },
    subSkill:{distribute:{
      audio:false,locked:false,forced:true,trigger:{player:"phaseJieshuBegin"},
      filter(event,player){return player.getExpansions("fan_cangmi").length>player.hp;},
      async content(event,trigger,player){
        const cards=player.getExpansions("fan_cangmi").slice();
        const map=await assign(cards,player);
        const targets=[...map.keys()].sortBySeat(_status.currentPhase||player);
        const list=targets.filter(t=>t.isIn()).map(t=>[t,map.get(t).filter(c=>player.getExpansions("fan_cangmi").includes(c))]).filter(pair=>pair[1].length);
        if(!list.length)return;
        player.line(list.map(pair=>pair[0]),"green");
        await game.loseAsync({gain_list:list,player,cards:list.flatMap(pair=>pair[1]),giver:player,animate:"giveAuto"}).setContent("gaincardMultiple");
      }
    }}
  },
  fan_tonggan:{
    audio:false,locked:false,direct:true,
    trigger:{global:["gainAfter","loseAfter","loseAsyncAfter","equipAfter","addJudgeAfter","addToExpansionAfter"]},
    filter(event,player){if(event.getlx===false || event.getParent?.()?.name==="loseAsync")return false; return (event.getg?.(player)?.length||0)>=2||(event.getl?.(player)?.cards2?.length||0)>=2;},
    async content(event,trigger,player){
      // Resolve the two directions independently; the player only chooses a target.
      const effects=[];
      if((trigger.getg?.(player)?.length||0)>=2)effects.push("draw");
      if((trigger.getl?.(player)?.cards2?.length||0)>=2)effects.push("discard");
      const canDiscard=target=>target.countCards("he",card=>lib.filter.cardDiscardable(card,target,"fan_tonggan"))>0;
      for(const effect of effects){
        if(!player.isIn())break;
        const draw=effect==="draw";
        const result=await player.chooseTarget(draw?"你可以发动【通感】，令一名角色摸一张牌":"你可以发动【通感】，令一名角色弃置一张牌",
          (card,owner,target)=>target.isIn()&&(draw||canDiscard(target)))
          .set("prompt2",false)
          .set("ai",target=>draw?get.effect(target,{name:"draw"},player,player):get.effect(target,{name:"guohe"},target,player))
          .forResult();
        const target=result.targets?.[0];
        if(!result.bool||!target?.isIn()||(!draw&&!canDiscard(target)))continue;
        player.logSkill("fan_tonggan",target);
        if(draw)await target.draw();
        else await target.chooseToDiscard("he",true,1,card=>lib.filter.cardDiscardable(card,target,"fan_tonggan"));
      }
    }
  }
};
