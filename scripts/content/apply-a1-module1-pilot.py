"""Safely seed the isolated A1 Module 1 pilot in DEV only.

The public plan contains only course/module/lesson/runtime-block data. The
creator, student, and academic-period identities are supplied separately from a
private file at execution time. The generated SQL is an insert-only,
transactional rollback rehearsal by default; it never updates or deletes
existing rows.
"""

from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from typing import Any, Mapping, Sequence


COURSE_ID = "a1-general-module1-pilot"
MODULE_ID = "a1-general-module1"
LESSON_IDS = (
    "a1-general-start",
    "a1-general-u1",
    "a1-general-u2",
    "a1-general-u3",
    "a1-general-u4",
    "a1-general-mission",
)
ENROLLMENT_ID = "a1-general-pilot-joel"
# The guided runtime intentionally uses the existing generic production
# revision. The exact course ID is the pilot scope; pilotRevision is optional
# provenance metadata and never a global runtime gate.
REVISION = "course-guided-v1"
PILOT_REVISION = "a1-module1-pilot-v1"
SERVER = "root@137.184.8.53"
APP_CONTAINER = "wnzn19ljdvtk84yzz4j3orj1"
DEV_DATABASE_NAME = "lingowow_dev"
DEV_DATABASE_USER = "lingowow_dev"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
AUDIO_ROOT = PROJECT_ROOT / "public" / "audio" / "a1-module1-pilot"
AUDIO_PUBLIC_PREFIX = "public/audio/a1-module1-pilot/"
AUDIO_URL_PREFIX = "/audio/a1-module1-pilot/"

_SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,127}$")
_AUDIO_SUFFIX = re.compile(r"\.(?:mp3|wav|m4a|ogg|aac|flac|webm)(?:$|[?#])", re.IGNORECASE)
_FORBIDDEN_AUDIO_KEYS = frozenset(
    {
        "audio",
        "audioUrl",
        "audio_url",
        "audioSrc",
        "audio_source",
        "audioSource",
        "recordingUrl",
        "recording_url",
    }
)

# These are the runtime block names declared by src/types/course-builder.ts.
# Audio is known to the application but deliberately rejected for this source:
# early.json marks every authentic-audio resource pending approval.
KNOWN_BLOCK_TYPES = frozenset(
    {
        "text",
        "video",
        "image",
        "audio",
        "quiz",
        "assignment",
        "file",
        "embed",
        "tab_group",
        "tab_item",
        "layout",
        "column",
        "container",
        "grammar",
        "vocabulary",
        "title",
        "fill_blanks",
        "match",
        "true_false",
        "essay",
        "recording",
        "structured-content",
        "grammar-visualizer",
        "multiple_choice",
        "short_answer",
        "ordering",
        "drag_drop",
        "multi_select",
        "teacher_notes",
        "block_group",
    }
)
APPROVED_SCENES = frozenset(
    f"/images/lessons/backgrounds/{name}.webp"
    for name in (
        "airport-lounge",
        "art-studio",
        "bakery",
        "botanical-office",
        "campus",
        "city-directions",
        "community-bookshop",
        "daily-kitchen",
        "family-living-room",
        "flower-courtyard",
        "garden",
        "harbor-promenade",
        "lakeside-reading-terrace",
        "library",
        "listening-lounge",
        "market",
        "mountain-cabin",
        "museum-gallery",
        "music-room",
        "restaurant",
        "science-lab",
        "seaside",
        "town-park",
        "travel-station",
        "village-square",
        "workshop",
    )
)
_PLAN_KEYS = frozenset({"course", "module", "lessons"})
_COURSE_REQUIRED_KEYS = frozenset({"id", "title", "description", "language", "level"})
_COURSE_ALLOWED_KEYS = _COURSE_REQUIRED_KEYS | {"image"}
_MODULE_KEYS = frozenset({"id", "title", "description", "level", "objectives"})
_LESSON_KEYS = frozenset({"id", "title", "description", "order", "blocks"})
_IDENTITY_KEYS = frozenset({"creatorId", "studentId", "academicPeriodId"})
_AUDIO_MANIFEST_KEYS = frozenset({"files"})
_AUDIO_ENTRY_KEYS = frozenset({"path", "sha256", "sourceEnglishTranscript"})


