from pathlib import Path
import urllib.request,urllib.parse,re,html,json
root=Path.cwd();base=root/'audio/ineffa';(base/'originals').mkdir(parents=True,exist_ok=True)
s=urllib.request.urlopen(urllib.request.Request(urllib.parse.quote('https://wiki.biligame.com/ys/伊涅芙语音',safe=':/'),headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf8')
(base/'originals/ineffa-voice-page.html').write_text(s,encoding='utf8')
entries={'fan_wentai1':'元素战技·其三','fan_wentai2':'元素战技·其一','fan_miyuan_charge1':'闲聊·更新','fan_miyuan_charge2':'加入队伍·其一','fan_miyuan_charge3':'加入队伍·其二','fan_miyuan_use1':'元素爆发·其一','fan_miyuan_use2':'元素爆发·其三','fan_miyuan_guohe':'元素爆发·其二','fan_ineffa1':'倒下·其一','fan_ineffa2':'倒下·其二','fan_ineffa3':'倒下·其三'}
manifest={}
for name,label in entries.items():
 p=s.find('>'+label+'<');assert p>=0,label
 chunk=s[p:p+3500];url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0]);end=chunk.find('</tr>');text=html.unescape(re.sub('<[^>]+>',' ',chunk[:end]));text=re.sub(r'\s+',' ',text).strip()
 data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'})).read();assert len(data)>1000
 folder='die' if name.startswith('fan_ineffa') else 'skill';out=base/folder/(name+'.mp3');out.parent.mkdir(exist_ok=True);out.write_bytes(data);(base/'originals'/(name+'.mp3')).write_bytes(data)
 manifest[name]={'label':label,'url':url,'bytes':len(data),'text':text};print(name,text)
(base/'originals/ineffa-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
