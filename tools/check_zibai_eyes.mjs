// Verify actual SVG/CSS animation and dialog rendering in headless Edge via CDP.
// node tools/check_zibai_eyes.mjs <preview.html> <output-directory>
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const [html, output] = process.argv.slice(2).map(p => resolve(p));
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(output, "edge-zibai-dynamic-"));
const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless", "--disable-gpu", "--no-first-run", "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
let errors = "", socket, closed = false;
browser.stderr.on("data", chunk => errors += chunk);
browser.on("exit", () => closed = true);
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  let port;
  for (let i = 0; i < 80; i++) {
    if (closed) throw Error(`Headless Edge exited: ${errors.slice(-1800)}`);
    try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); } catch {}
    if (port) break;
    await sleep(150);
  }
  assert(port, "DevTools port not available");
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(p => p.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let serial = 0; const pending = new Map();
  socket.addEventListener("message", message => {
    const value = JSON.parse(message.data), waiter = pending.get(value.id);
    if (waiter) { pending.delete(value.id); clearTimeout(waiter.timeout); value.error ? waiter.reject(Error(JSON.stringify(value.error))) : waiter.resolve(value.result); }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timeout = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const value = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (value.exceptionDetails) throw Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  await call("Emulation.setDeviceMetricsOverride", { width: 1110, height: 760, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: pathToFileURL(html).href });
  for (let i = 0; i < 60 && !await evaluate("!!window.zibaiPreview"); i++) await sleep(100);
  assert(await evaluate("!!window.zibaiPreview"), "Preview did not initialize");
  const checks = await evaluate(`(async()=>{
    await document.fonts.ready;
    const owner=zibaiPreview.owners.yun, avatar=owner.node.avatar;
    const aura=avatar.querySelector('.fan-zibai-aura');
    const pulse=aura.getAnimations()[0];pulse.pause();pulse.currentTime=0;
    const dim=Number(getComputedStyle(aura).opacity);pulse.currentTime=1600;
    const bright=Number(getComputedStyle(aura).opacity);
    const rim=avatar.querySelector('.fan-zibai-rim'), flow=rim.getAnimations()[0];
    flow.pause();flow.currentTime=0;const start=getComputedStyle(rim).strokeDashoffset;
    flow.currentTime=1900;const middle=getComputedStyle(rim).strokeDashoffset;
    const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
    function aligned(node){const svg=node.querySelector('svg'),p=new DOMPoint(216.8,174.2).matrixTransform(svg.getScreenCTM()),r=node.getBoundingClientRect(),s=Math.max(r.width/400,r.height/560);return Math.abs(p.x-(r.left+(r.width-400*s)/2+216.8*s))<.1&&Math.abs(p.y-(r.top+174.2*s))<.1}
    const smallAligned=aligned(avatar);avatar.click();
    const dialog=document.querySelector('.menubg.charactercard'),large=dialog.querySelector('.ava>.avatar');
    const mode=large.dataset.fanZibaiMode,largeAligned=aligned(large);
    owner.storage.fan_zibai_form='yan';setZibaiEyes(owner,'yan');
    const synchronized=large.dataset.fanZibaiMode==='yan'&&avatar.dataset.fanZibaiMode==='yan';
    owner.storage.fan_zibai_form='yun';setZibaiEyes(owner,'yun');
    return {dim,bright,start,middle,uniqueIDs:ids.length===new Set(ids).size,smallAligned,largeAligned,mode,synchronized,pointerEvents:getComputedStyle(large.querySelector('svg')).pointerEvents,animations:document.getAnimations().length};
  })()`);
  assert(checks.bright - checks.dim > .4); assert.notEqual(checks.start, checks.middle);
  assert(checks.uniqueIDs && checks.smallAligned && checks.largeAligned && checks.synchronized);
  assert.equal(checks.mode, "yun"); assert.equal(checks.pointerEvents, "none"); assert(checks.animations > 10);
  const screenshot = async (name, clip) => {
    const image = await call("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}) });
    await writeFile(join(output, name), Buffer.from(image.data, "base64"));
  };
  await screenshot("zibai-dynamic-dialog.png");
  await evaluate("document.querySelector('.close').click()");
  const clip = await evaluate(`(()=>{const r=document.querySelector('.eye-zoom').getBoundingClientRect();return {x:24,y:r.top-48,width:1020,height:198,scale:1}})()`);
  for (let frame = 0; frame < 12; frame++) {
    await evaluate(`document.getAnimations().forEach(a=>{a.pause();a.currentTime=${frame * 267}})`);
    await screenshot(`zibai-eyes-frame-${frame}.png`, clip);
  }
  await screenshot("zibai-dynamic-preview.png");
  await writeFile(join(output, "zibai-eyes-browser-checks.json"), JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(checks));
  await call("Browser.close");
} finally {
  socket?.close();
  if (!closed) browser.kill();
}
