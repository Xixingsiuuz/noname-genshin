import json,urllib.request,concurrent.futures
from pathlib import Path
p=Path('C:/Users/22697/Downloads/Nilou_Combat_ZH');e=json.loads((p/'media-list.json').read_bytes())['query']['allimages'];e=next(x for x in e if 'Heavy_Attack_01' in x['name']);u=e['url'];base=u.split('/revision/')[0]
urls=[u+'&format=original',base+'?format=original',base.replace('static.wikia.nocookie.net','vignette.wikia.nocookie.net'),base.replace('/gensin-impact/','/genshin-impact/'),base.replace('static.wikia.nocookie.net','static.wikia.com'),u.replace('https:','http:')]
def check(url):
 try:
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=12).read()
  if data[:4]==b'OggS':(p/e['name']).write_bytes(data);print('SUCCESS',url,flush=True)
  else:print('not audio',url,flush=True)
 except Exception as ex:print(str(ex),url,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(check,urls))
