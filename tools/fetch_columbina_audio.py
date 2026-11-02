"""Download original Chinese voice clips; preserve bytes and provenance."""
from pathlib import Path
import html
import json
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PAGE = "https://wiki.biligame.com/ys/哥伦比娅语音"
ENTRIES = {
    "fan_xiangchou1": "突破的感受·起",
    "fan_xiangchou2": "突破的感受·承",
    "fan_xiangchou3": "突破的感受·转",
    "fan_sulv1": "元素爆发·其二",
    "fan_sulv2": "元素爆发·其三",
    "fan_xiayin_flip1": "元素战技·其一",
    "fan_xiayin_flip2": "元素战技·其二",
    "fan_xiayin_use1": "打开宝箱·其一",
    "fan_xiayin_use2": "打开宝箱·其二",
    "fan_zhenyue_reveal": "元素战技·其三",
    "fan_columbina": "倒下·其一",
}

def main():
    source = (ROOT / "audio/columbina/originals/columbina-voice-page.html").read_text(encoding="utf8")
    manifest = {"page": PAGE, "language": "zh-CN", "clips": {}}
    for name, label in ENTRIES.items():
        start = source.index(">" + label + "<")
        section = html.unescape(source[start:start + 2300])
        url = re.search(r'data-src="(https://patchwiki\.biligame\.com/[^"<>]+\.mp3)"', section).group(1)
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://wiki.biligame.com/"})
        data = urllib.request.urlopen(request, timeout=30).read()
        assert len(data) > 1000 and not data.lstrip().startswith(b"<"), name
        destination = ROOT / "audio" / "columbina" / ("die" if name == "fan_columbina" else "skill") / (name + ".mp3")
        destination.write_bytes(data)
        manifest["clips"][name] = {"label": label, "url": url, "bytes": len(data)}
        print(name, len(data))
    (ROOT / "audio/columbina/originals/columbina-sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf8")

if __name__ == "__main__":
    main()
