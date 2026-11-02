// Render the actual avatar overlay implementation without starting a game.
// node tools/preview_zibai.mjs <output.html>
import { readFileSync, writeFileSync } from "node:fs";
const portrait = readFileSync(new URL("../image/character/portraits/zibai.png", import.meta.url)).toString("base64");
const effect = readFileSync(new URL("../ui/zibai-eyes.js", import.meta.url), "utf8").replaceAll("export function", "function");
const modes = [["yun", "兹踞 · 云间"], ["yan", "兹踬 · 岩间"], ["ren", "兹蹻 · 人间"], ["full", "兹白 · 三神合一"]];
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>兹白原画与眼光预览</title>
<style>body{margin:0;padding:24px;background:#171c28;color:#f1e5c9;font:16px system-ui}h1{font-size:22px;margin:0 0 8px}p{color:#acb9c9;margin:0 0 20px}main{display:flex;gap:20px}.panel{width:240px}.avatar{position:relative;width:240px;height:336px;background:url(data:image/png;base64,${portrait}) center top/cover;border-radius:8px;overflow:hidden}main .avatar{cursor:zoom-in}h2{font-size:17px;text-align:center;font-weight:500}
.popup-container{position:fixed;inset:0;background:#0009;z-index:10;display:grid;place-items:center}.menubg.charactercard{position:relative;width:720px;height:430px;background:#202738;border:1px solid #bca777;border-radius:12px}.ava{position:absolute;left:1.67%;top:2.78%;width:34%;height:79%;overflow:hidden}.ava>.avatar{position:absolute;left:5px;top:5px;width:calc(100% - 10px);height:calc(100% - 10px)}.card-copy{margin:35px 25px 0 285px;line-height:1.8}.close{position:absolute;right:15px;bottom:18px}button{background:#3a455c;border:1px solid #8f9bb4;border-radius:5px;color:#fff;padding:6px 12px;cursor:pointer;margin:4px}button:hover{background:#52617e}.eye-zoom{display:block;width:330px;height:150px;overflow:hidden;position:relative;border-radius:8px;margin:24px auto 0}.eye-zoom .avatar{position:absolute;width:800px;height:1120px;left:-260px;top:-278px;cursor:default}
</style>
<h1>兹白 · 动态眼光与多层瞳色</h1><p>点击头像打开大图，或查看下方眼部放大。原画保留，光晕呼吸、眼缘流光与高光闪烁均为独立图层。</p><main>${modes.map(([mode, label]) => `<section class="panel"><div class="avatar" id="${mode}"></div><h2>${label}</h2><div class="eye-zoom" style="width:240px"><div class="avatar" id="zoom-${mode}"></div></div></section>`).join("")}</main>
<script>${effect}
const owners = {};
const game = {players:[],dead:[]};
const ui = {click:{charactercard(name, source, noedit, resume, avatar){
  if(name!=="fan_zibai")return "other";
  const layer=document.createElement("div");layer.className="popup-container";
  layer.innerHTML='<div class="menubg charactercard"><div class="ava"><div class="avatar"></div></div><div class="card-copy"><h2>兹白 · 武将大图</h2><p>与当前角色绑定的同一套眼光与瞳色效果。</p><p>切换下方形态，检查打开的大图同步更新。</p>'+["yun","yan","ren","full"].map((m,i)=>'<button data-switch="'+m+'">'+["云间","岩间","人间","完全体"][i]+'</button>').join("")+'</div><button class="close">关闭</button></div>';
  const owner=avatar?.fanZibaiOwner;
  layer.querySelector(".close").onclick=()=>layer.remove();
  for(const button of layer.querySelectorAll("[data-switch]"))button.onclick=()=>{const mode=button.dataset.switch;owner.storage.fan_zibai_form=mode==="full"?undefined:mode;owner.storage.fan_zibai_complete=mode==="full";setZibaiEyes(owner,mode)};
  document.body.appendChild(layer);return layer;
}}};
installZibaiEyes(ui,game);
for(const mode of ["yun","yan","ren","full"]){
  const avatar=document.getElementById(mode);
  const owner={name:"fan_zibai",node:{avatar},storage:{fan_zibai_form:mode==="full"?undefined:mode,fan_zibai_complete:mode==="full"}};
  owners[mode]=owner;game.players.push(owner);setZibaiEyes(owner,mode);
  setZibaiEyes(owner,mode,document.getElementById("zoom-"+mode));
  avatar.onclick=()=>ui.click.charactercard("fan_zibai",null,null,true,avatar);
}
window.zibaiPreview={owners,ui,game};
</script></html>`;
writeFileSync(process.argv[2], html);
console.log(process.argv[2]);
