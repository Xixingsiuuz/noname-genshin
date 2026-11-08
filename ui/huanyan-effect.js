// 独立函数可由 broadcastAll 序列化；每个来源单独计数，避免多名芙宁娜相互清除。
export function setHuanyanEffect(target, source, active) {
  if (typeof document === "undefined" || !target?.node) return;
  const host = target.node.avatar || target;
  const owners = host.fanHuanyanOwners || (host.fanHuanyanOwners = new Set());
  if (active) owners.add(source); else owners.delete(source);
  const previous = host.querySelector(".fan-huanyan-effect");
  if (!owners.size) { previous?.remove(); delete host.fanHuanyanOwners; return; }
  if (previous) return;
  if (!document.getElementById("fan-huanyan-style")) {
    const style = document.createElement("style");
    style.id = "fan-huanyan-style";
    style.textContent = `
      .fan-huanyan-effect{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;pointer-events:none!important;overflow:hidden;border-radius:inherit;z-index:3}
      .fan-huanyan-effect *{pointer-events:none!important}
      .fan-huanyan-wave{transform-origin:100px 242px;animation:fan-huanyan-wave 3.6s ease-in-out infinite}
      .fan-huanyan-light{animation:fan-huanyan-light 4s ease-in-out infinite alternate}
      .fan-huanyan-bubble{animation:fan-huanyan-rise 5s linear infinite}
      .fan-huanyan-star{animation:fan-huanyan-light 2.4s ease-in-out infinite alternate}
      @keyframes fan-huanyan-wave{0%,100%{transform:scale(.92);opacity:.45}50%{transform:scale(1.06);opacity:.6}}
      @keyframes fan-huanyan-light{from{opacity:.18}to{opacity:.38}}
      @keyframes fan-huanyan-rise{0%{transform:translateY(25px);opacity:0}20%{opacity:.8}80%{opacity:.6}100%{transform:translateY(-155px);opacity:0}}
      @media(prefers-reduced-motion:reduce){.fan-huanyan-effect *{animation:none!important}}
    `;
    document.head.appendChild(style);
  }
  const ns = "http://www.w3.org/2000/svg";
  const make = (tag, attrs, parent) => {
    const node = document.createElementNS(ns, tag);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    if (parent) parent.appendChild(node);
    return node;
  };
  const id = `fan-huanyan-${document.fanHuanyanSequence = (document.fanHuanyanSequence || 0) + 1}`;
  const svg = make("svg", {class:"fan-huanyan-effect",viewBox:"0 0 200 280",preserveAspectRatio:"none","aria-hidden":"true"});
  const defs = make("defs",{},svg);
  const gradient = make("linearGradient",{id,x1:0,y1:0,x2:0,y2:1},defs);
  for (const [offset,opacity] of [[0,.02],[.6,.08],[1,.5]]) make("stop",{offset,"stop-color":"#49baff","stop-opacity":opacity},gradient);
  make("rect",{width:200,height:280,fill:`url(#${id})`},svg);
  // 两侧聚光避开面部；舞台水环与底部沙龙观众剪影。
  for (const mirror of [false,true]) {
    const group = make("g",{transform:mirror?"translate(200 0) scale(-1 1)":""},svg);
    make("path",{class:"fan-huanyan-light",d:"M8 0 L30 0 L66 264 L0 264 Z",fill:"#a7edff"},group);
    make("path",{d:"M5 44 Q17 12 42 8 M8 68 Q25 25 54 20",fill:"none",stroke:"#b7eeff","stroke-width":1,opacity:.65},group);
  }
  for (const [ry,delay] of [[15,0],[23,-1.8]]) make("ellipse",{class:"fan-huanyan-wave",cx:100,cy:242,rx:92,ry,fill:"none",stroke:"#9deaff","stroke-width":1.8,style:`animation-delay:${delay}s`},svg);
  for(let i=0;i<9;i++) {
    const x=12+(i*37)%178;
    make("circle",{class:"fan-huanyan-bubble",cx:x,cy:265,r:2+i%4,fill:"#b6efff","fill-opacity":.12,stroke:"#cbf5ff","stroke-width":.8,style:`animation-delay:${-i*.63}s;animation-duration:${4+i%3}s`},svg);
  }
  for (const x of [23,62,138,177]) make("path",{class:"fan-huanyan-star",d:`M${x} 214 l2 6 5 2 -5 2 -2 6 -2 -6 -5 -2 5 -2 Z`,fill:"#e5faff",style:`animation-delay:${-x/40}s`},svg);
  make("path",{d:"M0 280V268Q8 251 16 268Q23 255 31 270Q40 247 49 269Q58 257 66 271Q76 252 85 271Q100 245 115 271Q124 252 134 271Q142 257 151 269Q160 247 169 270Q177 255 184 268Q192 251 200 268V280Z",fill:"#153c8e",opacity:.75},svg);
  host.appendChild(svg);
}

// 回放只恢复展示，不重新执行技能或播放技能语音。
export function installHuanyanReplay(game) {
  game.videoContent.fanHuanyanEffect = (target, content) => {
    const source = game.playerMap[content[0]];
    if (target && source) setHuanyanEffect(target, source, content[1]);
  };
}
