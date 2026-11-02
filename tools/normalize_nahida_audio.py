"""Apply static gain to preserved originals; measure encoded playback files."""
from pathlib import Path
import argparse, json, hashlib, math, statistics
from normalize_itto_audio import measure, run
ROOT = Path(__file__).resolve().parents[1]

def measured(ffmpeg, path):
    value = measure(ffmpeg, path)
    if not math.isfinite(value['lufs']):
        # Short exclamations cannot fill the integrated gate; repeat only for measurement.
        value = measure(ffmpeg, path, 'aloop=loop=14:size=2000000')
        value['measurement_only_repeat'] = 15
    assert math.isfinite(value['lufs']), str(path)
    return value

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True)
    args=parser.parse_args()
    refs=[dict(path=p.relative_to(ROOT).as_posix(), **measured(args.ffmpeg,p))
          for p in sorted((ROOT/'audio/eula').glob('*/*')) if p.suffix in ('.mp3','.ogg')]
    target=round(statistics.median(x['lufs'] for x in refs),2)
    path=ROOT/'audio/nahida/originals/sources.json'
    data=json.loads(path.read_text(encoding='utf8'))
    rows=[]
    for clip in data['clips']:
        original=ROOT/clip['original']; out=ROOT/clip['output']
        source_hash=hashlib.sha256(original.read_bytes()).hexdigest()
        before=measured(args.ffmpeg,original)
        gain=round(min(target-before['lufs'], -1.5-before['true_peak_dbtp']),2)
        for attempt in range(4):
            run(args.ffmpeg,['-y','-i',str(original),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(out)])
            after=measured(args.ffmpeg,out)
            if after['true_peak_dbtp'] <= -1: break
            gain=round(gain-after['true_peak_dbtp']-1.5,2)
        assert after['true_peak_dbtp'] <= -1
        assert hashlib.sha256(original.read_bytes()).hexdigest()==source_hash
        row=dict(id=clip['id'], gain_db=gain, before=before, after=after)
        rows.append(row)
        clip.update(original_sha256=source_hash,output_bytes=out.stat().st_size,
                    output_sha256=hashlib.sha256(out.read_bytes()).hexdigest(),volume=row)
        print(clip['id'],gain,flush=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    report=dict(target_lufs=target,references=refs,clips=rows)
    (path.parent/'volume-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    p=ROOT/'audio/catalog.json'; catalog=json.loads(p.read_text(encoding='utf8'))
    for entry in catalog:
        if entry['path'].startswith('audio/nahida/'):
            raw=(ROOT/entry['path']).read_bytes()
            entry.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
    p.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    p=ROOT/'audio/README.md'
    text=p.read_text(encoding='utf8')+'\n\n### 纳西妲语音补全与音量校准\n详情页按花囚开始→免伤→复原、闻授选牌→增益→惩罚→收牌、幻景顺序汇总试听；兰荫无声。原生路径字幕含阵亡已补齐。保留原声，以优菈当前中位数 '+str(target)+' LUFS 为目标，仅固定增益，不裁剪、不变速、不压缩动态；编码后峰值均不高于−1 dBTP。短语重复仅用于测量，实际文件不循环。\n\n|文件|增益dB|前LUFS|后LUFS|前dBTP|后dBTP|\n|---|---:|---:|---:|---:|---:|\n'
    for r in rows:
        text+=f"|{r['id']}|{r['gain_db']}|{r['before']['lufs']}|{r['after']['lufs']}|{r['before']['true_peak_dbtp']}|{r['after']['true_peak_dbtp']}|\n"
    text+='\n尚未人工试听及游戏界面实测；原生解析及顺序通过模拟验证。\n'
    p.write_text(text,encoding='utf8')
if __name__=='__main__': main()
