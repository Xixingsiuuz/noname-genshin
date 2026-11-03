from pathlib import Path
import json, subprocess
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'audio/neuvillette/originals/neuvillette-sources.json').read_text(encoding='utf8'))
for key in ['fan_leiyu1','fan_leiyu2']:
 c=data['clips'][key]; start,end=c['trim_seconds']
 subprocess.run(['D:/FormatFactory/ffmpeg.exe','-y','-hide_banner','-loglevel','error','-ss',str(start),'-i',str(root/c['original']),'-t',str(end-start),'-c:a','libmp3lame','-q:a','2',str(root/c['output'])],check=True)
