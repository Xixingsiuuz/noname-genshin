"""Download the requested Chinese originals without trimming or changing speed."""
from pathlib import Path
import hashlib,html,json,re,urllib.request
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'audio/sandrone';directory=base/'originals'
source=(directory/'voice-page.html').read_text(encoding='utf8')
spec={**{f'fan_xigou_{key}':f'突破的感受·{label}' for key,label in zip(['number','suit','type','view'],'起承转合')},**{f'fan_wanli_choice{i}':f'加入队伍·其{n}' for i,n in enumerate('一二三',1)},**{f'fan_wanli_beishui{i}':f'元素爆发·其{n}' for i,n in enumerate('一二三',1)},'fan_yaoyue1':'闲聊·茶会','fan_yaoyue2':'闲聊·钢琴',**{f'fan_sandrone{i}':f'倒下·其{n}' for i,n in enumerate('一二三',1)}}
clips={}
for name,label in spec.items():
 block=source[source.index('>'+label+'<'):];block=block[:7000]
 url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
 text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)[1])).strip()
 original=directory/(name+'.mp3')
 if not original.exists():original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read())
 assert original.stat().st_size>1000
 outname=name.replace('fan_yaoyue','fan_yaoyue_voice')
 out=base/('die' if name.startswith('fan_sandrone') else 'skill')/(outname+'.mp3');out.parent.mkdir(exist_ok=True);out.write_bytes(original.read_bytes())
 clips[name]=dict(label=label,url=url,text=text,bytes=original.stat().st_size,sha256=hashlib.sha256(original.read_bytes()).hexdigest(),original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=None)
 print(name,original.stat().st_size,flush=True)
(directory/'sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/桑多涅语音',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'));catalog=[r for r in catalog if r['role']!='sandrone'];catalog += [dict(role='sandrone',path=c['output'],bytes=c['bytes'],sha256=c['sha256']) for c in clips.values()];p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
