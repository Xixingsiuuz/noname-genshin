import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const clean=s=>s.replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'');
const path='../../../noname/library/element/GameEvent/compilers/';
const lib={skill:{}},game={},get={},ui={},status={},played=[];
const Base=new Function('game','_status',clean(read(path+'ContentCompilerBase.js'))+'\nreturn ContentCompilerBase;')(game,status);
const ArrayCompiler=new Function('ContentCompilerBase',clean(read(path+'ArrayCompiler.js'))+'\nreturn ArrayCompiler;')(Base);
const array=new ArrayCompiler();
const compiler={compile:content=>array.compile(content)};
const AsyncFunction=(async()=>{}).constructor,GeneratorFunction=(function*(){}).constructor,AsyncGeneratorFunction=(async function*(){}).constructor;
const AsyncCompiler=new Function('AsyncFunction','compiler','ContentCompilerBase',clean(read(path+'AsyncCompiler.js'))+'\nreturn AsyncCompiler;')(AsyncFunction,compiler,Base);
// The security adapter selects the standard isolated Function constructor here;
// StepParser and compiler execution below are the unchanged local method bodies.
const security={getIsolatedsFrom:()=>[null,null,Function],isSandboxRequired:()=>false};
const StepCompiler=new Function('AsyncFunction','GeneratorFunction','AsyncGeneratorFunction','ContentCompilerBase','compiler','security','ErrorManager','CodeSnippet','ui','lib','get','game','ai','_status',
 clean(read(path+'StepCompiler.js'))+'\nreturn StepCompiler;')(AsyncFunction,GeneratorFunction,AsyncGeneratorFunction,Base,compiler,security,{setCodeSnippet(){}},class {},ui,lib,get,game,{},status);
const step=new StepCompiler(),asyncCompiler=new AsyncCompiler();
function event(player){let current=0,pending=null;return {player,name:'pre_fan_miyan_backup',finished:false,
 get step(){return current;},set step(n){pending=n;},updateStep(){if(pending!==null){current=pending;pending=null;}},
 finish(){this.finished=true;},getDefaultHandlerType(){return 'onNext';},callHandler(){},clearStepCache(){},async waitNext(){},
};}
const player={isDead:()=>false,isOut:()=>false,logSkill(...args){assert.equal(args[0],'fan_miyan');assert.deepEqual(args[4],[]);played.push('log');}};
// Reproduce the reported failure: legacy sync callback loses a module closure.
const legacy=(()=>{const speak=()=>played.push('legacy');return {precontent(event,trigger,player){player.logSkill('fan_miyan',null,null,null,[]);speak('fan_miyan_use',player);}}.precontent;})();
assert(step.filter(legacy));await assert.rejects(()=>step.compile(legacy)(event(player)),/speak is not defined/);played.length=0;
Array.prototype.randomGet=function(){return this[0];};
game.trySkillAudio=(id,speaker)=>{assert.equal(speaker,player);played.push(id);};
const skills=new Function('lib','game','get','ui','_status',read('../character/skills/citlali.js').replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function').replace('export default','return'))(lib,game,get,ui,status);
const pre=skills.fan_miyan.subSkill.backup.precontent;
assert(asyncCompiler.filter(pre));assert(!step.filter(pre));
await asyncCompiler.compile(pre)(event(player));assert.deepEqual(played,['log','fan_miyan_use1']);
await asyncCompiler.compile(pre)(event(player));assert.deepEqual(played,['log','fan_miyan_use1','log','fan_miyan_use1']);
// Audit all event content callbacks here: no other synchronous module closure.
for(const [id,info] of Object.entries(skills))for(const child of [info,...Object.values(info.subSkill||{})]){
 for(const key of ['content','precontent'])if(typeof child[key]==='function')assert(asyncCompiler.filter(child[key]),id+'.'+key);
}
// Execute Card.addGaintag itself, so the visible caption uses actual translation.
const translations=new Function('get',read('../character/translate.js').replace(/^import .*;\r?\n/gm,'').replace('export const','const').replace('export function','function')+'\nreturn createSkillTranslate();')({poptip:id=>id});
const add=read('../../../noname/library/element/card.js').match(/  addGaintag\(gaintag\) \{([\s\S]*?)\n  \}/);
const addGaintag=new Function('get','return function(gaintag){'+add[1]+'}')( {translation:id=>translations[id]||id} );
const card={gaintag:[],node:{gaintag:{innerHTML:''}}};addGaintag.call(card,['fan_yingxin_hand']);
assert.equal(card.node.gaintag.innerHTML,'映心');assert.deepEqual(card.gaintag,['fan_yingxin_hand']);
assert(!card.node.gaintag.innerHTML.includes('fan_'));
console.log('PASS Citlali runtime: reproduced StepCompiler closure failure; fixed callback executes via local AsyncCompiler/ArrayCompiler twice; event callback audit; native Card.addGaintag displays 映心 while preserving internal tag. Compiler/node simulation, no live UI.');
