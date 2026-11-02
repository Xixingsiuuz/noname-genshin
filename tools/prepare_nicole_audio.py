from pathlib import Path
import json,hashlib
from fetch_mona_audio import measure
from normalize_itto_audio import run
ROOT=Path(__file__).resolve().parents[1];base=ROOT/'audio/nicole';rows=json.loads((base/'originals/entries.json').read_text(encoding='utf8'));ff='D:/FormatFactory/ffmpeg.exe'
spec=[('fan_tianlin_before1','晚上好…',[0,6.45],'晚上是灵感迸发最频繁的时间，所以也是以前的人遇到天使最多的时间。'),('fan_tianlin_before2','想要了解尼可·其五',[17.45,20.5],'神圣的潜力在你们所有人之中。'),('fan_duanyu_success','关于我们·代笔',[0,5.6],'你的见识也挺多的，怎么样，有没有兴趣来当我的新代笔啊。'),('fan_duanyu_failure','想要了解尼可·其五',[5.45,16.6],'我舍弃翅膀并非是坠落，而是为了触碰；我舍弃声音，也并非是缄默，只是为了在评价之前好好倾听。'),('fan_xuanji_story1','有什么想要分享…',[0,5.15],'真的要说吗？真的要听我说吗？你其实也很想听对吧？')]
for i,l in enumerate(['元素爆发·其一','元素爆发·其二','元素爆发·其三','闲聊·雕塑','闲聊·沉默'],1):spec.append((f'fan_tianlin_after{i}',l,None,None))
for pool,labels in [('fan_duanyu_guard',['元素战技·其'+x for x in '一二三']),('fan_tianlin_draw_voice',['加入队伍·其'+x for x in '一二三']),('fan_xuanji_story',['突破的感受·'+x for x in '起承转合'])]:
 for i,l in enumerate(labels,2 if pool=='fan_xuanji_story' else 1):spec.append((pool+str(i),l,None,None))
clips={};(base/'skill').mkdir(exist_ok=True)
for id,label,trim,text in spec:
 src=base/'originals'/rows[label]['file'];out=base/'skill'/(id+'.mp3');filters=f'atrim=start={trim[0]}:end={trim[1]},asetpts=PTS-STARTPTS' if trim else 'anull'
 # Measure the actual excerpt, then apply static gain only.
 from normalize_itto_audio import measure as measure_filter
 before=measure_filter(ff,src,filters);gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
 run(ff,['-y','-i',str(src),'-af',filters+f',volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
 after=measure(ff,out);assert after['true_peak_dbtp']<=-1
 clips[id]=dict(label=label,url=rows[label]['url'],original=src.relative_to(ROOT).as_posix(),bytes=src.stat().st_size,original_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),output=out.relative_to(ROOT).as_posix(),output_bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),trim_seconds=trim,text=text or rows[label]['text'],gain_db=gain,measurement=after,review='silence-boundary analysis; not human-listened')
(base/'originals/nicole-sources.json').write_text(json.dumps(dict(page='https://wiki.biligame.com/ys/尼可语音',clips=clips),ensure_ascii=False,indent=2),encoding='utf8')
p=ROOT/'audio/catalog.json';catalog=json.loads(p.read_text(encoding='utf8'));catalog=[r for r in catalog if r['role']!='nicole'];catalog += [dict(role='nicole',path=c['output'],bytes=c['output_bytes'],sha256=c['sha256']) for c in clips.values()];p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
print('Processed',len(clips),'clips')
