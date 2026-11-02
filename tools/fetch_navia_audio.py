from pathlib import Path
import urllib.request,urllib.parse,re,html,json,hashlib,shutil,argparse
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'audio/navia/originals'
PAGE='https://wiki.biligame.com/ys/'+urllib.parse.quote('娜维娅语音')
def fetch(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://wiki.biligame.com/'}),timeout=60).read()
def main():
 D.mkdir(parents=True,exist_ok=True)
 page=D/'navia-voice-page.html'
 if not page.exists():page.write_bytes(fetch(PAGE))
 s=page.read_text(encoding='utf8'); clips={}
 selected={'fan_cijue_start4':'加入队伍·其二','fan_cijue_start5':'加入队伍·其三','fan_xianjing_damage1':'元素战技·其一','fan_xianjing_damage2':'元素战技·其二','fan_xianjing_damage3':'元素战技·其六','fan_xianjing_other1':'元素战技·其五','fan_xianjing_other2':'打开宝箱·其二','fan_xianjing_other3':'打开宝箱·其三',**{f'fan_navia{i}':f'倒下·其{n}' for i,n in enumerate('一二三',1)}}
 for name,label in selected.items():
  start=s.index('>'+label+'<');block=s[start:start+6000]
  url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
  text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)[1])).strip()
  path=D/(name+'.mp3')
  if not path.exists():path.write_bytes(fetch(url))
  assert path.stat().st_size>1000
  clips[name]=dict(label=label,url=url,text=text,original=path.relative_to(ROOT).as_posix())
  print(name,label,text,flush=True)
 supplied=Path('C:/Users/22697/Downloads/娜维娅语音')
 files=['娜维娅，可以对她使用说服吗？.mp3','娜维娅，我可以对他使用说服吗？2.mp3','娜维娅，我可以对他使用说服吗？3.mp3','娜维娅，说服成功！.mp3','娜维娅，说服大成功！.mp3']
 for i,filename in enumerate(files):
  name=f'fan_cijue_start{i+1}' if i<3 else f'fan_cijue_win{i-2}'
  path=D/(name+'.mp3');shutil.copy2(supplied/filename,path)
  clips[name]=dict(label=filename,url=(supplied/filename).as_uri(),text='我可以对她使用说服吗？' if i<3 else ('说服成功！' if i==3 else '说服大成功！'),original=path.relative_to(ROOT).as_posix())
 for c in clips.values():
  data=(ROOT/c['original']).read_bytes();c.update(bytes=len(data),original_sha256=hashlib.sha256(data).hexdigest())
 (D/'navia-sources.json').write_text(json.dumps(dict(page=PAGE,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
