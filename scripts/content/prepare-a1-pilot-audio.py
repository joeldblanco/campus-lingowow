#!/usr/bin/env python3
"""Build the provisional synthetic A1 module 1 pilot audio set.

The source curriculum is read from the original early.json file.  This script
does not touch the existing course audio directory: it only writes the new
``public/audio/a1-module1-pilot`` directory and its companion manifest.

The command uses the locally cached Kokoro-82M ONNX model directly.  Install
the runtime in an isolated environment first, for example::

    C:/tmp/Lingowow/a1-module1-pilot/audio-venv/Scripts/python.exe -m pip install kokoro-onnx soundfile

Then run this file with that Python interpreter.  ``ffmpeg`` is used only to
encode the final MP3 files; temporary WAV files are removed after encoding.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = Path("C:/tmp/Lingowow/programa-completo-c2/early.json")
DEFAULT_OUTPUT = REPO_ROOT / "public" / "audio" / "a1-module1-pilot"
DEFAULT_MANIFEST = REPO_ROOT / "docs" / "curriculum" / "a1-module1-audio-manifest.json"
DEFAULT_TTS_CACHE = Path.home() / ".cache" / "hyperframes" / "tts"
SAMPLE_RATE = 24_000


@dataclass(frozen=True)
class Segment:
    """One spoken segment, retaining the voice used for a dialogue turn."""

    speaker: str
    voice: str
    text: str


@dataclass(frozen=True)
class AssetSpec:
    asset_id: str
    filename: str
    kind: str
    source_ref: str
    source_text: str
    spoken_text: str
    segments: tuple[Segment, ...]
    tags: tuple[str, ...] = ()
    source_notes: tuple[str, ...] = ()
    speed: float = 0.82


def _find_by_id(items: Iterable[dict[str, Any]], item_id: Any) -> dict[str, Any]:
    for item in items:
        if item.get("id") == item_id:
            return item
    raise KeyError(f"Could not find id {item_id!r}")


def _load_source(path: Path) -> tuple[dict[str, Any], dict[int, dict[str, Any]], dict[str, dict[str, Any]]]:
    if not path.is_file():
        raise FileNotFoundError(f"Curriculum source not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    starter = data["starter"]
    module = _find_by_id(data["modules"], 1)
    units = {int(unit["id"]): unit for unit in module["units"]}
    activities = {str(activity["id"]): activity for activity in starter["activities"]}
    return starter, units, activities


def _segment(speaker: str, voice: str, text: str) -> Segment:
    return Segment(speaker=speaker, voice=voice, text=text)


def build_specs(source_path: Path) -> list[AssetSpec]:
    starter, units, activities = _load_source(source_path)
    narrator = "af_nova"
    female = "af_nova"
    male = "am_adam"

    u1 = units[1]["model"]["text"]
    u2 = units[2]["model"]["text"]
    u3 = units[3]["model"]["text"]
    u4 = units[4]["model"]["text"]

    # The narrative framing is retained in every unit model so that the
    # original comprehension evidence (especially where/when questions) stays
    # audible.  Quoted turns receive a second synthetic voice where practical.
    unit_specs = [
        AssetSpec(
            asset_id="a1-m01-u01-model",
            filename="u1-model.mp3",
            kind="unit-model",
            source_ref="modules[id=1].units[id=1].model.text",
            source_text=u1,
            spoken_text=(
                "Ana meets Luis at the door of an evening class. Ana says, "
                "Hi, I’m Ana. What’s your name? Luis answers, I’m Luis. Nice to meet you. "
                "Ana says, Nice to meet you too. I’m from Peru, and I live in Lima. "
                "Luis replies, I’m from Chile. See you in class."
            ),
            segments=(
                _segment("narrator", narrator, "Ana meets Luis at the door of an evening class."),
                _segment("narrator", narrator, "Ana says,"),
                _segment("Ana", female, "Hi, I’m Ana. What’s your name?"),
                _segment("narrator", narrator, "Luis answers,"),
                _segment("Luis", male, "I’m Luis. Nice to meet you."),
                _segment("narrator", narrator, "Ana says,"),
                _segment("Ana", female, "Nice to meet you too. I’m from Peru, and I live in Lima."),
                _segment("narrator", narrator, "Luis replies,"),
                _segment("Luis", male, "I’m from Chile. See you in class."),
            ),
            tags=("dialogue", "greeting", "name", "origin", "city"),
            source_notes=("Narrative framing is spoken by the narrator; quoted turns use two synthetic voices.",),
        ),
        AssetSpec(
            asset_id="a1-m01-u02-model",
            filename="u2-model.mp3",
            kind="unit-model",
            source_ref="modules[id=1].units[id=2].model.text",
            source_text=u2,
            spoken_text=(
                "At the community desk, Rosa points to a photo. Rosa says, This is my colleague Diego. "
                "Omar asks, Who is the woman beside him? Rosa answers, That is our manager, Elena. "
                "The blue folder is hers, and the red folder is mine. Omar points to a badge and asks, "
                "Is this your badge? Rosa says, Yes, it is."
            ),
            segments=(
                _segment("narrator", narrator, "At the community desk, Rosa points to a photo."),
                _segment("Rosa", female, "This is my colleague Diego."),
                _segment("narrator", narrator, "Omar asks,"),
                _segment("Omar", male, "Who is the woman beside him?"),
                _segment("narrator", narrator, "Rosa answers,"),
                _segment("Rosa", female, "That is our manager, Elena. The blue folder is hers, and the red folder is mine."),
                _segment("narrator", narrator, "Omar points to a badge and asks,"),
                _segment("Omar", male, "Is this your badge?"),
                _segment("narrator", narrator, "Rosa says,"),
                _segment("Rosa", female, "Yes, it is."),
            ),
            tags=("dialogue", "people", "objects", "belonging"),
            source_notes=("Narrative framing and speaker attribution are retained; quoted turns use two synthetic voices.",),
        ),
        AssetSpec(
            asset_id="a1-m01-u03-model",
            filename="u3-model.mp3",
            kind="unit-model",
            source_ref="modules[id=1].units[id=3].model.text",
            source_text=u3,
            spoken_text=(
                "After class, Elena gives her contact to Marco. Elena says, My phone number is five five five, "
                "zero one four two, and my email is elena dot ramos at example dot org. Marco asks, "
                "When are you free? Elena says, I’m free on Tuesday at six, or Saturday morning. Marco replies, "
                "Tuesday at six works for me. I’ll send a message. They write the details on a small card."
            ),
            segments=(
                _segment("narrator", narrator, "After class, Elena gives her contact to Marco."),
                _segment("narrator", narrator, "Elena says,"),
                _segment("Elena", female, "My phone number is five five five, zero one four two, and my email is elena dot ramos at example dot org."),
                _segment("narrator", narrator, "Marco asks,"),
                _segment("Marco", male, "When are you free?"),
                _segment("narrator", narrator, "Elena says,"),
                _segment("Elena", female, "I’m free on Tuesday at six, or Saturday morning."),
                _segment("narrator", narrator, "Marco replies,"),
                _segment("Marco", male, "Tuesday at six works for me. I’ll send a message."),
                _segment("narrator", narrator, "They write the details on a small card."),
            ),
            tags=("dialogue", "phone", "email", "days", "availability"),
            source_notes=(
                "Phone digits and email punctuation are expanded for unambiguous slow speech; facts are unchanged.",
                "The source model text remains available verbatim in sourceText.",
            ),
        ),
        AssetSpec(
            asset_id="a1-m01-u04-model",
            filename="u4-model.mp3",
            kind="unit-model",
            source_ref="modules[id=1].units[id=4].model.text",
            source_text=u4,
            spoken_text=(
                "During an orientation, Paula says, The appointment is on Thursday at three thirty. "
                "Tom does not understand. He says, Sorry, could you repeat that, please? Paula repeats, "
                "Thursday at three thirty. Tom asks, Do you mean this Thursday? Paula answers, Yes, this Thursday. "
                "The room is two oh four. Tom repeats the room number to check it."
            ),
            segments=(
                _segment("narrator", narrator, "During an orientation, Paula says,"),
                _segment("Paula", female, "The appointment is on Thursday at three thirty."),
                _segment("narrator", narrator, "Tom does not understand. He says,"),
                _segment("Tom", male, "Sorry, could you repeat that, please?"),
                _segment("narrator", narrator, "Paula repeats,"),
                _segment("Paula", female, "Thursday at three thirty."),
                _segment("narrator", narrator, "Tom asks,"),
                _segment("Tom", male, "Do you mean this Thursday?"),
                _segment("narrator", narrator, "Paula answers,"),
                _segment("Paula", female, "Yes, this Thursday. The room is two oh four."),
                _segment("narrator", narrator, "Tom repeats the room number to check it."),
            ),
            tags=("dialogue", "repair", "date", "time", "room"),
            source_notes=(
                "Times and room digits are expanded for unambiguous slow speech; facts are unchanged.",
                "The source model text remains available verbatim in sourceText.",
            ),
        ),
    ]

    s1 = activities["S1"]
    s2 = activities["S2"]
    s3 = activities["S3"]
    s4 = activities["S4"]
    s5 = activities["S5"]
    s1_text = s1["input"]["english"]
    s4_text = s4["input"]["english"]
    s5_text = s5["input"]["teacher_read_script"]

    # Starter clips are intentionally small and reusable.  The alphabet clip
    # uses letter names and the US "zee" pronunciation requested for this pilot.
    alphabet_text = "A. B. C. D. E. F. G. H. I. J. K. L. M. N. O. P. Q. R. S. T. U. V. W. X. Y. Z, zee. A. N. A. T. O. R. R. E. S."
    numbers_text = (
        "Zero, one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve, "
        "thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty."
    )
    contact_text = (
        "My phone number is five five five, zero one four two. The class is at six p.m. "
        "in room two oh four. The morning session is at eight thirty a.m."
    )
    help_text = (
        "Sorry, could you repeat that, please? I don’t understand. Do you mean this Thursday? "
        "Yes, this Thursday. The room is two oh four."
    )
    starter_specs = [
        AssetSpec(
            asset_id="a1-m01-s01-greeting",
            filename="starter-s1-greeting.mp3",
            kind="starter-reference",
            source_ref="starter.activities[id=S1].input.english",
            source_text=s1_text,
            spoken_text=s1_text,
            segments=(_segment("narrator", narrator, s1_text),),
            tags=("S1", "greeting", "name"),
            speed=0.80,
        ),
        AssetSpec(
            asset_id="a1-m01-s02-alphabet",
            filename="starter-s2-alphabet.mp3",
            kind="starter-reference",
            source_ref="starter.activities[id=S2].input.alphabet",
            source_text=s2["input"]["teacher_read_script"],
            spoken_text=alphabet_text,
            segments=(_segment("narrator", narrator, alphabet_text),),
            tags=("S2", "alphabet", "spelling", "zee"),
            source_notes=("IPA spellings and the UK variant are omitted from the spoken clip; US zee is used.",),
            speed=0.76,
        ),
        AssetSpec(
            asset_id="a1-m01-s03-numbers-0-20",
            filename="starter-s3-numbers-0-20.mp3",
            kind="starter-reference",
            source_ref="starter.activities[id=S3].input.number_table",
            source_text=s3["input"]["teacher_read_script"],
            spoken_text=numbers_text,
            segments=(_segment("narrator", narrator, numbers_text),),
            tags=("S3", "numbers", "0-20"),
            source_notes=("This reusable clip isolates the 0–20 sequence from the longer source reading.",),
            speed=0.76,
        ),
        AssetSpec(
            asset_id="a1-m01-s03-contact-time",
            filename="starter-s3-contact-time.mp3",
            kind="starter-reference",
            source_ref="starter.activities[id=S3].model_answer",
            source_text=s3["model_answer"],
            spoken_text=contact_text,
            segments=(_segment("narrator", narrator, contact_text),),
            tags=("S3", "phone", "time", "room", "18:00", "8:30", "204"),
            source_notes=("Digits and times are expanded for clear listening while retaining the source facts.",),
            speed=0.80,
        ),
        AssetSpec(
            asset_id="a1-m01-u04-help-phrases",
            filename="starter-u4-help-phrases.mp3",
            kind="starter-reference",
            source_ref="modules[id=1].units[id=4].language",
            source_text=" ".join(units[4]["language"]),
            spoken_text=help_text,
            segments=(_segment("narrator", narrator, help_text),),
            tags=("U4", "help", "repair", "clarification"),
            source_notes=("Reusable support phrases include the model's repeat/understand/mean/room language.",),
            speed=0.80,
        ),
        AssetSpec(
            asset_id="a1-m01-s04-listening",
            filename="starter-s4-listening.mp3",
            kind="starter-reference",
            source_ref="starter.activities[id=S4].input.english",
            source_text=s4_text,
            spoken_text=s4_text,
            segments=(_segment("narrator", narrator, s4_text),),
            tags=("S4", "country", "city", "listening"),
            speed=0.80,
        ),
        AssetSpec(
            asset_id="a1-m01-s05-bridge",
            filename="starter-s5-bridge.mp3",
            kind="starter-reference",
            source_ref="starter.activities[id=S5].input.teacher_read_script",
            source_text=s5_text,
            spoken_text=(
                "Hi, I’m Ana. I’m from Peru. See you on Tuesday at six in room two oh four."
            ),
            segments=(_segment("narrator", narrator, "Hi, I’m Ana. I’m from Peru. See you on Tuesday at six in room two oh four."),),
            tags=("S5", "bridge", "name", "origin", "day", "time", "room"),
            source_notes=("Room 204 is expanded as two oh four for the reusable spoken reference.",),
            speed=0.80,
        ),
    ]
    return unit_specs + starter_specs


def _retry_create(model: Any, text: str, voice: str, speed: float) -> tuple[Any, int]:
    """Create one segment and split only if Kokoro hits its token limit."""
    import re

    try:
        return model.create(
            text,
            voice=voice,
            speed=speed,
            lang="en-us",
            sentence_pause=0.22,
            clause_pause=0.10,
        )
    except IndexError as error:
        if not re.search(r"index \d+ is out of bounds for axis 0 with size 510", str(error), re.I) or len(text) < 2:
            raise
        midpoint = len(text) // 2
        boundaries = [
            index + 1
            for index, char in enumerate(text)
            if (char in ".!?" or char.isspace()) and 0 < index < len(text) - 1
        ]
        split_at = min(boundaries, key=lambda index: abs(index - midpoint)) if boundaries else midpoint
        left, right = text[:split_at], text[split_at:]
        left_audio, left_rate = _retry_create(model, left, voice, speed)
        right_audio, right_rate = _retry_create(model, right, voice, speed)
        if left_rate != right_rate:
            raise RuntimeError("Kokoro returned inconsistent sample rates after a split")
        import numpy as np

        return np.concatenate((left_audio, right_audio)), left_rate


def _synthesize(spec: AssetSpec, model: Any) -> tuple[Any, int, list[dict[str, Any]]]:
    import numpy as np

    parts: list[Any] = []
    segment_meta: list[dict[str, Any]] = []
    sample_rate: int | None = None
    for segment in spec.segments:
        audio, rate = _retry_create(model, segment.text, segment.voice, spec.speed)
        if sample_rate is None:
            sample_rate = rate
        if rate != sample_rate:
            raise RuntimeError(f"Sample-rate mismatch in {spec.asset_id}: {rate} != {sample_rate}")
        parts.append(audio.astype(np.float32, copy=False))
        parts.append(np.zeros(int(rate * 0.16), dtype=np.float32))
        segment_meta.append(
            {"speaker": segment.speaker, "voice": segment.voice, "text": segment.text}
        )
    if not parts or sample_rate is None:
        raise RuntimeError(f"No audio segments were generated for {spec.asset_id}")
    return np.concatenate(parts), sample_rate, segment_meta


def _encode_mp3(wav_path: Path, mp3_path: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to encode the pilot MP3 files")
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav_path),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(mp3_path),
        ],
        check=True,
    )


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_revision() -> str | None:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return completed.stdout.strip() or None


def _resolve_tts_paths(cache: Path) -> tuple[Path, Path]:
    model_path = cache / "models" / "kokoro-v1.0.onnx"
    voices_path = cache / "voices" / "voices-v1.0.bin"
    if not model_path.is_file() or not voices_path.is_file():
        raise FileNotFoundError(
            "Kokoro model cache is incomplete. Run `npx hyperframes tts --list` or a smoke "
            "generation once, then retry. Expected model and voice files under "
            f"{cache}."
        )
    return model_path, voices_path


def _asset_record(
    spec: AssetSpec,
    output_path: Path,
    source_path: Path,
    duration: float,
    sample_rate: int,
    channels: int,
    peak: float,
    segment_meta: list[dict[str, Any]],
) -> dict[str, Any]:
    relative = output_path.relative_to(REPO_ROOT).as_posix()
    return {
        "id": spec.asset_id,
        "kind": spec.kind,
        "module": "A1-M01",
        "file": relative,
        "url": "/" + relative.removeprefix("public/"),
        "mimeType": "audio/mpeg",
        "format": "mp3",
        "language": "en-US",
        "translationApplied": False,
        "synthetic": True,
        "humanRecording": False,
        "voice": "Kokoro-82M synthetic voices: " + ", ".join(sorted({item["voice"] for item in segment_meta})),
        "speed": spec.speed,
        "sourceRef": spec.source_ref,
        "sourceText": spec.source_text,
        "spokenText": spec.spoken_text,
        "transcript": spec.spoken_text,
        "segments": segment_meta,
        "tags": list(spec.tags),
        "sourceNotes": list(spec.source_notes),
        "durationSeconds": round(duration, 3),
        "sampleRateHz": sample_rate,
        "channels": channels,
        "peakAmplitude": round(peak, 6),
        "bytes": output_path.stat().st_size,
        "sha256": _sha256(output_path),
        "license": {
            "audio": "Generated locally with Kokoro-82M (Apache-2.0 model/runtime); provisional synthetic pilot asset.",
            "sourceText": "Original Lingowow curriculum text; see sourceRef and source paths.",
            "distribution": "Repository pilot only; do not present as a human recording or final authorized audio.",
        },
        "provenance": {
            "sourcePath": str(source_path),
            "generator": "Kokoro-82M via kokoro-onnx",
            "modelCache": str(DEFAULT_TTS_CACHE),
            "preparedBy": "scripts/content/prepare-a1-pilot-audio.py",
        },
    }


def prepare(
    source_path: Path,
    output_dir: Path,
    manifest_path: Path,
    cache_dir: Path,
    force: bool,
) -> dict[str, Any]:
    # Import only after validating the isolated environment.  This keeps a
    # helpful error when the caller accidentally uses the bundled Python.
    try:
        import numpy as np
        import soundfile as sf
        from kokoro_onnx import Kokoro
    except ImportError as error:
        raise RuntimeError(
            "kokoro-onnx, numpy and soundfile are required in the isolated audio venv. "
            "Install with `python -m pip install kokoro-onnx soundfile`."
        ) from error

    if output_dir.resolve() == (REPO_ROOT / "public" / "audio" / "lessons" / "course").resolve():
        raise RuntimeError("Refusing to write into the existing public/audio/lessons/course directory")
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    model_path, voices_path = _resolve_tts_paths(cache_dir)
    model = Kokoro(str(model_path), str(voices_path))
    specs = build_specs(source_path)
    records: list[dict[str, Any]] = []
    generated: list[str] = []

    with tempfile.TemporaryDirectory(prefix="a1-pilot-audio-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        for spec in specs:
            output_path = output_dir / spec.filename
            if output_path.exists() and not force:
                raise FileExistsError(
                    f"Refusing to overwrite existing pilot asset {output_path}; use --force only for this new pilot directory"
                )
            audio, sample_rate, segment_meta = _synthesize(spec, model)
            wav_path = temp_dir / f"{spec.asset_id}.wav"
            sf.write(wav_path, audio, sample_rate, subtype="PCM_16")
            _encode_mp3(wav_path, output_path)
            peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
            duration = len(audio) / sample_rate
            records.append(
                _asset_record(
                    spec,
                    output_path,
                    source_path,
                    duration,
                    sample_rate,
                    1,
                    peak,
                    segment_meta,
                )
            )
            generated.append(spec.filename)

    # Keep the tracked manifest deliberately small because the content seed
    # consumes this exact shape.  Durations, per-segment voices, model/runtime
    # provenance, licensing and roundtrip evidence belong in the external QA
    # report (C:/tmp/Lingowow/a1-module1-pilot/audio-qa.md).
    manifest = {
        "files": [
            {
                "path": record["file"],
                "sha256": record["sha256"],
                "sourceEnglishTranscript": record["spokenText"],
            }
            for record in records
        ]
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Original early.json source")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT, help="New pilot audio directory")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST, help="Manifest JSON path")
    parser.add_argument("--tts-cache", type=Path, default=DEFAULT_TTS_CACHE, help="HyperFrames Kokoro cache")
    parser.add_argument("--force", action="store_true", help="Overwrite files only within the new pilot directory")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        manifest = prepare(
            args.source,
            args.output_dir,
            args.manifest,
            args.tts_cache,
            args.force,
        )
    except Exception as error:  # pragma: no cover - CLI diagnostics
        print(f"prepare-a1-pilot-audio: {error}", file=sys.stderr)
        return 1
    print(f"Generated {len(manifest['files'])} pilot audio assets")
    print(f"Manifest: {args.manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
