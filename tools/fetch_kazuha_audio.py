"""Fetch requested Chinese originals; retain provenance and reproducible trims."""
from pathlib import Path
import html,json,re,urllib.request,hashlib,subprocess,sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'audio/kazuha'
page=(BASE/'originals/voice-page.html').read_text(encoding='utf-8-sig')
spec={'fan_jilv1':'闲聊·剑技','fan_jilv2':'有什么想要分享·枫叶','fan_zhenxiu1':'关于雷电将军…','fan_zhenxiu2':'关于「神之眼」…',**{f'fan_jilv_give{i}':('打开宝箱' if i==1 else f'打开宝箱·其{n}') for i,n in enumerate('一二三',1)},**{f'fan_huanlei{i}':f'元素爆发·其{n}' for i,n in enumerate('一二三',1)},**{f'fan_kazuha{i}':f'倒下·其{n}' for i,n in enumerate('一二三',1)}}
clips={}
for name,label in spec.items():
 match_label=re.search(r'<div[^>]*>'+re.escape(label)+r'</div>',page)
 start=match_label.start() if match_label else -1
 if start<0: raise ValueError(label)
 block=page[start:start+8000]
 url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
 match=re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)
 text=html.unescape(re.sub('<[^>]+>','',match[1])).strip()
 original=BASE/'originals'/(name+'.mp3')
 if not original.exists() or name == "fan_jilv_give1": original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read())
 assert original.stat().st_size>1000
 out=BASE/('die' if name.startswith('fan_kazuha') else 'skill')/(name+'.mp3');out.parent.mkdir(exist_ok=True)
 out.write_bytes(original.read_bytes())
 clips[name]=dict(label=label,url=url,text=text,bytes=original.stat().st_size,original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=None)
 print(name,text,flush=True)
(BASE/'originals/kazuha-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/枫原万叶语音',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')

