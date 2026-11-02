from pathlib import Path
import re, html, json, urllib.request, hashlib
import subprocess
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'audio/flins'
PAGE = 'https://wiki.biligame.com/ys/菲林斯语音'
source = (BASE / 'originals/voice-page.html').read_text(encoding='utf8')
if __name__ == '__main__':
    pools = {
      'fan_zhangdeng': ['元素战技·其一','元素战技·其二','元素战技·其三'],
      'fan_zhangdeng_use_voice': ['元素爆发·其一','元素爆发·其二'],
      'fan_moke': ['元素爆发·其三','元素爆发·其四','元素爆发·其五','元素爆发·其六'],
      'fan_flins': ['倒下·其一','倒下·其二','倒下·其三'],
    }
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
        out=BASE/('die' if pool=='fan_flins' else 'skill')/(ident+'.mp3')
        out.parent.mkdir(exist_ok=True)
        out.write_bytes(data)
        clips.append(dict(id=ident,label=label,text=text,url=url,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=None))
        print(ident,label,flush=True)
    (BASE/'originals/sources.json').write_text(json.dumps(dict(page=PAGE,clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
    p=ROOT/'audio/catalog.json'
    catalog=[x for x in json.loads(p.read_text(encoding='utf8')) if x.get('role')!='flins']
    catalog.extend(dict(role='flins',path=x['output'],bytes=x['bytes'],sha256=x['sha256']) for x in clips)
    p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
