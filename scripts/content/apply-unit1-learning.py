"""Safely apply the reviewed Unit 1 learning-content plan to isolated dev.

The plan is deliberately data-only.  This module validates the archived
snapshot and generates a parameter-free SQL transaction; it does not connect
to a database when imported.  Running the command performs a rollback
rehearsal unless ``--apply`` is supplied explicitly.
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence


LESSON_ID = "cmk4otvgp0001w1p4ijdkv6i2"
EXPECTED_PREVIOUS_ROWS = 17
EXPECTED_NEXT_ROWS = 22
NEW_CONTENT_IDS = frozenset(
    {
        "unit1-introductions-v1",
        "unit1-contact-v1",
        "unit1-questions-v1",
        "unit1-sentences-v1",
        "unit1-conversation-v1",
    }
)
AUDIO_IDS = (
    "448e4bb1-e411-482d-8e51-7487b209fb45",
    "37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b",
)


class PlanError(ValueError):
    """Raised when a reviewed plan does not satisfy the safety contract."""


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _validate_row(row: Any, *, label: str) -> dict[str, Any]:
    if not isinstance(row, dict):
        raise PlanError(f"{label} must be an object")

    for field in ("id", "order", "lessonId", "data"):
        if field not in row:
            raise PlanError(f"{label} is missing {field}")

    if not isinstance(row["id"], str) or not row["id"]:
        raise PlanError(f"{label}.id must be a non-empty string")
    if not _is_int(row["order"]):
        raise PlanError(f"{label}.order must be an integer")
    if row["lessonId"] != LESSON_ID:
        raise PlanError(f"{label}.lessonId is not the Unit 1 lesson")

    if "title" in row and not isinstance(row["title"], str):
        raise PlanError(f"{label}.title must be a string when present")
    if "contentType" in row and not isinstance(row["contentType"], str):
        raise PlanError(f"{label}.contentType must be a string when present")
    if "parentId" in row and row["parentId"] is not None and not isinstance(row["parentId"], str):
        raise PlanError(f"{label}.parentId must be a string or null when present")

    return row


def _rows_by_id(rows: Sequence[Mapping[str, Any]], *, label: str) -> dict[str, Mapping[str, Any]]:
    by_id: dict[str, Mapping[str, Any]] = {}
    for index, row in enumerate(rows):
        validated = _validate_row(row, label=f"{label}[{index}]")
        row_id = validated["id"]
        if row_id in by_id:
            raise PlanError(f"{label} contains duplicate id {row_id}")
        by_id[row_id] = validated
    return by_id


def _audio_url(row: Mapping[str, Any], *, label: str) -> str:
    data = row.get("data")
    if not isinstance(data, dict) or not isinstance(data.get("url"), str) or not data["url"]:
        raise PlanError(f"{label} must contain a non-empty data.url")
    return data["url"]


def validate_plan(plan: Any) -> dict[str, Any]:
    """Validate a reviewed plan and return it unchanged.

    ``previousRows`` is the immutable archive used for the compare-and-swap
    (CAS) update.  Existing rows may change only ``data`` and ``order``;
    ``updatedAt`` is assigned by SQL.  New rows are restricted to the five
    approved IDs and are inserted as top-level RICH_TEXT content.
    """

    if not isinstance(plan, dict):
        raise PlanError("plan must be an object")
    if plan.get("lessonId") != LESSON_ID:
        raise PlanError("Unexpected lesson")

    previous = plan.get("previousRows")
    next_rows = plan.get("nextRows")
    if not isinstance(previous, list) or not isinstance(next_rows, list):
        raise PlanError("plan must contain previousRows and nextRows arrays")
    if len(previous) != EXPECTED_PREVIOUS_ROWS:
        raise PlanError(f"expected {EXPECTED_PREVIOUS_ROWS} previous rows")
    if len(next_rows) != EXPECTED_NEXT_ROWS:
        raise PlanError(f"expected {EXPECTED_NEXT_ROWS} next rows")

    previous_by_id = _rows_by_id(previous, label="previousRows")
    next_by_id = _rows_by_id(next_rows, label="nextRows")
    previous_ids = set(previous_by_id)
    next_ids = set(next_by_id)

    if previous_ids & NEW_CONTENT_IDS:
        raise PlanError("approved new IDs must not already exist in previousRows")
    if not previous_ids.issubset(next_ids):
        deleted = sorted(previous_ids - next_ids)
        raise PlanError(f"deletion is not allowed: {deleted}")
    added = next_ids - previous_ids
    if added != set(NEW_CONTENT_IDS):
        unexpected = sorted(added - set(NEW_CONTENT_IDS))
        missing = sorted(set(NEW_CONTENT_IDS) - added)
        detail = []
        if unexpected:
            detail.append(f"unexpected new IDs {unexpected}")
        if missing:
            detail.append(f"missing approved new IDs {missing}")
        raise PlanError("invalid nextRows inventory: " + "; ".join(detail))

    # The archive and the proposed rows must agree on every immutable field.
    for row_id in sorted(previous_ids):
        old = previous_by_id[row_id]
        new = next_by_id[row_id]
        for field in ("lessonId", "title", "contentType", "parentId"):
            old_present = field in old
            new_present = field in new
            if old_present != new_present or (old_present and old[field] != new[field]):
                raise PlanError(f"existing row {row_id} changed immutable field {field}")

    for row_id in sorted(NEW_CONTENT_IDS):
        row = next_by_id[row_id]
        if row.get("contentType") != "RICH_TEXT":
            raise PlanError(f"new row {row_id} must be RICH_TEXT")
        if row.get("parentId") is not None:
            raise PlanError(f"new row {row_id} must have parentId null")
        if not isinstance(row.get("title"), str):
            raise PlanError(f"new row {row_id} must include title")

    # These are the two audio blocks whose source URL is explicitly immutable.
    for audio_id in AUDIO_IDS:
        if audio_id not in previous_by_id or audio_id not in next_by_id:
            raise PlanError(f"immutable audio row {audio_id} is missing")
        old_url = _audio_url(previous_by_id[audio_id], label=f"previousRows[{audio_id}]")
        new_url = _audio_url(next_by_id[audio_id], label=f"nextRows[{audio_id}]")
        if old_url != new_url:
            raise PlanError(f"audio URL changed for {audio_id}")

    return plan


def _sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _values_sql(values: Sequence[str]) -> str:
    return ", ".join(f"({_sql_literal(value)})" for value in values)


def generate_sql(plan: Mapping[str, Any], *, apply: bool = False) -> str:
    """Generate the guarded SQL transaction without executing it."""

    checked = validate_plan(dict(plan))
    previous_ids = sorted(row["id"] for row in checked["previousRows"])
    next_ids = sorted(row["id"] for row in checked["nextRows"])
    new_ids = sorted(NEW_CONTENT_IDS)
    payload = base64.b64encode(
        json.dumps(checked, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).decode("ascii")

    previous_values = _values_sql(previous_ids)
    next_values = _values_sql(next_ids)
    new_values = _values_sql(new_ids)
    lesson = _sql_literal(LESSON_ID)
    final_statement = "COMMIT;" if apply else "ROLLBACK;"

    return f"""BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '10s';
