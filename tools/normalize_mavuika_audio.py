"""Measure each Mavuika source, apply only static gain and verify encoded peaks."""
from pathlib import Path
import argparse
import hashlib
import json
import statistics
import subprocess
from normalize_itto_audio import measure, run

ROOT = Path(__file__).resolve().parents[1]

def recycle(path):
    # Only discard encodes created by this tool, keeping source recordings intact.
    path = path.resolve()
    assert path.is_relative_to((ROOT / 'audio/mavuika').resolve())
    assert path.parent.name in ['skill', 'die'] and path.suffix == '.mp3'
    literal = str(path).replace("'", "''")
    command = "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('" + literal + "', 'OnlyErrorDialogs', 'SendToRecycleBin')"
    subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', command], check=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True)
    args = parser.parse_args()
    path = ROOT / 'audio/mavuika/originals/mavuika-sources.json'
    manifest = json.loads(path.read_text(encoding='utf8'))
    refs = [dict(path=p.relative_to(ROOT).as_posix(), **measure(args.ffmpeg, p))
        for folder in ['skill', 'die'] for p in sorted((ROOT / 'audio/eula' / folder).glob('*.mp3'))]
    target = round(statistics.median(row['lufs'] for row in refs), 2)
    rows = []
    for name, clip in manifest['clips'].items():
        source, output = ROOT / clip['original'], ROOT / clip['output']
        if output.exists():
            assert hashlib.sha256(output.read_bytes()).hexdigest() == clip['sha256'], output
            assert hashlib.sha256(source.read_bytes()).hexdigest() == clip['original_sha256'], source
            assert output.stat().st_size == clip['output_bytes']
            after = measure(args.ffmpeg, output)
            assert after['true_peak_dbtp'] <= -1, (name, after)
            row = dict(clip['volume'], id=name, after=after)
            clip['volume'] = row
            rows.append(row)
            continue
        before = measure(args.ffmpeg, source)
        # Measure reconstructed MP3 peaks: reduce gain and recycle failed encodes.
        gain = round(min(target - before['lufs'], -1.5 - before['true_peak_dbtp']), 2)
        for attempt in range(4):
            run(args.ffmpeg, ['-i', str(source), '-af', f'volume={gain}dB',
                '-c:a', 'libmp3lame', '-q:a', '2', str(output)])
            after = measure(args.ffmpeg, output)
            if after['true_peak_dbtp'] <= -1:
                break
            recycle(output)
            gain = round(gain - max(0.5, after['true_peak_dbtp'] + 1.5), 2)
        assert after['true_peak_dbtp'] <= -1, (name, after)
        assert hashlib.sha256(source.read_bytes()).hexdigest() == clip['original_sha256']
        row = dict(id=name, text=clip['text'], gain_db=gain, before=before, after=after)
        clip.update(volume=row, output_bytes=output.stat().st_size,
            sha256=hashlib.sha256(output.read_bytes()).hexdigest())
        rows.append(row)
    report = dict(target_lufs=target, references=refs, method='Per-clip static gain only; no trim or speed changes; encoded true peak <= -1 dBTP',
        clips=rows, not_verified=['人工试听', '游戏界面', '真实对局及联机播放'])
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    (path.parent / 'mavuika-volume-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    lines = ['# 玛薇卡音量校准', '', f'2026-10-26；优菈现有播放文件实测中位数 {target:.2f} LUFS。完整原声，逐条固定增益，编码后复测。', '',
        '| 用途 | 增益 dB | 原声→播放 LUFS | 原声→播放 dBTP |', '| --- | ---: | ---: | ---: |']
    for row in rows:
        a, b = row['before'], row['after']
        lines.append(f"| {row['id']}（{row['text']}） | {row['gain_db']:+.2f} | {a['lufs']:.2f}→{b['lufs']:.2f} | {a['true_peak_dbtp']:.2f}→{b['true_peak_dbtp']:.2f} |")
    lines += ['', '原声峰均比限制了可用增益，部分语音低于目标；保留原声动态，不施加压缩或限幅。未人工试听、未真实对局或联机实测。']
    (ROOT / 'audio/mavuika/volume-report.md').write_text('\n'.join(lines) + '\n', encoding='utf8')
    catalog_path = ROOT / 'audio/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    # Only rebuild this character; leave every other character record untouched.
    catalog = [entry for entry in catalog if entry['role'] != 'mavuika']
    for clip in manifest['clips'].values():
        for key in ['original', 'output']:
            data = (ROOT / clip[key]).read_bytes()
            catalog.append(dict(role='mavuika', path=clip[key], bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print('\n'.join(lines))

if __name__ == '__main__':
    main()
