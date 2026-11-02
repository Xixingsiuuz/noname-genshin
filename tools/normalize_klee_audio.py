"""Apply per-clip static gain, retaining every untouched Klee source."""
from pathlib import Path
import argparse, json, hashlib
from normalize_itto_audio import measure, run
ROOT = Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--ffmpeg',required=True); args=parser.parse_args()
    path=ROOT/'audio/klee/originals/klee-sources.json'
    manifest=json.loads(path.read_text(encoding='utf8')); rows=[]
    for name,clip in manifest['clips'].items():
        source=ROOT/clip['original']; output=ROOT/clip['output']
        if output.exists(): raise RuntimeError('Refuse to overwrite an existing playback file; recycle it explicitly first: '+str(output))
        before=measure(args.ffmpeg,source)
        gain=round(min(-14.25-before['lufs'],-1.5-before['true_peak_dbtp']),2)
        run(args.ffmpeg,['-i',str(source),'-af',f'volume={gain}dB','-c:a','libmp3lame','-q:a','2',str(output)])
        after=measure(args.ffmpeg,output)
        assert after['true_peak_dbtp']<=-1,(name,after)
        row=dict(id=name,gain_db=gain,before=before,after=after)
        clip.update(volume=row,output_bytes=output.stat().st_size,sha256=hashlib.sha256(output.read_bytes()).hexdigest())
        rows.append(row)
    report=dict(target_lufs=-14.25,reference='Existing Eula playback median',method='static gain, no trim, no speed change; encoded true peak <= -1 dBTP',clips=rows,not_verified=['人工试听','真实对局播放'])
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (path.parent/'klee-volume-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    catalog_path=ROOT/'audio/catalog.json'; catalog=json.loads(catalog_path.read_text(encoding='utf8'))
    assert not any(entry['role']=='klee' for entry in catalog)
    for clip in manifest['clips'].values():
        for key in ['original','output']:
            data=(ROOT/clip[key]).read_bytes()
            catalog.append(dict(role='klee',path=clip[key],bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
