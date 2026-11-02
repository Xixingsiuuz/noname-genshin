"""Measure each source, apply only static gain, verify encoded true peak and catalog."""
from pathlib import Path
import argparse, json, statistics, hashlib
from normalize_itto_audio import measure, run

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True)
    args = parser.parse_args()
    path = ROOT / 'audio/ajax/originals/ajax-sources.json'
    manifest = json.loads(path.read_text(encoding='utf8'))
    refs = [dict(path=p.relative_to(ROOT).as_posix(), **measure(args.ffmpeg, p))
        for folder in ['skill', 'die'] for p in sorted((ROOT / 'audio/eula' / folder).glob('*.mp3'))]
    target = round(statistics.median(row['lufs'] for row in refs), 2)
    rows = []
    for name, clip in manifest['clips'].items():
        source, output = ROOT / clip['original'], ROOT / clip['output']
        if output.exists():
            assert hashlib.sha256(output.read_bytes()).hexdigest() == clip['sha256']
            rows.append(clip['volume'])
            continue
        # First run only; reruns never replace calibrated playback files.
        before = measure(args.ffmpeg, source)
        gain = round(min(target - before['lufs'], -1.5 - before['true_peak_dbtp']), 2)
        expected_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        temp = output.with_name(output.stem + '.calibrating.mp3')
        if output.exists():
            raise RuntimeError(f'Playback already processed; preserve/recycle it before replacing: {output}')
        for attempt in range(3):
            run(args.ffmpeg, ['-y', '-i', str(source), '-af', f'volume={gain}dB',
                '-c:a', 'libmp3lame', '-q:a', '2', str(temp)])
            after = measure(args.ffmpeg, temp)
            if after['true_peak_dbtp'] <= -1: break
            gain = round(gain - after['true_peak_dbtp'] - 1.5, 2)
        assert after['true_peak_dbtp'] <= -1
        assert hashlib.sha256(source.read_bytes()).hexdigest() == expected_hash
        # The untouched source stays in originals; publish the verified new playback file.
        temp.replace(output)
        row = dict(id=name, text=clip['text'], gain_db=gain, before=before, after=after)
        clip.update(volume=row, output_bytes=output.stat().st_size,
            sha256=hashlib.sha256(output.read_bytes()).hexdigest())
        rows.append(row)
    report = dict(target_lufs=target, references=refs, clips=rows,
        method='Per-source static gain only; no trim, speed change or synthesis; encoded true peak <= -1 dBTP.',
        limitations='No manual listening, native UI or live match validation.')
    manifest['loudness_reference'] = {k: v for k, v in report.items() if k != 'clips'}
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    (path.parent / 'ajax-volume-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    catalog_path = ROOT / 'audio/catalog.json'
    catalog = [entry for entry in json.loads(catalog_path.read_text(encoding='utf8')) if entry.get('role') != 'ajax']
    for clip in manifest['clips'].values():
        catalog.append(dict(role='ajax', path=clip['output'], bytes=clip['output_bytes'], sha256=clip['sha256']))
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
