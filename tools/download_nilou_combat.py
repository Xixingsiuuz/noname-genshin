import urllib.request,urllib.parse,json
from pathlib import Path
api='https://genshin-impact.fandom.com/api.php'
u=api+'?'+urllib.parse.urlencode(dict(action='query',list='allimages',aiprefix='VO ZH Nilou',ailimit=500,aiprop='url|size',format='json'))
data=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read()
p=Path('C:/Users/22697/Downloads/Nilou_Combat_ZH');p.mkdir(parents=True,exist_ok=True)
(p/'media-list.json').write_bytes(data)
entries=json.loads(data)['query']['allimages'];selected=[e for e in entries if ('Attack' in e['name'] and 'Hit' not in e['name'])]
print("Found",len(selected),"attack clips")
for e in selected:
 raw=urllib.request.urlopen(urllib.request.Request(e['url'].split('/revision/')[0],headers={'User-Agent':'Mozilla/5.0','Referer':'https://genshin-impact.fandom.com/'}),timeout=45).read()
 assert len(raw)>1000 and not raw.lstrip().startswith(b'<')
 (p/e['name']).write_bytes(raw)
 print(e['name'],len(raw))
(p/'README.txt').write_text('妮露中文攻击人声音效（非刀剑挥击等环境音）。来源： https://genshin-impact.fandom.com/wiki/Nilou/Voice-Overs/Chinese\n原始文件保留，不变速、不调音量。媒体原始URL见media-list.json。\n',encoding='utf8')
