"""Fetch intact Chinese originals; calibrate each clip with static gain to Eula."""
from pathlib import Path
import urllib.request, urllib.parse, re, html, json, hashlib, argparse
from normalize_itto_audio import measure, run
ROOT = Path(__file__).resolve().parents[1]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--ffmpeg'); args = ap.parse_args()
    directory = ROOT / 'audio/ganyu/originals'; directory.mkdir(parents=True, exist_ok=True)
    page = 'https://wiki.biligame.com/ys/' + urllib.parse.quote('甘雨语音')
    source = urllib.request.urlopen(urllib.request.Request(page, headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf8')
    (directory/'ganyu-voice-page.html').write_text(source, encoding='utf8')
    entries = {}
    for label in ['元素爆发·其一','元素爆发·其二','元素爆发·其三','元素战技·其一','元素战技·其二','元素战技·其三','打开宝箱·其一','打开宝箱·其二','打开宝箱·其三','倒下·其一']:
        start = source.find('>'+label+'<')
        if start < 0: continue
        block = source[start:start+6000]
        url = html.unescape(re.findall(r'https[^"<> ]+\.mp3',block)[0])
        match = re.search(r'class="voice_text_chs[^\"]*"[^>]*>(.*?)</div>',block,re.S)
        text = html.unescape(re.sub('<[^>]+>','',match[1])).strip()
        entries[label] = (url,text)
    if not args.ffmpeg:
        print(json.dumps(entries,ensure_ascii=False,indent=2)); return
    # Nodes planned in tests/ganyu-notes.md: paid preparation, confirmed draw, actual charge increase, confirmed gain, native death.
    selected = {'fan_liutian':'元素爆发·其一','fan_linji':'元素战技·其一','fan_linji_charge':'元素战技·其二','fan_xingzuo':'打开宝箱·其一','fan_ganyu':'倒下·其一'}
    clips = {}; rows = []
    for name,label in selected.items():
        url,text = entries[label]
        data = urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':page})).read()
        assert len(data)>1000 and not data.lstrip().startswith(b'<')
        original = directory/(name+'.mp3'); original.write_bytes(data)
        output = ROOT/'audio/ganyu'/('die' if name=='fan_ganyu' else 'skill')/(name+'.mp3'); output.parent.mkdir(exist_ok=True)
        before = measure(args.ffmpeg,original); gain = round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
        for _ in range(4):
            run(args.ffmpeg,['-y','-i',str(original),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(output)])
            after = measure(args.ffmpeg,output)
            if after['true_peak_dbtp']<=-1: break
            gain = round(gain-after['true_peak_dbtp']-1.5,2)
        assert after['true_peak_dbtp']<=-1
        row = dict(id=name,gain_db=gain,before=before,after=after); rows.append(row)
        clips[name] = dict(label=label,url=url,text=text,bytes=len(data),original_sha256=hashlib.sha256(data).hexdigest(),original=original.relative_to(ROOT).as_posix(),output=output.relative_to(ROOT).as_posix(),trim_seconds=None,volume=row,sha256=hashlib.sha256(output.read_bytes()).hexdigest(),output_bytes=output.stat().st_size)
    (directory/'ganyu-sources.json').write_text(json.dumps(dict(page=page,clips=clips),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (directory/'ganyu-volume-report.json').write_text(json.dumps(dict(target_lufs=-14.25,method='static gain, intact originals, encoded true peak <= -1 dBTP',clips=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    path = ROOT/'audio/catalog.json'; catalog = json.loads(path.read_text(encoding='utf8'))
    catalog = [e for e in catalog if e['role']!='ganyu']
    for folder in ['skill','die']:
        for file in sorted((ROOT/'audio/ganyu'/folder).glob('*.mp3')):
            data=file.read_bytes(); catalog.append(dict(role='ganyu',path=file.relative_to(ROOT).as_posix(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(rows,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
