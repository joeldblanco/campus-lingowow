"""Correct only Unit1's duplicate Carl-house distractor in isolated dev.

Defaults to rollback. Preserves item/option identities, the correct answer,
all original media, and every student record. No broad Unit1 migration.
"""
import argparse
import base64
import copy
import json
import subprocess
from pathlib import Path

LESSON = 'cmk4otvgp0001w1p4ijdkv6i2'
ROW = 'dev-unit1-interleaved-reading'


def corrected_data(data):
    result = copy.deepcopy(data)
    matches = [item for item in result.get('items', []) if item.get('id') == 'carl-house']
    if len(matches) != 1:
        raise ValueError('Exact Carl-house item required')
    item = matches[0]
    if item.get('correctOptionId') != 'saopaulo' or item.get('options') != [
        {'id': 'saopaulo', 'text': 'Sao Paulo'}, {'id': 'rio', 'text': 'Rio de Janeiro'},
        {'id': 'miami', 'text': 'Miami'}, {'id': 'carl-house-fourth', 'text': 'Rio de Janeiro'},
    ]:
        raise ValueError('Reviewed distractor inventory changed')
    item['options'][3]['text'] = 'Brasilia'
    return result


def build_sql(before, apply=False):
    after = corrected_data(before)
    payload = base64.b64encode(json.dumps({'before': before, 'after': after}, ensure_ascii=False).encode()).decode()
    finish = 'COMMIT' if apply else 'ROLLBACK'
    return f'''BEGIN;
SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='120s';
CREATE TEMP TABLE reviewed_unit1_distractor AS SELECT convert_from(decode('{payload}','base64'),'UTF8')::jsonb p;
CREATE TEMP TABLE preserved_student_records AS SELECT
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM lesson_progress x) a,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM user_contents x) b,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM block_responses x) c;
DO $correction$
DECLARE n integer;
BEGIN
 IF current_database()<>'lingowow_dev' THEN RAISE EXCEPTION 'Isolated dev required'; END IF;
 IF (SELECT count(*) FROM contents WHERE "lessonId"='{LESSON}')<>22 THEN RAISE EXCEPTION 'Unit1 inventory changed'; END IF;
 UPDATE contents SET data=(SELECT p->'after' FROM reviewed_unit1_distractor),"updatedAt"=CURRENT_TIMESTAMP
 WHERE id='{ROW}' AND "lessonId"='{LESSON}' AND data IS NOT DISTINCT FROM (SELECT p->'before' FROM reviewed_unit1_distractor);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Unit1 reviewed CAS rejected'; END IF;
 IF EXISTS(SELECT 1 FROM preserved_student_records h WHERE
 h.a IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM lesson_progress x)
 OR h.b IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM user_contents x)
 OR h.c IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb)::text) FROM block_responses x))
 THEN RAISE EXCEPTION 'Student history changed'; END IF;
END $correction$;
SELECT 'Unit1 distractor verified; correct key, identities, media and student history preserved';
{finish};'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8-sig'))
    if snapshot.get('database') != 'lingowow_dev' or snapshot.get('courseId') != 'cmjnr0g5x0001jp04fsw2fejs':
        raise ValueError('Isolated course snapshot required')
    lesson = next(lesson for lesson in snapshot['lessons'] if lesson['id'] == LESSON)
    before = next(row['data'] for row in lesson['rows'] if row['id'] == ROW)
    command = '''docker exec -i mquw7okcmmbokvczpvz1t7jk sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' '''
    subprocess.run(['ssh', 'root@137.184.8.53', command], input=build_sql(before, args.apply), text=True, check=True)


if __name__ == '__main__':
    main()