CREATE TEMP TABLE unit1_learning_plan (payload jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO unit1_learning_plan(payload)
VALUES (convert_from(decode('{payload}', 'base64'), 'UTF8')::jsonb);
CREATE TEMP TABLE unit1_expected_previous_ids (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO unit1_expected_previous_ids(id) VALUES {previous_values};
CREATE TEMP TABLE unit1_expected_next_ids (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO unit1_expected_next_ids(id) VALUES {next_values};
CREATE TEMP TABLE unit1_expected_new_ids (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO unit1_expected_new_ids(id) VALUES {new_values};

-- Lock the complete current lesson before checking the archived inventory.
SELECT c.id
FROM contents AS c
WHERE c."lessonId" = {lesson}
FOR UPDATE;

CREATE TEMP TABLE unit1_learning_baseline (
  content_identity_digest text NOT NULL,
  user_contents_digest text NOT NULL,
  block_responses_digest text NOT NULL
) ON COMMIT DROP;
INSERT INTO unit1_learning_baseline
SELECT
  (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(c) - ARRAY['data', 'order', 'updatedAt'] ORDER BY c.id), '[]'::jsonb)::text)
    FROM contents AS c
    WHERE c."lessonId" = {lesson}
      AND EXISTS (SELECT 1 FROM unit1_expected_previous_ids AS e WHERE e.id = c.id)
  ),
  (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(u) ORDER BY u.id), '[]'::jsonb)::text)
    FROM user_contents AS u
    JOIN contents AS c ON c.id = u."contentId"
    WHERE c."lessonId" = {lesson}
  ),
  (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb)::text)
    FROM block_responses AS r
    JOIN contents AS c ON c.id = r."contentId"
    WHERE c."lessonId" = {lesson}
  );

