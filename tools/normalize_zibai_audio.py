"""Boost quiet Zibai clips from untouched originals, without compression or speed changes."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def prepare(ffmpeg):
    path = ROOT / 'audio/zibai/originals/zibai-sources.json'
    manifest = json.loads(path.read_text(encoding='utf8'))

    def run(source, filters, output=None):
        args = [ffmpeg, '-y', '-hide_banner', '-i', str(source), '-af', ','.join(filters)]
        args += ['-c:a', 'libmp3lame', '-q:a', '2', str(output)] if output else ['-f', 'null', '-']
        return subprocess.run(args, check=True, capture_output=True, text=True, encoding='utf8', errors='replace').stderr

    def measure(source, filters):
        log = run(source, filters + ['volumedetect'])
        return {key: float(re.search(key + r'_volume: (-?[\d.]+)', log).group(1)) for key in ['mean', 'max']}

    for name, clip in manifest['clips'].items():
        source, output = ROOT / clip['original'], ROOT / clip['output']
        original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        trim = clip['trim_seconds']
        filters = [f'atrim=start={trim[0]}:end={trim[1]}', 'asetpts=PTS-STARTPTS'] if trim else ['anull']
        before = measure(source, filters)
        # Static gain preserves the performance's dynamics; leave codec headroom.
        gain = round(max(0, min(8, -19.5 - before['mean'], -2 - before['max'])), 2)
        if gain or trim:
            run(source, filters + [f'volume={gain}dB'], output)
        else:
            shutil.copyfile(source, output)
        after = measure(output, ['anull'])
        if gain and after['max'] > -1:
            gain = round(max(0, gain - after['max'] - 1.2), 2)
            run(source, filters + [f'volume={gain}dB'], output)
            after = measure(output, ['anull'])
        if gain:
            assert after['max'] <= -1, (name, after)
        assert hashlib.sha256(source.read_bytes()).hexdigest() == original_hash
        clip.update(output_bytes=output.stat().st_size, sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                    volume={'gain_db': gain, 'before_mean_dbfs': before['mean'], 'before_peak_dbfs': before['max'],
                            'after_mean_dbfs': after['mean'], 'after_peak_dbfs': after['max'],
                            'method': 'static gain; no compression, normalization of dynamics, or speed change'})
        print(name, f'+{gain}dB', before, '=>', after)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    catalog_path = ROOT / 'audio/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    for entry in catalog:
        if entry['path'].startswith('audio/zibai/skill/'):
            data = (ROOT / entry['path']).read_bytes()
            entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True)
    prepare(parser.parse_args().ffmpeg)
