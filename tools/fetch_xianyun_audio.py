"""Fetch intact Chinese originals; calibrate each clip with static gain to Eula."""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json, hashlib, argparse, shutil, statistics
from normalize_itto_audio import measure, run
ROOT = Path(__file__).resolve().parents[1]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--ffmpeg'); ap.add_argument('--stage', action='store_true'); args = ap.parse_args()
    directory = ROOT / 'audio/xianyun/originals'; directory.mkdir(parents=True, exist_ok=True)
    page = 'https://wiki.biligame.com/ys/' + urllib.parse.quote('闲云语音')
    saved = directory/'xianyun-voice-page.html'
    if not saved.exists(): saved.write_bytes(urllib.request.urlopen(urllib.request.Request(page, headers={'User-Agent':'Mozilla/5.0'})).read())
    source = saved.read_text(encoding='utf8')
    entries = {}
    for label in ['元素爆发·其一','元素爆发·其二','元素爆发·其三','倒下·其一','加入队伍·其一','加入队伍·其三']:
        start = source.find('>'+label+'<')
        if start < 0: continue
        block = source[start:start+6000]
        url = html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
        match = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)
        text = html.unescape(re.sub('<[^>]+>','',match[1])).strip()
        entries[label] = (url,text)
    if not args.ffmpeg:
        print(json.dumps(entries,ensure_ascii=False,indent=2)); return
    # Nodes: luanyin confirmed adjustment; xianzhu paid construction; native death.
    selected = {'fan_luanyin1':'元素爆发·其一','fan_luanyin2':'元素爆发·其二','fan_luanyin3':'元素爆发·其三','fan_xianzhu1':'加入队伍·其一','fan_xianzhu2':'加入队伍·其三'}
    old = json.loads((directory/'xianyun-sources.json').read_text(encoding='utf8'))
    by_label = {clip['label']:clip for clip in old['clips'].values()}
    staged = directory/'staged'; staged.mkdir(exist_ok=True)
    refs = [dict(path=p.relative_to(ROOT).as_posix(),**measure(args.ffmpeg,p)) for folder in ['skill','die'] for p in sorted((ROOT/'audio/eula'/folder).glob('*.mp3'))]
    target = round(statistics.median(row['lufs'] for row in refs),2)
    clips = {}; rows = []
    for name,label in selected.items():
        url,text = entries[label]
        previous = by_label.get(label)
        data = (ROOT/previous['original']).read_bytes() if previous else urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':page})).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        source_name = {'fan_luanyin1':'elemental-burst-01','fan_luanyin2':'elemental-burst-02','fan_luanyin3':'elemental-burst-03','fan_xianzhu1':'joining-party-01','fan_xianzhu2':'joining-party-03'}[name]
        original = directory/(source_name+'.mp3')
        if original.exists(): assert original.read_bytes()==data
        else: original.write_bytes(data)
        final = ROOT/'audio/xianyun/skill'/(name+'.mp3')
        output = staged/(name+'.mp3') if args.stage else final
        if output.exists(): raise FileExistsError('Recycle the previous playback version before replacement: '+str(output))
        before = measure(args.ffmpeg,original); gain = round(min(target-before['lufs'],-1.5-before['true_peak_dbtp']),2)
        for _ in range(4):
            run(args.ffmpeg,['-y','-i',str(original),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(output)])
            after = measure(args.ffmpeg,output)
            if after['true_peak_dbtp']<=-1: break
            gain = round(gain-after['true_peak_dbtp']-1.5,2)
        assert after['true_peak_dbtp']<=-1
        row = dict(id=name,gain_db=gain,before=before,after=after); rows.append(row)
        clips[name] = dict(label=label,url=url,text=text,bytes=len(data),original_sha256=hashlib.sha256(data).hexdigest(),original=original.relative_to(ROOT).as_posix(),output=final.relative_to(ROOT).as_posix(),trim_seconds=None,volume=row,sha256=hashlib.sha256(output.read_bytes()).hexdigest(),output_bytes=output.stat().st_size)
    clips['fan_xianyun'] = old['clips']['fan_xianyun']
    rows.append(clips['fan_xianyun']['volume'])
    metadata = staged if args.stage else directory
    (metadata/'xianyun-sources.json').write_text(json.dumps(dict(page=page,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (metadata/'xianyun-volume-report.json').write_text(json.dumps(dict(target_lufs=target,reference='Median of current Eula local playback clips',references=refs,method='static gain, intact originals, encoded true peak <= -1 dBTP',clips=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    if args.stage:
        print(json.dumps(rows,ensure_ascii=False,indent=2)); return
    path = ROOT/'audio/catalog.json'; catalog = json.loads(path.read_text(encoding='utf8'))
    catalog = [e for e in catalog if e['role']!='xianyun']
    for folder in ['skill','die']:
        for file in sorted((ROOT/'audio/xianyun'/folder).glob('*.mp3')):
            data=file.read_bytes(); catalog.append(dict(role='xianyun',path=file.relative_to(ROOT).as_posix(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(rows,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
