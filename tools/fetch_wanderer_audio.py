from pathlib import Path
import urllib.request,urllib.parse,re,html,json,hashlib,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1];base=ROOT/'audio/wanderer';orig=base/'originals'
for d in ['originals','skill','die']:(base/d).mkdir(parents=True,exist_ok=True)
PAGE='https://wiki.biligame.com/ys/流浪者语音'
page=orig/'voice-page.html'
if not page.exists():page.write_bytes(urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(PAGE,safe=':/'),headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read())
s=page.read_text(encoding='utf8');clips={}
spec={'fan_shixin_pending':['元素爆发·其三','元素爆发·其四'],'fan_xunshen_draw_pending':['元素爆发·其一','元素爆发·其二'],'fan_xunshen_loss':['重受击·其一','重受击·其二'],'fan_genchu_discard':['元素爆发·其五','元素爆发·其六'],'fan_genchu_success_voice':['关于流浪者自己·人偶','关于流浪者自己·心'],'fan_shixin_success_voice':['元素战技·其二','元素战技·其三'],'fan_wendao_voice':['打开宝箱·其一','元素战技·其一'],'fan_wanderer':['倒下·其一','倒下·其二','倒下·其三']}
for key,labels in spec.items():
 for i,label in enumerate(labels,1):
  name=f'{key}{i}';start=s.index('>'+label+'<');chunk=s[start:start+7000];url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',chunk)[0]);text=html.unescape(re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',chunk,re.S)[1])).strip()
  source=orig/(name+'.mp3')
  if not source.exists():source.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':PAGE.encode('ascii','ignore').decode()}),timeout=45).read())
  out=base/('die' if key=='fan_wanderer' else 'skill')/(name+'.mp3');shutil.copy2(source,out)
  clips[name]=dict(label=label,text=text,url=url,original=source.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),bytes=source.stat().st_size,trim_seconds=None)
  print(name,flush=True)
local=Path(r'C:/Users/22697/Downloads/流浪者语音')
groups={'fan_genchu_failure_voice':['微小虫孑，岂敢视神？','伟力如此，皆为神诞','七叶之下，唯我长存！'],'fan_genchu_raiden_alive':['巴尔泽布，我已登神！'],'fan_genchu_raiden_dead':['巴尔泽布，你以无心无力'],'fan_shixin_failure_voice':['镇压！','雷殛！','焚毁！','渎神，大罪！','你也将，无处立足'],'fan_xunshen_draw_failure':['旋流，涡转！','轮转百劫！','寂照万物！','扫拭六尘！','涤净诸相！','十祸消聚！','正名神诞！'],'fan_wanderer_failure':['我...还没有...','怎能...再次失去？']}
ff=r'C:/Users/22697/AppData/Local/Temp/ganyu-ffmpeg/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
for key,labels in groups.items():
 for i,label in enumerate(labels,1):
  name=f'{key}{i}';source=local/('流浪者，'+label+'.mp3');saved=orig/source.name;shutil.copy2(source,saved)
  out=base/('die' if key=='fan_wanderer_failure' else 'skill')/(name+'.mp3')
  # Retain complete recording: only 5 ms edge ramps to avoid adding clicks; no SFX removal or speech cutting.
  subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(saved),'-af','afade=t=in:d=0.005,areverse,afade=t=in:d=0.005,areverse','-c:a','libmp3lame','-q:a','2',str(out)],check=True)
  clips[name]=dict(label=label,text=(label+"。" if label=="蝼蚁之众" else label),url=None,source=str(source),original=saved.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),bytes=saved.stat().st_size,trim_seconds=None,fade_seconds={'in':.005,'out':.005},review='complete source retained; no auditory review; no speech/SFX separation')
for c in clips.values():c['sha256']=hashlib.sha256((ROOT/c['output']).read_bytes()).hexdigest();c['output_bytes']=(ROOT/c['output']).stat().st_size
(orig/'sources.json').write_text(json.dumps(dict(page=PAGE,clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'));catalog=[c for c in catalog if c.get('role')!='wanderer']
for c in clips.values():
 for k in ['original','output']:
  f=ROOT/c[k];catalog.append(dict(role='wanderer',path=c[k],bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest()))
p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