DO $unit1_learning_revision$
DECLARE
  payload jsonb;
  previous_row jsonb;
  next_row jsonb;
  changed integer;
BEGIN
  SELECT p.payload INTO payload FROM unit1_learning_plan AS p;
  IF current_database() <> 'lingowow_dev' THEN
    RAISE EXCEPTION 'Unexpected database';
  END IF;
  IF payload->>'lessonId' IS DISTINCT FROM {lesson} THEN
    RAISE EXCEPTION 'Unexpected lesson';
  END IF;
  IF jsonb_array_length(payload->'previousRows') <> {EXPECTED_PREVIOUS_ROWS}
     OR jsonb_array_length(payload->'nextRows') <> {EXPECTED_NEXT_ROWS} THEN
    RAISE EXCEPTION 'Unexpected reviewed row counts';
  END IF;

  -- Exact pre-update inventory rejects deleted rows and unexpected IDs.
  IF (SELECT count(*) FROM contents AS c WHERE c."lessonId" = {lesson})
       <> (SELECT count(*) FROM unit1_expected_previous_ids) THEN
    RAISE EXCEPTION 'Lesson content inventory changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM contents AS c
    WHERE c."lessonId" = {lesson}
      AND NOT EXISTS (SELECT 1 FROM unit1_expected_previous_ids AS e WHERE e.id = c.id)
  ) OR EXISTS (
    SELECT 1 FROM unit1_expected_previous_ids AS e
    WHERE NOT EXISTS (
      SELECT 1 FROM contents AS c
      WHERE c.id = e.id AND c."lessonId" = {lesson}
    )
  ) THEN
    RAISE EXCEPTION 'Lesson content inventory changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unit1_expected_new_ids AS e
    WHERE EXISTS (SELECT 1 FROM contents AS c WHERE c.id = e.id)
  ) THEN
    RAISE EXCEPTION 'Approved new content ID already exists';
  END IF;

  -- The reviewed source URL must still match both immutable audio rows.
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('448e4bb1-e411-482d-8e51-7487b209fb45'),
      ('37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b')
    ) AS audio(id)
    JOIN contents AS c ON c.id = audio.id AND c."lessonId" = {lesson}
    JOIN LATERAL (
      SELECT value AS row_data
      FROM jsonb_array_elements(payload->'previousRows')
      WHERE value->>'id' = audio.id
    ) AS archived ON TRUE
    WHERE c.data->>'url' IS DISTINCT FROM archived.row_data->'data'->>'url'
  ) THEN
    RAISE EXCEPTION 'Audio URL changed since the reviewed snapshot';
  END IF;

  FOR previous_row IN SELECT value FROM jsonb_array_elements(payload->'previousRows') LOOP
    SELECT value INTO next_row
    FROM jsonb_array_elements(payload->'nextRows')
    WHERE value->>'id' = previous_row->>'id';
    IF next_row IS NULL THEN
      RAISE EXCEPTION 'Existing content was deleted';
    END IF;

    -- CAS includes the archived ID, order, data, lesson and available identity fields.
    UPDATE contents AS c
    SET data = NULLIF(next_row->'data', 'null'::jsonb),
        "order" = (next_row->>'order')::integer,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE c.id = previous_row->>'id'
      AND c."lessonId" = {lesson}
      AND c."order" = (previous_row->>'order')::integer
      AND c.data IS NOT DISTINCT FROM NULLIF(previous_row->'data', 'null'::jsonb)
      AND (NOT (previous_row ? 'title') OR c.title = previous_row->>'title')
      AND (NOT (previous_row ? 'contentType') OR c."contentType"::text = previous_row->>'contentType')
      AND (NOT (previous_row ? 'parentId') OR c."parentId" IS NOT DISTINCT FROM previous_row->>'parentId');
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> 1 THEN
      RAISE EXCEPTION 'Content changed since the reviewed snapshot';
    END IF;
  END LOOP;

  -- Only the five reviewed top-level RICH_TEXT rows may be inserted.
  FOR next_row IN
    SELECT value
    FROM jsonb_array_elements(payload->'nextRows')
    WHERE value->>'id' IN (SELECT id FROM unit1_expected_new_ids)
  LOOP
    IF next_row->>'contentType' IS DISTINCT FROM 'RICH_TEXT'
       OR next_row->'parentId' IS NOT NULL AND next_row->'parentId' <> 'null'::jsonb THEN
      RAISE EXCEPTION 'New content must be top-level RICH_TEXT';
    END IF;
    INSERT INTO contents (
      id, title, "order", "contentType", "lessonId", "parentId", data,
      "createdAt", "updatedAt"
    )
    VALUES (
      next_row->>'id',
      next_row->>'title',
      (next_row->>'order')::integer,
      (next_row->>'contentType')::"ContentType",
      {lesson},
      NULL,
      NULLIF(next_row->'data', 'null'::jsonb),
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END LOOP;

  -- Exact post-update inventory also proves that no row was deleted or added.
  IF (SELECT count(*) FROM contents AS c WHERE c."lessonId" = {lesson})
       <> (SELECT count(*) FROM unit1_expected_next_ids) THEN
    RAISE EXCEPTION 'Post-update lesson inventory changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM contents AS c
    WHERE c."lessonId" = {lesson}
      AND NOT EXISTS (SELECT 1 FROM unit1_expected_next_ids AS e WHERE e.id = c.id)
  ) OR EXISTS (
    SELECT 1 FROM unit1_expected_next_ids AS e
    WHERE NOT EXISTS (
      SELECT 1 FROM contents AS c
      WHERE c.id = e.id AND c."lessonId" = {lesson}
    )
  ) THEN
    RAISE EXCEPTION 'Post-update lesson inventory changed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM contents AS c
    JOIN unit1_expected_new_ids AS e ON e.id = c.id
    WHERE c."lessonId" = {lesson}
      AND (c."contentType" <> 'RICH_TEXT'::"ContentType" OR c."parentId" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'New content identity changed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('448e4bb1-e411-482d-8e51-7487b209fb45'),
      ('37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b')
    ) AS audio(id)
    JOIN contents AS c ON c.id = audio.id AND c."lessonId" = {lesson}
    JOIN LATERAL (
      SELECT value AS row_data
      FROM jsonb_array_elements(payload->'nextRows')
      WHERE value->>'id' = audio.id
    ) AS reviewed ON TRUE
    WHERE c.data->>'url' IS DISTINCT FROM reviewed.row_data->'data'->>'url'
  ) THEN
    RAISE EXCEPTION 'Audio URL changed during revision';
  END IF;

  IF (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(c) - ARRAY['data', 'order', 'updatedAt'] ORDER BY c.id), '[]'::jsonb)::text)
    FROM contents AS c
    WHERE c."lessonId" = {lesson}
      AND EXISTS (SELECT 1 FROM unit1_expected_previous_ids AS e WHERE e.id = c.id)
  ) IS DISTINCT FROM (SELECT b.content_identity_digest FROM unit1_learning_baseline AS b) THEN
    RAISE EXCEPTION 'Unrelated content identity changed';
  END IF;
  IF (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(u) ORDER BY u.id), '[]'::jsonb)::text)
    FROM user_contents AS u
    JOIN contents AS c ON c.id = u."contentId"
    WHERE c."lessonId" = {lesson}
  ) IS DISTINCT FROM (SELECT b.user_contents_digest FROM unit1_learning_baseline AS b) THEN
    RAISE EXCEPTION 'Student progress changed';
  END IF;
  IF (
    SELECT md5(coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb)::text)
    FROM block_responses AS r
    JOIN contents AS c ON c.id = r."contentId"
    WHERE c."lessonId" = {lesson}
  ) IS DISTINCT FROM (SELECT b.block_responses_digest FROM unit1_learning_baseline AS b) THEN
    RAISE EXCEPTION 'Saved response history changed';
  END IF;
