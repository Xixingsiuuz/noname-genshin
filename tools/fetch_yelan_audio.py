"""Download Yelan's Chinese originals, preserving source bytes and provenance."""
from pathlib import Path
import html
import json
import re
import urllib.request
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
PAGE = "https://wiki.biligame.com/ys/夜兰语音"
ENTRIES = {
    "fan_kuanghuo1": "元素爆发·其二",
    "fan_kuanghuo2": "元素爆发·其三",
    "fan_yuantu1": "元素战技·其二",
    "fan_yuantu2": "元素爆发·其一",
    "fan_yelan": "倒下·其一",
}

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0", "Referer": "https://wiki.biligame.com/",
    }), timeout=40).read()

def main():
    source = fetch("https://wiki.biligame.com/ys/" + urllib.parse.quote("夜兰语音")).decode("utf8")
    (ROOT / "audio/yelan/originals/yelan-voice-page.html").write_text(source, encoding="utf8")
    manifest = {"page": PAGE, "language": "zh-CN", "verified_date": "2026-10-25", "clips": {}}
    for name, label in ENTRIES.items():
        start = source.index(">" + label + "<")
        section = html.unescape(source[start:start + 2300])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
        data = fetch(url)
        assert len(data) > 1000 and not data.lstrip().startswith(b"<"), name
        original = "audio/yelan/originals/" + name + ".mp3"
        output = "audio/yelan/" + ("die" if name == "fan_yelan" else "skill") + "/" + name + ".mp3"
        (ROOT / original).write_bytes(data)
        (ROOT / output).write_bytes(data)
        manifest["clips"][name] = {"label": label, "url": url, "bytes": len(data),
            "original": original, "output": output, "output_bytes": len(data), "trim_seconds": None}
        print(name, label, len(data))
    (ROOT / "audio/yelan/originals/yelan-sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf8")

if __name__ == "__main__":
    main()
