import { game, ui, _status } from "../../../noname.js";

// Native chooseCard creates promptbar after its initial check. Update it once
// after that step, and after subsequent checks without moving any native UI.
export function installSelectionCount(){
 if(game.check.fanSelectionCount)return;
 const original=game.check;
 game.check=function(...args){
  const result=original.apply(this,args),event=_status.event;
  const update=()=>{
   if(_status.event!==event||!event?.fanSelectionCount||!event.promptbar)return;
   event.promptbar.textContent=`已选择的牌数：${ui.selected.cards.length}/${event.selectCard[1]}`;
  };
  update();queueMicrotask(update);
  return result;
 };
 game.check.fanSelectionCount=true;
}