END $unit1_learning_revision$;
{final_statement}
"""


def build_remote_script(sql: str) -> str:
    """Wrap generated SQL in the dev-only SSH/container checks."""

    return """set -euo pipefail
source /root/lingowow-ci/config.sh
[[ "$DEV_DB_NAME" == lingowow_dev && "$DEV_DB_USER" == lingowow_dev && "$DEV_DB_UUID" != "$PROD_DB_UUID" ]]
app=$(docker ps -q --filter name=wnzn19ljdvtk84yzz4j3orj1)
[[ -n "$app" && "$app" != *$'\\n'* ]]
# Validate only the URL's host and pathname; never print DATABASE_URL or its credentials.
docker exec "$app" node -e 'try { const u = new URL(process.env.DATABASE_URL); if (u.pathname !== "/lingowow_dev" || !u.hostname.includes(process.argv[1])) process.exit(2) } catch { process.exit(2) }' "$DEV_DB_UUID"
docker exec -i "$DEV_DB_UUID" psql -X -v ON_ERROR_STOP=1 -U "$DEV_DB_USER" -d "$DEV_DB_NAME" -At <<'SQL'
""" + sql + "SQL\n"


def apply_plan(plan: Mapping[str, Any], *, apply: bool = False) -> None:
    """Run the generated transaction against the verified isolated dev host."""

    checked = validate_plan(dict(plan))
    result = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "root@137.184.8.53", "bash -s"],
        input=build_remote_script(generate_sql(checked, apply=apply)).encode("utf-8"),
        capture_output=True,
        check=False,
    )
    if result.returncode:
        stderr = result.stderr.decode(errors="replace").strip()
        if stderr:
            print(stderr, file=sys.stderr)
        raise SystemExit(result.returncode)
    print(
        json.dumps(
            {
                "mode": "applied" if apply else "dry-run-rolled-back",
                "existingRows": EXPECTED_PREVIOUS_ROWS,
                "insertedRows": len(NEW_CONTENT_IDS),
                "historyPreserved": True,
                "audioUrlsPreserved": True,
            },
            sort_keys=True,
        )
    )


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path, help="reviewed Unit 1 previousRows/nextRows JSON plan")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="commit the guarded transaction; without this flag the transaction rolls back",
    )
    args = parser.parse_args(argv)
    try:
        plan = json.loads(args.plan.read_text(encoding="utf-8"))
        apply_plan(plan, apply=args.apply)
    except PlanError as error:
        raise SystemExit(f"Invalid plan: {error}") from error


if __name__ == "__main__":
    main()
