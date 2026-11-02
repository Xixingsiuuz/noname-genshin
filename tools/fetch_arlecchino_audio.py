"""Fetch requested Chinese originals; retain provenance and reproducible trims."""
from pathlib import Path
import html,json,re,urllib.request,hashlib,subprocess,sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'audio/arlecchino'
page=(BASE/'originals/voice-page.html').read_text(encoding='utf-8-sig')
spec={'fan_chiyi1':'打开宝箱·其二','fan_chiyi2':'打雷的时候…',
 **{f'fan_luhuo_start{i}':f'加入队伍·其{n}' for i,n in enumerate('一二三',1)},
 'fan_luhuo_draw1':'下雪的时候…','fan_luhuo_draw2':'闲聊·眼睛',
 'fan_luhuo_attack1':'想要了解阿蕾奇诺·其三','fan_luhuo_attack2':'阿蕾奇诺的爱好…',
 'fan_ruyue_rise1':'元素爆发·其二','fan_ruyue_fall1':'元素爆发·其一',
 'fan_ruyue_rise2':'元素爆发·其三','fan_ruyue_fall2':'元素爆发·其三',
 **{f'fan_ruyue_convert_voice{i}':f'元素战技·其{n}' for i,n in enumerate('一二三',1)},
 **{f'fan_arlecchino{i}':f'倒下·其{n}' for i,n in enumerate('一二三',1)}}
clips={}
for name,label in spec.items():
 start=page.find('>'+label+'<')
 if start<0: raise ValueError(label)
 block=page[start:start+8000]
 url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
 match=re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)
 text=html.unescape(re.sub('<[^>]+>','',match[1])).strip()
 original=BASE/'originals'/(name+'.mp3')
 if not original.exists(): original.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read())
 assert original.stat().st_size>1000
 out=BASE/('die' if name.startswith('fan_arlecchino') else 'skill')/(name+'.mp3');out.parent.mkdir(exist_ok=True)
 out.write_bytes(original.read_bytes())
 clips[name]=dict(label=label,url=url,text=text,bytes=original.stat().st_size,original=original.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),trim_seconds=None)
 print(name,text,flush=True)
(BASE/'originals/arlecchino-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/阿蕾奇诺语音',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
