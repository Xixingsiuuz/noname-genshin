from pathlib import Path
import re,html,json,urllib.request
base=Path(__file__).resolve().parents[1]/'audio/linnea/originals'
s=(base/'voice-page.html').read_text(encoding='utf8')
labels=['关于我们·见闻','突破的感受·转','突破的感受·合','元素爆发·其一','元素爆发·其二','元素爆发·其三','打开宝箱·其一','打开宝箱·其三','在沙漠的时候…','倒下·其一','倒下·其二','倒下·其三']
rows=[]
for i,label in enumerate(labels):
 start=s.index('>'+label+'<');chunk=s[start:start+5000]
 url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0])
 text=html.unescape(re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',chunk,re.S)[1])
 path=base/f'source{i+1:02}.mp3'
 if not path.exists():path.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=45).read())
 rows.append(dict(label=label,url=url,text=text,file=path.name,bytes=path.stat().st_size))
 (base/'sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
 print(i+1,flush=True)
