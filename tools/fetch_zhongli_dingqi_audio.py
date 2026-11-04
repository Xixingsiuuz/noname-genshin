from pathlib import Path
import json,re,html,hashlib,shutil
from fetch_yelan_audio import fetch
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'audio/zhongli_rework'
def main():
 p=BASE/'originals/zhongli_rework-sources.json'; manifest=json.loads(p.read_text(encoding='utf8'))
 page=html.unescape((BASE/'originals/zhongli_rework-voice-page.html').read_text(encoding='utf8'))
 entries={'fan_dingqi_start1':'突破的感受·合','fan_dingqi_start2':'关于我们·契约',**{f'fan_dingqi_draw{i}':f'打开宝箱·其{n}' for i,n in enumerate(['一','二','三'],1)},**{f'fan_dingqi_prevent{i}':f'生命值低·其{n}' for i,n in enumerate(['一','二','三'],1)}}
 for name,label in entries.items():
  if name in manifest['clips']:continue
  t=page[page.index('>'+label+'<'):]; url=re.search(r'data-src="(https://patchwiki[^"<>]+\.(?:mp3|ogg))"',t).group(1)
  text=re.sub('<[^>]+>','',re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',t,re.S).group(1)).strip()
  original=BASE/'originals'/(name+Path(url).suffix); data=original.read_bytes() if original.exists() else fetch(url); original.write_bytes(data)
  manifest['clips'][name]=dict(label=label,text=text,url=url,original=original.relative_to(ROOT).as_posix(),output=f'audio/zhongli_rework/skill/{name}.mp3',bytes=len(data),trim_seconds=None)
  print(name,len(data))
 name='fan_dingqi_start3'
 if name not in manifest['clips']:
  src=Path('C:/Users/22697/Downloads/钟离语音/钟离，契约既成，食言者当受食言之罚.mp3'); dst=BASE/'originals'/src.name;shutil.copy2(src,dst)
  manifest['clips'][name]=dict(label='用户指定录音',text='契约既成，食言者当受食言之罚。',url=None,local_source=str(src),original=dst.relative_to(ROOT).as_posix(),output=f'audio/zhongli_rework/skill/{name}.mp3',bytes=dst.stat().st_size,trim_seconds=None)
 p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':main()