class PlanError(ValueError):
    """Raised when a public plan or private identity file fails validation."""


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _require_keys(value: Mapping[str, Any], expected: frozenset[str], label: str) -> None:
    actual = set(value)
    missing = sorted(expected - actual)
    unexpected = sorted(actual - expected)
    if missing or unexpected:
        detail: list[str] = []
        if missing:
            detail.append(f"missing {', '.join(missing)}")
        if unexpected:
            detail.append(f"unexpected {', '.join(unexpected)}")
        raise PlanError(f"{label} has invalid fields: {'; '.join(detail)}")


def _validate_id(value: Any, label: str) -> str:
    if not isinstance(value, str) or not _SAFE_ID.fullmatch(value):
        raise PlanError(f"{label} must be a lowercase safe identifier")
    return value


def _validate_text(value: Any, label: str, *, nullable: bool = False) -> str | None:
    if nullable and value is None:
        return None
    if not isinstance(value, str):
        raise PlanError(f"{label} must be a string")
    return value


def _audio_public_path(value: Any, label: str) -> str:
    """Normalize one manifest or runtime reference to the local public path."""

    if not isinstance(value, str) or not value:
        raise PlanError(f"{label} must be a local audio path")
    if value.startswith(AUDIO_URL_PREFIX):
        path = "public" + value
    elif value.startswith(AUDIO_PUBLIC_PREFIX):
        path = value
    else:
        raise PlanError(f"{label} must stay under {AUDIO_PUBLIC_PREFIX}")
    if "\\" in path or "//" in path:
        raise PlanError(f"{label} contains an unsafe path")
    pure = PurePosixPath(path)
    if pure.as_posix() != path or any(part in {".", ".."} for part in pure.parts):
        raise PlanError(f"{label} contains path traversal")
    if len(pure.parts) != 4 or pure.parts[:3] != ("public", "audio", "a1-module1-pilot"):
        raise PlanError(f"{label} must name a file directly under the pilot audio directory")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_.-]*\.mp3", pure.name):
        raise PlanError(f"{label} must be a lowercase .mp3 asset name")
    return path


def validate_audio_manifest(manifest: Any) -> dict[str, dict[str, str]]:
    """Verify a new-only local synthetic-audio manifest and every file hash."""

    if not isinstance(manifest, dict):
        raise PlanError("audio manifest must be an object")
    _require_keys(manifest, _AUDIO_MANIFEST_KEYS, "audio manifest")
    files = manifest["files"]
    if not isinstance(files, list) or not files:
        raise PlanError("audio manifest must contain a non-empty files array")

    entries: dict[str, dict[str, str]] = {}
    audio_root = AUDIO_ROOT.resolve()
    for index, entry in enumerate(files):
        label = f"audio manifest.files[{index}]"
        if not isinstance(entry, dict):
            raise PlanError(f"{label} must be an object")
        _require_keys(entry, _AUDIO_ENTRY_KEYS, label)
        path = _audio_public_path(entry["path"], f"{label}.path")
        if path in entries:
            raise PlanError(f"duplicate audio manifest path {path}")
        sha256 = entry["sha256"]
        if not isinstance(sha256, str) or not re.fullmatch(r"[0-9a-f]{64}", sha256):
            raise PlanError(f"{label}.sha256 must be a lowercase SHA-256 hex digest")
        transcript = entry["sourceEnglishTranscript"]
        if not isinstance(transcript, str) or not transcript.strip():
            raise PlanError(f"{label}.sourceEnglishTranscript is required")

        asset_path = AUDIO_ROOT / PurePosixPath(path).name
        resolved_asset = asset_path.resolve()
        try:
            resolved_asset.relative_to(audio_root)
        except ValueError as error:
            raise PlanError(f"{label}.path resolves outside the pilot audio directory") from error
        if not resolved_asset.is_file():
            raise PlanError(f"audio asset is missing: {path}")
        actual_sha256 = hashlib.sha256(resolved_asset.read_bytes()).hexdigest()
        if actual_sha256 != sha256:
            raise PlanError(f"audio asset hash mismatch: {path}")
        entries[path] = {
            "path": path,
            "sha256": sha256,
            "sourceEnglishTranscript": transcript,
        }
    return entries


def _iter_audio_references(value: Any) -> list[str]:
    references: list[str] = []
    if isinstance(value, dict):
        for nested in value.values():
            references.extend(_iter_audio_references(nested))
    elif isinstance(value, list):
        for nested in value:
            references.extend(_iter_audio_references(nested))
    elif isinstance(value, str) and _AUDIO_SUFFIX.search(value):
        references.append(value)
    return references


