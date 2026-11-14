export const EXTENSION_VERSION = "0.2.1";
const releaseURL = "https://api.github.com/repos/Xixingsiuuz/noname-genshin/releases/latest";
const projectURL = "https://github.com/Xixingsiuuz/noname-genshin/releases";

export function compareVersions(a, b) {
  const parse = value => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  const left = parse(a), right = parse(b);
  if (!left || !right) throw new Error("无法识别发布版本号");
  for (let i = 1; i <= 3; i++) {
    const difference = Number(left[i]) - Number(right[i]);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function showRelease(release) {
  const overlay = document.createElement("div");
  // Mount outside the game body so its transform cannot scale the overlay.
  overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:#0009;display:flex;align-items:center;justify-content:center;pointer-events:auto";
  const panel = document.createElement("div");
  panel.style.cssText = "position:relative;box-sizing:border-box;width:min(520px,94%);max-height:90%;display:flex;flex-direction:column;overflow:hidden;background:#252525;color:white;padding:16px;border-radius:12px;user-select:text";
  const title = document.createElement("h3");
  title.textContent = `原神扩展有新版本：${release.tag_name}`;
  const notes = document.createElement("div");
  notes.style.cssText = "position:relative;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;margin:12px 0";
  notes.textContent = (release.body || "暂无更新说明。").slice(0, 12000);
  const link = document.createElement("a");
  link.textContent = "前往 GitHub 下载";
  link.href = `${projectURL}/latest`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const close = document.createElement("a");
  close.href = "#";
  close.setAttribute("role", "button");
  close.textContent = "关闭";
  for (const action of [link, close]) {
    action.classList.add("control");
    action.style.cssText = "appearance:none;position:relative;opacity:1;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:32px;border:0;padding:4px 12px;color:inherit;font:inherit;font-size:20px;text-decoration:none;cursor:pointer";
  }
  const dismiss = () => {
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
  };
  const onKeyDown = event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    dismiss();
  };
  close.onclick = event => {
    event.preventDefault();
    dismiss();
  };
  close.onkeydown = event => {
    if (event.key === " ") {
      event.preventDefault();
      dismiss();
    }
  };
  overlay.onclick = event => {
    if (event.target === overlay) dismiss();
  };
  const actions = document.createElement("div");
  actions.style.cssText = "position:relative;flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px";
  actions.append(link, close);
  panel.append(title, notes, actions);
  overlay.append(panel);
  document.documentElement.append(overlay);
  document.addEventListener("keydown", onKeyDown, true);
}

export function createUpdateChecker(game, dependencies = {}) {
  const request = dependencies.fetch || globalThis.fetch.bind(globalThis);
  const notify = dependencies.notify || (message => globalThis.alert(message));
  const display = dependencies.display || showRelease;
  let busy = false, started = false;
  async function check(manual = false) {
    if (busy) { if (manual) notify("正在检查更新，请稍候。"); return; }
    busy = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await request(releaseURL, {
        signal: controller.signal, cache: "no-store",
        headers: { Accept: "application/vnd.github+json" },
      });
      if (response.status === 404) { if (manual) notify("尚无可用的正式发布版本。"); return; }
      if (!response.ok) throw new Error(`GitHub 请求失败（${response.status}）`);
      const release = await response.json();
      if (release.draft || release.prerelease) throw new Error("未找到正式发布版本");
      if (compareVersions(release.tag_name, EXTENSION_VERSION) <= 0) {
        if (manual) notify(`当前版本 ${EXTENSION_VERSION} 已是最新版本。`);
        return;
      }
      if (!manual && (game.getExtensionConfig("原神", "auto_check_update") === false ||
        game.getExtensionConfig("原神", "update_notified_version") === release.tag_name)) return;
      display(release);
      game.saveExtensionConfig("原神", "update_notified_version", release.tag_name);
    } catch (error) {
      if (manual) notify(`检查更新失败：${error.name === "AbortError" ? "连接超时" : error.message}。请稍后重试。`);
    } finally {
      clearTimeout(timer);
      busy = false;
    }
  }
  return {
    check,
    start() {
      if (started) return;
      started = true;
      if (game.getExtensionConfig("原神", "auto_check_update") !== false) {
        setTimeout(() => {
          if (game.getExtensionConfig("原神", "auto_check_update") !== false) void check();
        }, 3000);
      }
    },
  };
}
