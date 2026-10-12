"""Generate new, short pronunciation assets without replacing pilot recordings."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from a1_starter_teaching import starter_audio_specs
from a1_unit_teaching import unit_audio_specs

ROOT = Path(__file__).resolve().parents[2]
LETTER_PHONEMES = {'A': 'eɪ', 'N': 'ɛn', 'T': 'tiː', 'O': 'oʊ', 'R': 'ɑːɹ', 'E': 'iː', 'S': 'ɛs', 'J': 'dʒeɪ', 'X': 'ɛks', 'Y': 'waɪ', 'Z': 'ziː', 'L': 'ɛl', 'U': 'juː', 'I': 'aɪ', 'V': 'viː', 'G': 'dʒiː'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg: raise SystemExit('ffmpeg required')
    baseline = json.loads(args.baseline.read_text(encoding='utf-8-sig'))
    for entry in baseline['files']:
        if hashlib.sha256((ROOT / entry['path']).read_bytes()).hexdigest() != entry['sha256']:
            raise SystemExit('Original audio hash mismatch')
    model = Kokoro(str(args.cache / 'models/kokoro-v1.0.onnx'), str(args.cache / 'voices/voices-v1.0.bin'))
    specs = starter_audio_specs() + unit_audio_specs()
    report = json.loads(args.report.read_text(encoding='utf-8-sig')) if args.report.exists() else {'files': []}
    known = {entry['filename']: entry for entry in report['files']}
    manifest_path = ROOT / 'docs/curriculum/a1-module1-audio-manifest.json'
    cached_manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig')) if manifest_path.exists() else {'files': []}
    cached_entries = {Path(entry['path']).name: entry for entry in cached_manifest['files']}
    records = []
    with tempfile.TemporaryDirectory(prefix='a1-teaching-audio-') as temp:
        for item in specs:
            name = item['filename']
            letter = re.search(r'The letter ([A-Z])\.', item['text'])
            spoken_text = letter.group(1) if letter else item['text']
            if not re.fullmatch(r'teach-[a-z0-9-]+-v2\.mp3', name): raise ValueError('Unexpected asset namespace')
            target = ROOT / 'public/audio/a1-module1-pilot' / name
            if target.exists():
                record = known.get(name)
                if not record:
                    entry = cached_entries.get(name)
                    if entry and entry['sourceEnglishTranscript'] in (item['text'], spoken_text) and entry['sha256'] == hashlib.sha256(target.read_bytes()).hexdigest():
                        probe = subprocess.run([shutil.which('ffprobe') or 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(target)], capture_output=True, check=True)
                        record = {**item, 'sha256': entry['sha256'], 'durationSeconds': float(json.loads(probe.stdout)['format']['duration']), 'synthetic': True, 'voice': 'af_heart', 'speed': .85, 'recoveredFromVerifiedManifest': True}
                if not record or record['text'] != item['text'] or record['sha256'] != hashlib.sha256(target.read_bytes()).hexdigest():
                    raise ValueError('Refusing to overwrite an existing asset: ' + name)
                record['spokenText'] = spoken_text
                records.append(record)
                continue
            phonemes = LETTER_PHONEMES.get(letter.group(1)) if letter else item.get('phonemes')
            samples, rate = model.create(phonemes or item['text'], 'af_heart', speed=0.85, lang='en-us', is_phonemes=bool(phonemes))
            peak = float(np.max(np.abs(samples))) if len(samples) else 0
            duration = len(samples) / rate
            if duration < .12 or peak < .01 or peak > 1: raise ValueError('Invalid speech signal: ' + name)
            # A short margin makes isolated sounds less abrupt.
            samples = np.concatenate([np.zeros(int(rate*.12)), samples, np.zeros(int(rate*.2))])
            wav = Path(temp) / 'clip.wav'
            sf.write(wav, samples, rate)
            subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '128k', str(target)], check=True)
            record = {**item, 'spokenText': spoken_text, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'durationSeconds': round(duration + .32, 3), 'peak': round(peak, 5), 'synthetic': True, 'voice': 'af_heart', 'speed': .85}
            records.append(record)
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps({'files': records}, ensure_ascii=False, indent=2), encoding='utf-8')
            print('generated ' + name, flush=True)
    args.report.write_text(json.dumps({'files': records}, ensure_ascii=False, indent=2), encoding='utf-8')
    baseline['files'].extend({'path': 'public/audio/a1-module1-pilot/' + row['filename'], 'sha256': row['sha256'], 'sourceEnglishTranscript': row['spokenText']} for row in records)
    (ROOT / 'docs/curriculum/a1-module1-audio-manifest.json').write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'preserved {len(baseline["files"])-len(records)} original assets; added {len(records)}')

if __name__ == '__main__': main()
