from pathlib import Path
import urllib.request,urllib.parse,re,html,json
root=Path(__file__).resolve().parents[1]
page='https://wiki.biligame.com/ys/宵宫语音'
s=urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(page,safe=':/'),headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf8')
entries={'fan_xiaji':'元素战技·其一','fan_huahuo1':'元素战技·其二','fan_huahuo2':'元素战技·其三','fan_xiaji_burst1':'元素爆发·其一','fan_xiaji_burst2':'元素爆发·其二','fan_xiaji_burst3':'元素爆发·其三','fan_yoimiya':'倒下·其一'}
manifest={}
for name,label in entries.items():
 p=s.find('>'+label+'<'); url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',s[p:p+2000])[0])
 output=root/'audio/yoimiya'/('die' if name=='fan_yoimiya' else 'skill')/(name+'.mp3')
 data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'})).read()
 assert len(data)>1000 and not data.lstrip().startswith(b'<')
 output.write_bytes(data);manifest[name]={'label':label,'url':url,'bytes':len(data)}
(root/'audio/yoimiya/originals/yoimiya-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('Downloaded',len(manifest),'original Chinese voice clips')
