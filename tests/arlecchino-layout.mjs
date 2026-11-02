import { chromium } from 'file:///C:/Users/22697/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 const css=read('../../../layout/default/layout.css');
 for (const scenario of [
  {zoom:1.5,width:1280,extra:''},
  {zoom:1.5,width:900,extra:'.dialog .content {top:80px} #control > div {transform:translateY(-25px)}'},
  {zoom:1,width:1280,extra:read('../../../layout/newlayout/global.css')},
  {zoom:1.5,width:1280,extra:read('../../../layout/newlayout/global.css')+read('../../../layout/long2/layout.css').replace(/@import[^;]+;/g,'')},
 ]) {
 await page.setContent(`<style>${css}${scenario.extra}</style><div id="arena" style="left:0;top:0;width:${scenario.width}px;height:720px;transform:scale(${scenario.zoom});transform-origin:top left"><div id="control" style="top:500px;bottom:auto;height:40px"><div style="height:40px">于此升起 于此坠落 取消</div></div></div>`);
 const source=read('../character/skills/arlecchino.js').replace(/^import .*;\r?\n/,'').replace('export default','return');
 const nativeDialog=read('../../../noname/library/element/dialog.js').replace(/^import .*;\r?\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'')+'\nreturn Dialog;';
 const result=await page.evaluate(async ({source,nativeDialog})=>{
  const ui={arena:document.querySelector('#arena'),control:document.querySelector('#control'),updates:[]};
  const skills=new Function('ui','game','get','_status',source)(ui,{},{},{});
  let config;
  const chooser={set(key,value){if(key==='dialog')config=value;return this;},async forResult(){return {control:'cancel2'};}};
  await skills.fan_ruyue.content({}, {}, {chooseControl:()=>chooser});
  Array.prototype.remove=function(item){const i=this.indexOf(item);if(i>=0)this.splice(i,1);return this;};
  HTMLElement.prototype.delete=function(){this.remove();};
  HTMLElement.prototype.show=function(){this.classList.remove('hidden');};
  HTMLElement.prototype.refocus=function(){this.classList.remove('unfocused');};
  ui.dialogs=[];ui.click={};ui.refresh=()=>{};
  ui.update=()=>ui.updates.forEach(fn=>fn());
  ui.create={div(selector,parent){const node=document.createElement('div');node.className=selector.replace(/^\./,'').split('.').join(' ');parent?.append(node);return node;},caption(text,parent){const node=this.div('.caption',parent);node.innerHTML=text;return node;}};
  const lib={config:{},element:{}};
  const get={objtype:node=>node instanceof HTMLDivElement?'div':null,itemtype:()=>null,mode:()=> 'identity'};
  const Dialog=new Function('ui','lib','game','get',nativeDialog)(ui,lib,{},get);
  lib.element.Dialog=Dialog;
  const dialog=new Dialog(...config);dialog.open();dialog.open();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const rect=dialog.getBoundingClientRect(), content=dialog.content.getBoundingClientRect(),button=ui.control.firstElementChild.getBoundingClientRect();
  const lines=[...dialog.content.querySelectorAll('.caption')].map(node=>({top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom}));
  const result={top:rect.top,bottom:rect.bottom,contentBottom:content.bottom,buttonTop:button.top,lines,scrollHeight:dialog.content.scrollHeight};
  dialog.close();return result;
 },{source,nativeDialog});
 console.log(JSON.stringify(result));
 assert.ok(result.contentBottom<=result.buttonTop-20,'整块说明必须位于按钮上方');
 assert.ok(result.top < result.buttonTop * 0.7,'说明须位于牌桌中央而非贴近底部控件');
 for (const line of result.lines) assert.ok(line.bottom<=result.buttonTop-20,'每段文字必须完整位于按钮上方');
 }
} finally {await browser.close();}

