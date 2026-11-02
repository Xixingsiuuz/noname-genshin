"""Download the requested Chinese originals without trimming or changing speed."""
from pathlib import Path
import hashlib,html,json,re,urllib.request,urllib.parse
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'audio/wriothesley';directory=base/'originals'
directory.mkdir(parents=True,exist_ok=True)
page='https://wiki.biligame.com/ys/'+urllib.parse.quote('莱欧斯利语音')
(directory/'voice-page.html').write_bytes(urllib.request.urlopen(urllib.request.Request(page,headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read())
source=(directory/'voice-page.html').read_text(encoding='utf8')
spec={'fan_dianyu1':'元素战技·其二','fan_dianyu2':'元素战技·其三','fan_dianyu_end_voice1':'元素爆发·其一','fan_dianyu_end_voice2':'元素爆发·其二','fan_dianyu_gain_voice1':'打开宝箱·其一','fan_dianyu_gain_voice2':'打开宝箱·其三',**{f'fan_wriothesley{i}':f'倒下·其{n}' for i,n in enumerate('一二三',1)}}
clips={}
for name,label in spec.items():
 block=source[source.index('>'+label+'<'):];block=block[:7000]
 url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
 text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)[1])).strip()
 original=directory/(name+'.mp3')
 if not original.exists():original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read())
 assert original.stat().st_size>1000
 outname=name.replace('fan_yaoyue','fan_yaoyue_voice')
 out=base/('die' if name.startswith('fan_wriothesley') else 'skill')/(outname+'.mp3');out.parent.mkdir(exist_ok=True);out.write_bytes(original.read_bytes())
 clips[name]=dict(label=label,url=url,text=text,bytes=original.stat().st_size,sha256=hashlib.sha256(original.read_bytes()).hexdigest(),original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=None)
 print(name,original.stat().st_size,flush=True)
(directory/'sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/莱欧斯利语音',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'));catalog=[r for r in catalog if r['role']!='wriothesley'];catalog += [dict(role='wriothesley',path=c['output'],bytes=c['bytes'],sha256=c['sha256']) for c in clips.values()];p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