def _walk_media_values(
    value: Any,
    path: str = "block",
    *,
    allowed_audio_paths: frozenset[str] = frozenset(),
) -> None:
    """Reject external, inline, old, or unverified audio references."""

    if isinstance(value, dict):
        for key, nested in value.items():
            if key in _FORBIDDEN_AUDIO_KEYS:
                if not isinstance(nested, str):
                    raise PlanError(f"{path}.{key} is not an approved local audio path")
                normalized = _audio_public_path(nested, f"{path}.{key}")
                if normalized not in allowed_audio_paths:
                    raise PlanError(f"{path}.{key} is not listed in the verified audio manifest")
            _walk_media_values(nested, f"{path}.{key}", allowed_audio_paths=allowed_audio_paths)
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            _walk_media_values(nested, f"{path}[{index}]", allowed_audio_paths=allowed_audio_paths)
    elif isinstance(value, str):
        lowered = value.lower()
        if lowered.startswith("data:audio/") or lowered.startswith("data:application/octet-stream"):
            raise PlanError(f"{path} contains inline embedded audio")
        if _AUDIO_SUFFIX.search(value):
            try:
                normalized = _audio_public_path(value, path)
            except PlanError as error:
                raise PlanError(f"{path} contains an unapproved audio URL") from error
            if normalized not in allowed_audio_paths:
                raise PlanError(f"{path} contains an unapproved audio URL")


def _block_metadata(block: Mapping[str, Any]) -> dict[str, Any]:
    """Match illustrated-lesson metadata resolution for plan validation."""

    metadata: dict[str, Any] = {}
    direct = block.get("data")
    if isinstance(direct, dict):
        metadata.update(direct)
        nested = direct.get("data")
        if isinstance(nested, dict):
            metadata.update(nested)
    for key in (
        "scene",
        "illustratedScene",
        "sceneSide",
        "pilotSceneId",
        "learningRevision",
        "pilotRevision",
    ):
        if key in block:
            metadata[key] = block[key]
    return metadata


def _validate_block(
    block: Any,
    *,
    label: str,
    audio_manifest: Mapping[str, Mapping[str, str]] | None = None,
) -> dict[str, Any]:
    if not isinstance(block, dict):
        raise PlanError(f"{label} must be an object")
    for field in ("id", "type", "order"):
        if field not in block:
            raise PlanError(f"{label} is missing {field}")
    block_id = _validate_id(block["id"], f"{label}.id")
    block_type = block["type"]
    if not isinstance(block_type, str) or block_type not in KNOWN_BLOCK_TYPES:
        raise PlanError(f"{label}.type is not a supported runtime block type")
    audio_paths: frozenset[str] = frozenset()
    if block_type == "audio":
        if audio_manifest is None:
            raise PlanError(f"{label} cannot contain unapproved audio; provide a verified audio manifest")
        references = _iter_audio_references(block)
        if len(references) != 1:
            raise PlanError(f"{label} must reference exactly one verified local audio asset")
        audio_path = _audio_public_path(references[0], f"{label}.audio")
        if audio_path not in audio_manifest:
            raise PlanError(f"{label} audio is missing from the verified audio manifest")
        audio_paths = frozenset({audio_path})
    if not _is_int(block["order"]) or block["order"] < 0:
        raise PlanError(f"{label}.order must be a non-negative integer")
    json.dumps(block, ensure_ascii=False, allow_nan=False)
    _walk_media_values(block, label, allowed_audio_paths=audio_paths)

    metadata = _block_metadata(block)
    scene = metadata.get("scene") or metadata.get("illustratedScene")
    if scene is not None and scene not in APPROVED_SCENES:
        raise PlanError(f"{label} uses an unapproved illustrated scene")
    if metadata.get("sceneSide") is not None and metadata["sceneSide"] not in {"left", "right"}:
        raise PlanError(f"{label}.sceneSide must be left or right")

    if block_type != "teacher_notes":
        if metadata.get("learningRevision") != REVISION:
            raise PlanError(f"{label} must use learningRevision {REVISION}")
        if metadata.get("pilotRevision") is not None and metadata["pilotRevision"] != PILOT_REVISION:
            raise PlanError(f"{label}.pilotRevision must be {PILOT_REVISION} when present")
        pilot_scene_id = metadata.get("pilotSceneId")
        _validate_id(pilot_scene_id, f"{label}.pilotSceneId")
        if scene is None:
            raise PlanError(f"{label} is missing an approved scene")
    return block


