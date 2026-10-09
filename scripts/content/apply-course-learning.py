"""Apply reviewed course plans only to isolated dev, with exact-source CAS.

Defaults to a transactional rollback. No student history or lesson identity is
changed. Unit 1 is excluded because its audited migration already exists.
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
from pathlib import Path

COURSE_ID = 'cmjnr0g5x0001jp04fsw2fejs'
UNIT_ONE = 'cmk4otvgp0001w1p4ijdkv6i2'
SERVER = 'root@137.184.8.53'
DEV_DATABASE_CONTAINER = 'mquw7okcmmbokvczpvz1t7jk'


def validate_plans(plans: list[dict]) -> list[dict]:
    if not isinstance(plans, list) or not plans:
        raise ValueError('No reviewed lesson plans')
    seen = set()
    for plan in plans:
        lesson = plan.get('lessonId', '')
        if plan.get('courseId') != COURSE_ID or lesson == UNIT_ONE:
            raise ValueError('Only other Lingowow Esencial lessons are allowed')
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', lesson) or lesson in seen:
            raise ValueError('Invalid or duplicate lesson identity')
        seen.add(lesson)
        if plan.get('publishable') is not True or plan.get('blockers'):
            raise ValueError('Lesson source/media review is incomplete')
        previous, following = plan.get('previousRows'), plan.get('nextRows')
        if not isinstance(previous, list) or not previous or not isinstance(following, list) or not following:
            raise ValueError('Missing source inventory')
        if any(row.get('lessonId') != lesson for row in previous + following):
            raise ValueError('Cross-lesson content')
        before = {row['id']: row for row in previous}
        after = {row['id']: row for row in following}
        if len(before) != len(previous) or len(after) != len(following) or not before.keys() <= after.keys():
            raise ValueError('Duplicate or removed source record')
        if sorted(row['order'] for row in following) != list(range(len(following))):
            raise ValueError('Non-contiguous authored order')
        for key, row in after.items():
            if key in before:
                if any(row.get(field) != before[key].get(field) for field in ('title', 'contentType', 'parentId', 'lessonId')):
                    raise ValueError('Original content identity changed')
                original = before[key].get('data') or {}
                if original.get('type') == 'audio' and row['data'].get('url') != original.get('url'):
                    raise ValueError('Original audio URL changed')
                archived_unchanged = original.get('data', {}).get('archivedPilotSource') is True and row['data'] == original
                if original.get('type') == 'embed' and not archived_unchanged and row['data'].get('data', {}).get('originalSource') != original:
                    raise ValueError('Original presentation must be archived intact')
            elif not key.startswith(f'course-guided-{lesson}-') or row.get('contentType') != 'RICH_TEXT' or row.get('parentId') is not None:
                raise ValueError('Unapproved new record')
    return plans


def build_sql(plans: list[dict], apply: bool = False) -> str:
    validate_plans(plans)
    payload = base64.b64encode(json.dumps(plans, ensure_ascii=False).encode()).decode()
    finish = 'COMMIT' if apply else 'ROLLBACK'
    return f"""BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
CREATE TEMP TABLE course_learning_plan(payload jsonb) ON COMMIT DROP;
INSERT INTO course_learning_plan VALUES(convert_from(decode('{payload}','base64'),'UTF8')::jsonb);
CREATE TEMP TABLE target_lessons AS SELECT p->>'lessonId' id FROM course_learning_plan,jsonb_array_elements(payload) p;
SELECT c.id FROM contents c JOIN target_lessons t ON t.id=c."lessonId" FOR UPDATE;
CREATE TEMP TABLE preserved_history AS SELECT
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM lesson_progress x) lesson_progress,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM user_contents x) user_contents,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM block_responses x) block_responses,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM contents x WHERE x."lessonId"='{UNIT_ONE}') unit_one;
DO $migration$
DECLARE p jsonb; old jsonb; newer jsonb; n integer; lesson text;
BEGIN
 IF current_database()<>'lingowow_dev' THEN RAISE EXCEPTION 'Dev database required'; END IF;
 FOR p IN SELECT value FROM course_learning_plan,jsonb_array_elements(payload) LOOP
  lesson:=p->>'lessonId';
  IF lesson='{UNIT_ONE}' OR NOT EXISTS(SELECT 1 FROM lessons l JOIN modules m ON m.id=l."moduleId" WHERE l.id=lesson AND l."isPublished"=true AND m."courseId"='{COURSE_ID}') THEN RAISE EXCEPTION 'Unexpected course/published lesson'; END IF;
  IF (SELECT count(*) FROM contents WHERE "lessonId"=lesson)<>jsonb_array_length(p->'previousRows') THEN RAISE EXCEPTION 'Source inventory changed'; END IF;
  FOR old IN SELECT value FROM jsonb_array_elements(p->'previousRows') LOOP
   SELECT value INTO newer FROM jsonb_array_elements(p->'nextRows') WHERE value->>'id'=old->>'id';
   UPDATE contents c SET data=newer->'data',"order"=(newer->>'order')::integer,"updatedAt"=CURRENT_TIMESTAMP
   WHERE c.id=old->>'id' AND c."lessonId"=lesson AND c.data IS NOT DISTINCT FROM old->'data'
    AND c."order"=(old->>'order')::integer AND c.title=old->>'title'
    AND c."contentType"::text=old->>'contentType' AND c."parentId" IS NOT DISTINCT FROM old->>'parentId';
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RAISE EXCEPTION 'Source CAS rejected'; END IF;
  END LOOP;
  FOR newer IN SELECT newrows.row FROM jsonb_array_elements(p->'nextRows') newrows(row) WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p->'previousRows') oldrows(row) WHERE oldrows.row->>'id'=newrows.row->>'id') LOOP
   INSERT INTO contents(id,title,"order","contentType","lessonId","parentId",data,"createdAt","updatedAt")
   VALUES(newer->>'id',newer->>'title',(newer->>'order')::integer,'RICH_TEXT',lesson,NULL,newer->'data',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  END LOOP;
  IF (SELECT count(*) FROM contents WHERE "lessonId"=lesson)<>jsonb_array_length(p->'nextRows') THEN RAISE EXCEPTION 'Result inventory changed'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM preserved_history h WHERE
 h.lesson_progress IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM lesson_progress x)
 OR h.user_contents IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM user_contents x)
 OR h.block_responses IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM block_responses x)
 OR h.unit_one IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM contents x WHERE x."lessonId"='{UNIT_ONE}')) THEN RAISE EXCEPTION 'History or Unit1 changed'; END IF;
END $migration$;
SELECT 'Reviewed course plans verified; student history and Unit1 unchanged';
{finish};
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    value = json.loads(args.plan.read_text(encoding='utf-8-sig'))
    plans = value if isinstance(value, list) else value.get('plans', [value])
    sql = build_sql(plans, args.apply)
    command = f'''docker exec -i {DEV_DATABASE_CONTAINER} sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' '''
    subprocess.run(['ssh', SERVER, command], input=sql, text=True, check=True)


if __name__ == '__main__':
    main()
