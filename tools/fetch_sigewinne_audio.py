from pathlib import Path
import urllib.request,urllib.parse,re,html,json
root=Path.cwd();base=root/'audio/sigewinne';(base/'originals').mkdir(parents=True,exist_ok=True)
s=urllib.request.urlopen(urllib.request.Request(urllib.parse.quote('https://wiki.biligame.com/ys/希格雯语音',safe=':/'),headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf8')
(base/'originals/sigewinne-voice-page.html').write_text(s,encoding='utf8')
entries={'fan_jingyang1':'元素战技·其四','fan_jingyang2':'元素战技·其五','fan_jingyang3':'元素战技·其六','fan_jingyang_hehu1':'元素战技·其一','fan_jingyang_hehu2':'元素战技·其二','fan_jingyang_hehu3':'元素战技·其三','fan_jiyu1':'元素爆发·其一','fan_jiyu2':'元素爆发·其二','fan_jiyu3':'元素爆发·其三','fan_sigewinne1':'倒下·其一','fan_sigewinne2':'倒下·其二','fan_sigewinne3':'倒下·其三'}
manifest={}
for name,label in entries.items():
 p=s.find('>'+label+'<');assert p>=0,label
 chunk=s[p:p+3500];url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0]);end=chunk.find('</tr>');text=html.unescape(re.sub('<[^>]+>',' ',chunk[:end]));text=re.sub(r'\s+',' ',text).strip()
 data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'})).read();assert len(data)>1000
 folder='die' if name.startswith('fan_sigewinne') else 'skill';out=base/folder/(name+'.mp3');out.parent.mkdir(exist_ok=True);out.write_bytes(data);(base/'originals'/(name+'.mp3')).write_bytes(data)
 manifest[name]={'label':label,'url':url,'bytes':len(data),'text':text};print(name,text)
(base/'originals/sigewinne-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')

