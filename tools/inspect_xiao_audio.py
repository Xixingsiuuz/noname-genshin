import urllib.request,urllib.parse,json
from pathlib import Path
u='https://genshin-impact.fandom.com/api.php?'+urllib.parse.urlencode(dict(action='parse',page='Xiao/Voice-Overs/Chinese',prop='wikitext',format='json'))
b=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})).read();Path('audio/xiao/originals/xiao-wikitext.json').write_bytes(b)
s=json.loads(b)['parse']['wikitext']['*'];print('\n'.join(x for x in s.splitlines() if any(k in x for k in ['Elemental','Wandering','Corrosion','Fallen'])))