def _content_title(block: Mapping[str, Any], lesson_title: str) -> str:
    for key in ("title", "guidedTitle", "label"):
        value = block.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return f"{lesson_title} — {block['type']}"


def _content_rows(plan: Mapping[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for lesson in plan["lessons"]:
        for block in lesson["blocks"]:
            block_id = block["id"]
            if block_id in seen_ids:
                raise PlanError(f"duplicate runtime block id {block_id}")
            seen_ids.add(block_id)
            data = copy.deepcopy(block)
            data.pop("id", None)
            data.pop("order", None)
            rows.append(
                {
                    "id": block_id,
                    "title": _content_title(block, lesson["title"]),
                    "order": block["order"],
                    "lessonId": lesson["id"],
                    "data": data,
                }
            )
    if not rows:
        raise PlanError("the plan must contain at least one content block")
    return rows


def validate_plan(
    plan: Any,
    *,
    audio_manifest: Any = None,
) -> dict[str, Any]:
    """Validate public compiler output and optional verified synthetic audio."""

    audio_entries = validate_audio_manifest(audio_manifest) if audio_manifest is not None else None
    referenced_audio_paths: set[str] = set()

    if not isinstance(plan, dict):
        raise PlanError("public plan must be an object")
    _require_keys(plan, _PLAN_KEYS, "plan")

    course = plan["course"]
    if not isinstance(course, dict):
        raise PlanError("course must be an object")
    course_missing = sorted(_COURSE_REQUIRED_KEYS - set(course))
    course_unexpected = sorted(set(course) - _COURSE_ALLOWED_KEYS)
    if course_missing or course_unexpected:
        detail: list[str] = []
        if course_missing:
            detail.append(f"missing {', '.join(course_missing)}")
        if course_unexpected:
            detail.append(f"unexpected {', '.join(course_unexpected)}")
        raise PlanError(f"course has invalid fields: {'; '.join(detail)}")
    if course["id"] != COURSE_ID:
        raise PlanError(f"course.id must be {COURSE_ID}")
    _validate_id(course["id"], "course.id")
    for field in ("title", "description", "language", "level"):
        _validate_text(course[field], f"course.{field}")
    if course.get("image") is not None:
        _validate_text(course["image"], "course.image")

    module = plan["module"]
    if not isinstance(module, dict):
        raise PlanError("module must be an object")
    _require_keys(module, _MODULE_KEYS, "module")
    if module["id"] != MODULE_ID:
        raise PlanError(f"module.id must be {MODULE_ID}")
    _validate_id(module["id"], "module.id")
    for field in ("title", "description", "level"):
        _validate_text(module[field], f"module.{field}", nullable=field == "description")
    _validate_text(module["objectives"], "module.objectives", nullable=True)

    lessons = plan["lessons"]
    if not isinstance(lessons, list) or len(lessons) != len(LESSON_IDS):
        raise PlanError(f"lessons must contain exactly {len(LESSON_IDS)} lessons")
    seen_lesson_ids: set[str] = set()
    all_ids = {COURSE_ID, MODULE_ID}
    for expected_order, (lesson, expected_id) in enumerate(zip(lessons, LESSON_IDS)):
        label = f"lessons[{expected_order}]"
        if not isinstance(lesson, dict):
            raise PlanError(f"{label} must be an object")
        _require_keys(lesson, _LESSON_KEYS, label)
        if lesson["id"] != expected_id:
            raise PlanError(f"{label}.id must be {expected_id}")
        _validate_id(lesson["id"], f"{label}.id")
        if lesson["id"] in seen_lesson_ids or lesson["id"] in all_ids:
            raise PlanError(f"duplicate lesson identity {lesson['id']}")
        seen_lesson_ids.add(lesson["id"])
        all_ids.add(lesson["id"])
        for field in ("title", "description"):
            _validate_text(lesson[field], f"{label}.{field}")
        if not _is_int(lesson["order"]) or lesson["order"] != expected_order:
            raise PlanError(f"{label}.order must be {expected_order}")
        blocks = lesson["blocks"]
        if not isinstance(blocks, list) or not blocks:
            raise PlanError(f"{label}.blocks must contain at least one block")
        block_ids: set[str] = set()
        scene_ids: set[str] = set()
        for block_order, block in enumerate(blocks):
            validated = _validate_block(
                block,
                label=f"{label}.blocks[{block_order}]",
                audio_manifest=audio_entries,
            )
            if validated["order"] != block_order:
                raise PlanError(f"{label}.blocks[{block_order}].order must be {block_order}")
            block_id = validated["id"]
            if block_id in block_ids or block_id in all_ids:
                raise PlanError(f"duplicate runtime identity {block_id}")
            block_ids.add(block_id)
            all_ids.add(block_id)
            metadata = _block_metadata(validated)
            if validated["type"] != "teacher_notes":
                scene_ids.add(metadata["pilotSceneId"])
            if validated["type"] == "audio":
                referenced_audio_paths.add(
                    _audio_public_path(
                        _iter_audio_references(validated)[0],
                        f"{label}.blocks[{block_order}].audio",
                    )
                )
        if not scene_ids:
            raise PlanError(f"{label} must contain a learner-facing illustrated scene")

    rows = _content_rows(plan)
    if len(rows) != sum(len(lesson["blocks"]) for lesson in lessons):
        raise PlanError("source block count does not match content rows")
    if audio_entries is not None and set(audio_entries) != referenced_audio_paths:
        missing = sorted(referenced_audio_paths - set(audio_entries))
        unused = sorted(set(audio_entries) - referenced_audio_paths)
        detail: list[str] = []
        if missing:
            detail.append(f"missing manifest entries {missing}")
        if unused:
            detail.append(f"unreferenced manifest entries {unused}")
        raise PlanError("audio manifest does not exactly match plan references: " + "; ".join(detail))
    return plan


def validate_identities(identities: Any) -> dict[str, str]:
    """Validate the private identity file without exposing its values."""

    if not isinstance(identities, dict):
        raise PlanError("identities must be an object")
    _require_keys(identities, _IDENTITY_KEYS, "identities")
    result: dict[str, str] = {}
    for key in sorted(_IDENTITY_KEYS):
        result[key] = _validate_id(identities[key], f"identities.{key}")
    if len(set(result.values())) != len(result):
        raise PlanError("creator, student, and academic-period identities must differ")
    return result


def _sql_payload(
    plan: Mapping[str, Any],
    identities: Mapping[str, str],
    *,
    audio_manifest: Any = None,
) -> str:
    checked = validate_plan(plan, audio_manifest=audio_manifest)
    checked_identities = validate_identities(identities)
    rows = _content_rows(checked)
    payload = {
        "course": checked["course"],
        "module": checked["module"],
        "lessons": checked["lessons"],
        "contentRows": rows,
        "identities": checked_identities,
        "enrollmentId": ENROLLMENT_ID,
        "revision": REVISION,
        "pilotRevision": PILOT_REVISION,
    }
    return base64.b64encode(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    ).decode("ascii")


def build_sql(
    plan: Mapping[str, Any],
    identities: Mapping[str, str],
    *,
    apply: bool = False,
    audio_manifest: Any = None,
) -> str:
    """Generate the guarded SQL transaction without opening a database connection."""

    payload = _sql_payload(plan, identities, audio_manifest=audio_manifest)
    finish = "COMMIT;" if apply else "ROLLBACK;"
    return f"""BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtextextended('a1-general-module1-pilot-seed', 0));
CREATE TEMP TABLE a1_module1_seed_plan (payload jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO a1_module1_seed_plan(payload)
VALUES (convert_from(decode('{payload}', 'base64'), 'UTF8')::jsonb);

CREATE TEMP TABLE a1_module1_expected_lessons (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO a1_module1_expected_lessons(id)
SELECT value->>'id'
FROM a1_module1_seed_plan, jsonb_array_elements(payload->'lessons') AS lesson(value);

CREATE TEMP TABLE a1_module1_expected_contents (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO a1_module1_expected_contents(id)
SELECT value->>'id'
FROM a1_module1_seed_plan, jsonb_array_elements(payload->'contentRows') AS content(value);

DO $a1_module1_guard$
DECLARE
  p jsonb;
  course_id text;
  module_id text;
  enrollment_id text;
BEGIN
  SELECT payload INTO p FROM a1_module1_seed_plan;
  course_id := p->'course'->>'id';
  module_id := p->'module'->>'id';
  enrollment_id := p->>'enrollmentId';

  IF current_database() <> 'lingowow_dev' THEN
    RAISE EXCEPTION 'Dev database required';
  END IF;

  IF (SELECT count(*) FROM a1_module1_expected_lessons) <> 6
     OR (SELECT count(*) FROM a1_module1_expected_contents) < 6 THEN
    RAISE EXCEPTION 'Expected seed source counts are invalid';
  END IF;

  IF EXISTS (SELECT 1 FROM courses WHERE id = course_id)
     OR EXISTS (SELECT 1 FROM modules WHERE id = module_id)
     OR EXISTS (SELECT 1 FROM lessons WHERE id IN (SELECT id FROM a1_module1_expected_lessons))
     OR EXISTS (SELECT 1 FROM contents WHERE id IN (SELECT id FROM a1_module1_expected_contents))
     OR EXISTS (SELECT 1 FROM enrollments WHERE id = enrollment_id) THEN
    RAISE EXCEPTION 'Seed identity collision; refusing insert';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "User"
    WHERE id = p->'identities'->>'creatorId'
  ) THEN
    RAISE EXCEPTION 'Creator identity is not present';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "User"
    WHERE id = p->'identities'->>'studentId'
      AND status = 'ACTIVE'::"UserStatus"
      AND 'STUDENT'::"UserRole" = ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Student identity is not an active student';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM academic_periods
    WHERE id = p->'identities'->>'academicPeriodId'
  ) THEN
    RAISE EXCEPTION 'Academic period identity is not present';
  END IF;
END $a1_module1_guard$;

CREATE TEMP TABLE a1_module1_existing_baseline (
  courses_digest text NOT NULL,
  modules_digest text NOT NULL,
  lessons_digest text NOT NULL,
  contents_digest text NOT NULL,
  audio_urls_digest text NOT NULL,
  lesson_progress_digest text NOT NULL,
  user_contents_digest text NOT NULL,
  block_responses_digest text NOT NULL,
  enrollments_digest text NOT NULL
) ON COMMIT DROP;

INSERT INTO a1_module1_existing_baseline
SELECT
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM courses AS row
   WHERE row.id <> (SELECT payload->'course'->>'id' FROM a1_module1_seed_plan)),
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM modules AS row
   WHERE row.id <> (SELECT payload->'module'->>'id' FROM a1_module1_seed_plan)),
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM lessons AS row
   WHERE NOT EXISTS (SELECT 1 FROM a1_module1_expected_lessons AS expected WHERE expected.id = row.id)),
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM contents AS row
   WHERE NOT EXISTS (SELECT 1 FROM a1_module1_expected_contents AS expected WHERE expected.id = row.id)),
  (SELECT md5(coalesce(jsonb_agg(
      jsonb_build_object('id', row.id, 'url', row.data->>'url') ORDER BY row.id
    ), '[]'::jsonb)::text)
   FROM contents AS row
   WHERE NOT EXISTS (SELECT 1 FROM a1_module1_expected_contents AS expected WHERE expected.id = row.id)
     AND (
       row.data->>'type' = 'audio'
       OR row."contentType" = 'AUDIO'::"ContentType"
       OR row.data ? 'audioUrl'
     )),
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM lesson_progress AS row),
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM user_contents AS row),
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM block_responses AS row),
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
   FROM enrollments AS row
   WHERE row.id <> (SELECT payload->>'enrollmentId' FROM a1_module1_seed_plan));

INSERT INTO courses (
  id, title, description, language, level, "isPublished", "createdById",
  image, "createdAt", "updatedAt"
)
SELECT
  payload->'course'->>'id',
  payload->'course'->>'title',
  payload->'course'->>'description',
  payload->'course'->>'language',
  payload->'course'->>'level',
  TRUE,
  payload->'identities'->>'creatorId',
  NULLIF(payload->'course'->>'image', ''),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM a1_module1_seed_plan;

INSERT INTO modules (
  id, title, description, level, "order", "isPublished", "courseId",
  objectives, "createdAt", "updatedAt"
)
SELECT
  payload->'module'->>'id',
  payload->'module'->>'title',
  NULLIF(payload->'module'->>'description', ''),
  payload->'module'->>'level',
  0,
  TRUE,
  payload->'course'->>'id',
  NULLIF(payload->'module'->>'objectives', ''),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM a1_module1_seed_plan;

INSERT INTO lessons (
  id, title, description, "order", "moduleId", "isPublished",
  "createdAt", "updatedAt"
)
SELECT
  lesson.value->>'id',
  lesson.value->>'title',
  lesson.value->>'description',
  (lesson.value->>'order')::integer,
  payload->'module'->>'id',
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM a1_module1_seed_plan
CROSS JOIN LATERAL jsonb_array_elements(payload->'lessons') AS lesson(value);

INSERT INTO contents (
  id, title, "order", "contentType", "lessonId", "parentId", data,
  "createdAt", "updatedAt"
)
SELECT
  content.value->>'id',
  content.value->>'title',
  (content.value->>'order')::integer,
  'RICH_TEXT'::"ContentType",
  content.value->>'lessonId',
  NULL,
  content.value->'data',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM a1_module1_seed_plan
CROSS JOIN LATERAL jsonb_array_elements(payload->'contentRows') AS content(value);

INSERT INTO enrollments (
  id, "studentId", "courseId", "academicPeriodId", status, progress,
  "enrollmentDate"
)
SELECT
  payload->>'enrollmentId',
  payload->'identities'->>'studentId',
  payload->'course'->>'id',
  payload->'identities'->>'academicPeriodId',
  'ACTIVE'::"EnrollmentStatus",
  0,
  CURRENT_TIMESTAMP
FROM a1_module1_seed_plan;

DO $a1_module1_postcondition$
DECLARE
  p jsonb;
BEGIN
  SELECT payload INTO p FROM a1_module1_seed_plan;

  IF (SELECT count(*) FROM courses WHERE id = p->'course'->>'id'
      AND "isPublished" = TRUE) <> 1
     OR (SELECT count(*) FROM modules WHERE id = p->'module'->>'id'
      AND "courseId" = p->'course'->>'id' AND "isPublished" = TRUE) <> 1
     OR (SELECT count(*) FROM lessons
      WHERE "moduleId" = p->'module'->>'id' AND "isPublished" = TRUE) <> 6
     OR (SELECT count(*) FROM contents
      WHERE id IN (SELECT id FROM a1_module1_expected_contents)
      AND "contentType" = 'RICH_TEXT'::"ContentType"
      AND "parentId" IS NULL) <> (SELECT count(*) FROM a1_module1_expected_contents)
     OR (SELECT count(*) FROM enrollments
      WHERE id = p->>'enrollmentId'
      AND "courseId" = p->'course'->>'id'
      AND "studentId" = p->'identities'->>'studentId'
      AND status = 'ACTIVE'::"EnrollmentStatus") <> 1 THEN
    RAISE EXCEPTION 'Seed postcondition count or identity check failed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM contents
    WHERE id IN (SELECT id FROM a1_module1_expected_contents)
      AND (data ? 'id' OR data ? 'order')
  ) THEN
    RAISE EXCEPTION 'Seed content payload contains forbidden identity data';
  END IF;

  IF (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM courses AS row
    WHERE row.id <> p->'course'->>'id'
  ) IS DISTINCT FROM (SELECT courses_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM modules AS row
    WHERE row.id <> p->'module'->>'id'
  ) IS DISTINCT FROM (SELECT modules_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM lessons AS row
    WHERE NOT EXISTS (SELECT 1 FROM a1_module1_expected_lessons AS expected WHERE expected.id = row.id)
  ) IS DISTINCT FROM (SELECT lessons_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM contents AS row
    WHERE NOT EXISTS (SELECT 1 FROM a1_module1_expected_contents AS expected WHERE expected.id = row.id)
  ) IS DISTINCT FROM (SELECT contents_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(
        jsonb_build_object('id', row.id, 'url', row.data->>'url') ORDER BY row.id
      ), '[]'::jsonb)::text)
    FROM contents AS row
    WHERE NOT EXISTS (SELECT 1 FROM a1_module1_expected_contents AS expected WHERE expected.id = row.id)
      AND (
        row.data->>'type' = 'audio'
        OR row."contentType" = 'AUDIO'::"ContentType"
        OR row.data ? 'audioUrl'
      )
  ) IS DISTINCT FROM (SELECT audio_urls_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM lesson_progress AS row
  ) IS DISTINCT FROM (SELECT lesson_progress_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM user_contents AS row
  ) IS DISTINCT FROM (SELECT user_contents_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM block_responses AS row
  ) IS DISTINCT FROM (SELECT block_responses_digest FROM a1_module1_existing_baseline)
  OR (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.id), '[]'::jsonb)::text)
    FROM enrollments AS row
    WHERE row.id <> p->>'enrollmentId'
  ) IS DISTINCT FROM (SELECT enrollments_digest FROM a1_module1_existing_baseline)
  THEN
    RAISE EXCEPTION 'Existing courses, lessons, contents, audio, progress, responses, or enrollments changed';
  END IF;
END $a1_module1_postcondition$;
{finish}
"""


def generate_sql(
    plan: Mapping[str, Any],
    identities: Mapping[str, str],
    *,
    apply: bool = False,
    audio_manifest: Any = None,
) -> str:
    """Compatibility alias for callers of the other guarded seed scripts."""

    return build_sql(plan, identities, apply=apply, audio_manifest=audio_manifest)


def build_remote_script(sql: str) -> str:
    """Wrap SQL in the verified DEV SSH/container boundary."""

    if not sql or "\x00" in sql:
        raise ValueError("SQL payload is empty or contains a NUL byte")
    return """set -euo pipefail
source /root/lingowow-ci/config.sh
[[ "$DEV_DB_NAME" == "lingowow_dev" ]]
[[ "$DEV_DB_USER" == "lingowow_dev" ]]
[[ -n "$DEV_DB_UUID" && "$DEV_DB_UUID" != "$PROD_DB_UUID" ]]
app_ids=$(docker ps -q --filter name=wnzn19ljdvtk84yzz4j3orj1)
[[ -n "$app_ids" && "$app_ids" != *$'\\n'* ]]
app="$app_ids"
docker exec "$app" node -e 'try {
  const u = new URL(process.env.DATABASE_URL || "");
  if (u.pathname !== "/lingowow_dev" || !u.hostname.includes(process.argv[1])) process.exit(2);
} catch { process.exit(2); }' "$DEV_DB_UUID"
docker exec -i "$DEV_DB_UUID" psql -X -v ON_ERROR_STOP=1 -U "$DEV_DB_USER" -d "$DEV_DB_NAME" -At <<'A1_MODULE1_SQL'
""" + sql + """A1_MODULE1_SQL
"""


def apply_plan(
    plan: Mapping[str, Any],
    identities: Mapping[str, str],
    *,
    apply: bool = False,
    audio_manifest: Any = None,
) -> None:
    """Run the guarded transaction only after the remote DEV checks pass."""

    sql = build_sql(plan, identities, apply=apply, audio_manifest=audio_manifest)
    result = subprocess.run(
        [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=10",
            SERVER,
            "bash -s",
        ],
        input=build_remote_script(sql).encode("utf-8"),
        capture_output=True,
        check=False,
    )
    if result.returncode:
        # Never echo remote stderr: it could include a connector/driver detail.
        raise SystemExit("A1 pilot seed failed; remote output was suppressed")
    print(
        json.dumps(
            {
                "mode": "applied" if apply else "dry-run-rolled-back",
                "courseId": COURSE_ID,
                "moduleId": MODULE_ID,
                "lessonCount": len(LESSON_IDS),
                "contentCount": len(_content_rows(plan)),
                "enrollmentId": ENROLLMENT_ID,
                "existingRowsPreserved": True,
            },
            sort_keys=True,
        )
    )


def _load_json(path: Path, label: str) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PlanError(f"could not read {label}") from error


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("public_plan", type=Path, help="compiler-produced public plan JSON")
    parser.add_argument(
        "--identities",
        type=Path,
        required=True,
        help="private JSON file with creatorId, studentId, and academicPeriodId",
    )
    parser.add_argument(
        "--audio-manifest",
        type=Path,
        help="optional verified local synthetic-audio manifest JSON",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="commit the guarded DEV transaction; without this flag it rolls back",
    )
    args = parser.parse_args(argv)
    try:
        plan = _load_json(args.public_plan, "public plan")
        identities = _load_json(args.identities, "private identities")
        audio_manifest = _load_json(args.audio_manifest, "audio manifest") if args.audio_manifest else None
        apply_plan(
            plan,
            validate_identities(identities),
            apply=args.apply,
            audio_manifest=audio_manifest,
        )
    except PlanError as error:
        raise SystemExit(f"Invalid A1 pilot seed input: {error}") from error


if __name__ == "__main__":
    main()
