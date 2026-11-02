"""Preserve Keqing's original Chinese voice clips and source provenance."""
from pathlib import Path
import hashlib
import html
import re
import urllib.parse
from fetch_yelan_audio import fetch
import json

ROOT = Path(__file__).resolve().parents[1]

def main():
    entries = {
        "fan_kejuan1": "闲聊·机会", "fan_kejuan2": "突破的感受·起",
        "fan_leili1": "元素战技·其二", "fan_leili2": "元素战技·其三",
        "fan_yuheng1": "闲聊·放松", "fan_yuheng2": "闲聊·耽误", "fan_keqing": "倒下·其三",
    }
    for folder in ["skill", "die", "originals"]:
        (ROOT / "audio/keqing" / folder).mkdir(parents=True, exist_ok=True)
    page = "https://wiki.biligame.com/ys/刻晴语音"
    source = fetch("https://wiki.biligame.com/ys/" + urllib.parse.quote("刻晴语音")).decode("utf8")
    (ROOT / "audio/keqing/originals/keqing-voice-page.html").write_text(source, encoding="utf8")
    manifest = {"page": page, "language": "zh-CN", "verified_date": "2026-10-25", "clips": {}}
    for name, label in entries.items():
        start = source.index(">" + label + "<")
        section = html.unescape(source[start:start + 2300])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.(?:mp3|ogg))"', section).group(1)
        data = fetch(url)
        assert len(data) > 1000 and not data.lstrip().startswith(b"<"), name
        original = "audio/keqing/originals/" + name + Path(url).suffix
        output = "audio/keqing/" + ("die" if name == "fan_keqing" else "skill") + "/" + name + ".mp3"
        (ROOT / original).write_bytes(data)
        (ROOT / output).write_bytes(data)
        manifest["clips"][name] = {"label": label, "url": url, "bytes": len(data), "original": original,
                                    "output": output, "output_bytes": len(data), "trim_seconds": None,
                                    "container": "ogg" if data.startswith(b"OggS") else "mp3"}
        print(name, label, len(data))
    (ROOT / "audio/keqing/originals/keqing-sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf8")
    catalog_path = ROOT / "audio/catalog.json"
    catalog = [item for item in json.loads(catalog_path.read_text(encoding="utf8")) if item["role"] != "keqing"]
    for path in sorted((ROOT / "audio/keqing").rglob("*")):
        if path.suffix not in (".mp3", ".ogg"):
            continue
        data = path.read_bytes()
        catalog.append({"role": "keqing", "path": path.relative_to(ROOT).as_posix(),
                        "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf8")

if __name__ == "__main__":
    main()
