from pathlib import Path
import re, html, json, urllib.request, hashlib
import subprocess
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'audio/nahida'
PAGE = 'https://wiki.biligame.com/ys/纳西妲语音'
source = (BASE / 'originals/voice-page.html').read_text(encoding='utf8')
if __name__ == '__main__':
    pools = {
      'fan_huaqiu_start_voice': ['加入队伍·其一','加入队伍·其二'],
      'fan_huaqiu_guard_voice': ['闲聊·邀请','闲聊·心事'],
      'fan_huaqiu_end_voice': ['闲聊·感受'],
      'fan_wenshou_select_voice': ['元素战技·其一','元素战技·其五'],
      'fan_wenshou_bless_voice': ['突破的感受·起','元素战技·其六'],
      'fan_wenshou_punish_voice': ['元素战技·其三','打开宝箱·其一'],
      'fan_wenshou_gain_voice': ['打开宝箱·其二','打开宝箱·其三'],
      'fan_huanjing_voice': ['元素爆发·其一','元素爆发·其三','元素爆发·其二'],
      'fan_nahida': ['倒下·其一','倒下·其二','倒下·其三'],
    }
    # Recycle old playback encodes; preserve every original source.
    for old in [*BASE.glob('skill/*.mp3'), *BASE.glob('die/*.mp3')]:
        resolved=old.resolve()
        assert resolved.is_relative_to(BASE.resolve())
        literal=str(resolved).replace("'", "''")
        subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command',
          "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('"+literal+"','OnlyErrorDialogs','SendToRecycleBin')"],check=True)
    clips = []
    for pool, labels in pools.items():
      for i,label in enumerate(labels,1):
        block = source[source.index('>'+label+'<'):][:6000]
        url = html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
        text = html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)[1])).strip()
        ident = pool+str(i)
        original = BASE/'originals'/(ident+'-'+hashlib.sha256(url.encode()).hexdigest()[:10]+'.mp3')
        if not original.exists():
          original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})).read())
        data=original.read_bytes()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        out=BASE/('die' if pool=='fan_nahida' else 'skill')/(ident+'.mp3')
        out.parent.mkdir(exist_ok=True)
        out.write_bytes(data)
        clips.append(dict(id=ident,label=label,text=text,url=url,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=None))
        print(ident,label,flush=True)
    (BASE/'originals/sources.json').write_text(json.dumps(dict(page=PAGE,clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
    p=ROOT/'audio/catalog.json'
    catalog=[x for x in json.loads(p.read_text(encoding='utf8')) if x.get('role')!='nahida']
    catalog.extend(dict(role='nahida',path=x['output'],bytes=x['bytes'],sha256=x['sha256']) for x in clips)
    p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
