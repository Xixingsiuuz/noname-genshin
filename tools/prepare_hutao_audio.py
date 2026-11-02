"""Preserve supplied/requested originals; export trimmed static-gain playback clips."""
from pathlib import Path
import argparse, urllib.request, urllib.parse, re, html, json, hashlib, shutil
from normalize_itto_audio import measure, run
ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'audio/hutao/originals'
PAGE = 'https://wiki.biligame.com/ys/' + urllib.parse.quote('胡桃语音')
LABELS = {
    'intro':'想要了解胡桃·其二', 'sun':'闲聊·偷懒', 'morning':'早上好…',
    'ningguang':'关于凝光…', 'name':'关于胡桃自己·名字', 'customers':'闲聊·客户',
    'burst1':'元素爆发·其一', 'burst2':'元素爆发·其二', 'burst3':'元素爆发·其三',
    'die1':'倒下·其一', 'die2':'倒下·其二', 'die3':'倒下·其三',
}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--fetch',action='store_true'); ap.add_argument('--export',action='store_true'); ap.add_argument('--only',nargs='+'); args=ap.parse_args()
    DIR.mkdir(parents=True,exist_ok=True)
    s=(DIR/'hutao-voice-page.html').read_text(encoding='utf8'); sources={}
    for key,label in LABELS.items():
        start=s.find('>'+label+'<')
        if start<0: raise ValueError(label)
        block=s[start:start+6500]
        url=html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
        m=re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)
        text=html.unescape(re.sub('<[^>]+>','',m[1])).strip()
        path=DIR/(key+'.mp3')
        if args.fetch and not path.exists():
            data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':PAGE})).read()
            assert len(data)>1000 and not data.lstrip().startswith(b'<'); path.write_bytes(data)
        sources[key]=dict(label=label,url=url,text=text)
    supplied=Path('C:/Users/22697/Downloads/胡桃，大丘丘病了二丘丘瞧....mp3')
    if not (DIR/'hilichurl.mp3').exists(): shutil.copy2(supplied,DIR/'hilichurl.mp3')
    sources['hilichurl']=dict(label='用户提供·待机语音',url=supplied.as_uri(),text='大丘丘病了二丘丘瞧，三丘丘采药四丘丘熬')
    (DIR/'download-index.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    if not args.export:
        print(json.dumps(sources,ensure_ascii=False,indent=2)); return
    # Boundaries selected using phrase structure and silence inspection; not a substitute for human listening.
    plan=json.loads((DIR/'clip-plan.json').read_text(encoding='utf8'))
    clips={}; rows=[]; ff='D:/FormatFactory/ffmpeg.exe'
    existing=json.loads((DIR/'hutao-sources.json').read_text(encoding='utf8'))['clips'] if args.only else {}
    if args.only: assert set(args.only).issubset(plan)
    for name, spec in plan.items():
        if args.only and name not in args.only:
            clips[name]=existing[name]; rows.append(existing[name]['volume']); continue
        key=spec['source']; src=DIR/(key+'.mp3'); out=ROOT/'audio/hutao'/spec.get('folder','skill')/(name+'.mp3'); out.parent.mkdir(parents=True,exist_ok=True)
        trim=spec.get('trim'); filters=f'atrim=start={trim[0]}:end={trim[1]},asetpts=PTS-STARTPTS' if trim else 'anull'
        before=measure(ff,src,filters); gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
        for _ in range(4):
            run(ff,['-y','-i',str(src),'-af',filters+f',volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
            after=measure(ff,out)
            if after['true_peak_dbtp']<=-1: break
            gain=round(gain-after['true_peak_dbtp']-1.5,2)
        assert after['true_peak_dbtp']<=-1
        row=dict(id=name,gain_db=gain,before=before,after=after); rows.append(row)
        clips[name]=dict(sources[key],text=spec.get('text',sources[key]['text']),original=src.relative_to(ROOT).as_posix(),output=out.relative_to(ROOT).as_posix(),bytes=src.stat().st_size,original_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),trim_seconds=trim,volume=row,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),output_bytes=out.stat().st_size)
    (DIR/'hutao-sources.json').write_text(json.dumps(dict(page=PAGE,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (DIR/'hutao-volume-report.json').write_text(json.dumps(dict(target_lufs=-14.25,method='static gain, no speed change; encoded true peak <= -1 dBTP',human_listening=False,clips=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    lines=['# 胡桃逐条音量测量','','固定增益；优菈参考 −14.25 LUFS；峰值余量优先。未人工试听或对局听感验证。','',
           '|播放文件|增益 dB|原片段 LUFS|成品 LUFS|原片段 dBTP|成品 dBTP|','|---|---:|---:|---:|---:|---:|']
    for row in rows:
        lines.append(f"|{row['id']}|{row['gain_db']:+.2f}|{row['before']['lufs']:.2f}|{row['after']['lufs']:.2f}|{row['before']['true_peak_dbtp']:.2f}|{row['after']['true_peak_dbtp']:.2f}|")
    (ROOT/'audio/hutao/volume.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
    path=ROOT/'audio/catalog.json'; catalog=json.loads(path.read_text(encoding='utf8')); catalog=[e for e in catalog if e['role']!='hutao']
    for file in sorted((ROOT/'audio/hutao').glob('*/*.mp3')):
        if file.parent.name not in ('skill','die'): continue
        data=file.read_bytes(); catalog.append(dict(role='hutao',path=file.relative_to(ROOT).as_posix(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
