// State-specific native death pools, installed once with the extension UI helpers.
export function installWandererDeathAudio(game, lib, get) {
 if(get.Audio && typeof get.Audio.die==="function" && !get.Audio.die.fanWandererDetails){
  const originalDie=get.Audio.die;
  const die=function(options){
   const result=originalDie.call(this,options);
   const actor=options.player;
   const name=typeof actor==="string"?actor:actor?.name;
   if(name!=="fan_wanderer" || Object.prototype.hasOwnProperty.call(options,"info")) return result;
   const info=Array.from({length:5},(_,i)=>`ext:原神/audio/wanderer/die/${i<3?"fan_wanderer"+(i+1):"fan_wanderer_failure"+(i-2)}.mp3`);
   return originalDie.call(this,{...options,info});
  };
  die.fanWandererDetails=true;get.Audio.die=die;
 }

 if(typeof game.tryDieAudio!=="function") {
  if(lib.skill.fan_wanderer_legacy_death) return;
  lib.skill.fan_wanderer_legacy_death={
   trigger:{global:"dieBegin"},forced:true,charlotte:true,silent:true,popup:false,
   filter(event){return [event.player.name,event.player.name1,event.player.name2].includes("fan_wanderer");},
   async content(event,trigger){
    const failure=trigger.player.storage.fan_genchu_result==="failure";
    const index=1+Math.floor(Math.random()*(failure?2:3));
    const path=`die:ext:原神/audio/wanderer/die/${failure?"fan_wanderer_failure":"fan_wanderer"}${index}`;
    game.broadcastAll(value=>{
     const tags=lib.character.fan_wanderer[4];
     const index=tags.findIndex(tag=>tag.startsWith("die:"));
     if(index>=0) tags[index]=value;else tags.push(value);
    },path);
   },
  };
  game.addGlobalSkill("fan_wanderer_legacy_death");
  return;
 }
 if(game.tryDieAudio.fanWanderer) return;
 const original=game.tryDieAudio;
 const wrapped=function(player){
  if(![player?.name,player?.name1,player?.name2].includes("fan_wanderer")) return original.call(this,player);
  const failed=player.storage.fan_genchu_result==="failure";
  game.broadcastAll((actor,failure)=>{
   if(!lib.config.background_speak) return;
   const prefix=failure?"fan_wanderer_failure":"fan_wanderer";
   const info=Array.from({length:failure?2:3},(_,i)=>`ext:原神/audio/wanderer/die/${prefix}${i+1}.mp3`);
   game.tryAudio({audioList:get.Audio.die({player:actor,info}).fileList});
  },player,failed);
 };
 wrapped.fanWanderer=true;game.tryDieAudio=wrapped;
}
