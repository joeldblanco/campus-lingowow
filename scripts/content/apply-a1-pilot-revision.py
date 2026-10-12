"""CAS update of the six existing DEV pilot lessons; rollback by default.

Never deletes content identities or modifies enrollments, courses or history.
The caller supplies the exact previous reviewed plan and audio manifest.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

spec = importlib.util.spec_from_file_location('a1_seed_revision_guard', Path(__file__).with_name('apply-a1-module1-pilot.py'))
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)
PlanError = seed.PlanError
APPROVED_BASELINE_SHA256 = '0ffbeb1e853c6740df025f588028ea4c0e9eeddc5ebe7866c1c0f45db4e86020'
APPROVED_AUDIO_SHA256 = '9237e552e31f81b8415e4099374472bee66b6d41cf94f631bca6e936041b2a32'

def canonical_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

def require_approved_baseline(plan, audio):
    if canonical_hash(plan) != APPROVED_BASELINE_SHA256 or canonical_hash(audio) != APPROVED_AUDIO_SHA256:
        raise PlanError('Previous inputs differ from the reviewed ed4dffb baseline')

def audio_semantics(block):
    """Placement/copy can change; recording identity and spoken text cannot."""
    fields = {'url', 'audioUrl', 'audioSrc', 'transcript', 'spokenTranscript', 'sourceEnglishTranscript', 'originalEnglishModel', 'sha256'}
    result = {}
    def walk(value, path=''):
        if isinstance(value, dict):
            for key, nested in value.items():
                nested_path = path + '.' + key
                if key in fields: result[nested_path] = nested
                walk(nested, nested_path)
        elif isinstance(value, list):
            for index, nested in enumerate(value): walk(nested, path + f'[{index}]')
    walk(block)
    return result

def validate_revision(previous, revised, previous_audio, revised_audio):
    require_approved_baseline(previous, previous_audio)
    seed.validate_plan(previous, audio_manifest=previous_audio)
    seed.validate_plan(revised, audio_manifest=revised_audio)
    if previous['course'] != revised['course'] or previous['module'] != revised['module']:
        raise PlanError('Revision may only change pilot lesson content')
    old_lessons = {x['id']: {k: v for k, v in x.items() if k != 'blocks'} for x in previous['lessons']}
    new_lessons = {x['id']: {k: v for k, v in x.items() if k != 'blocks'} for x in revised['lessons']}
    if old_lessons != new_lessons:
        raise PlanError('Lesson identities and descriptors must be preserved')
    old = {x['id']: x for x in seed._content_rows(previous)}
    new = {x['id']: x for x in seed._content_rows(revised)}
    if not old.keys() <= new.keys():
        raise PlanError('Original content identities may not be deleted')
    for identity, row in new.items():
        if identity in old:
            if row['lessonId'] != old[identity]['lessonId']:
                raise PlanError('Existing content cannot move between lessons')
            if old[identity]['data']['type'] == 'audio' and (
                row['data']['type'] != 'audio' or audio_semantics(row['data']) != audio_semantics(old[identity]['data'])
            ):
                raise PlanError('Original audio identity, hash and spoken transcript must be preserved per block')
        elif not identity.startswith('a1teach-'):
            raise PlanError('New content requires the reviewed teaching namespace')
    before_assets = {x['path']: x for x in previous_audio['files']}
    after_assets = {x['path']: x for x in revised_audio['files']}
    if any(after_assets.get(path) != asset for path, asset in before_assets.items()):
        raise PlanError('Original recordings and transcripts must be preserved')
    return list(old.values()), list(new.values())

def build_sql(previous, revised, previous_audio, revised_audio, *, apply=False):
    old, new = validate_revision(previous, revised, previous_audio, revised_audio)
    encoded = base64.b64encode(json.dumps({'old': old, 'new': new, 'lessons': list(seed.LESSON_IDS)}, ensure_ascii=False).encode()).decode()
    # All unrelated content and student records are fingerprinted inside the
    # serializable snapshot. The script performs no writes to these tables.
    tables = ['courses', 'modules', 'lessons', 'enrollments', '"User"', 'lesson_progress', 'user_contents', 'block_responses', 'user_activities']
    fingerprints = [f"SELECT '{table}' AS name, md5(coalesce(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text), '[]'::jsonb)::text) AS digest FROM {table} r" for table in tables]
    fingerprints.append("SELECT 'unrelated_contents', md5(coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb)::text) FROM contents r WHERE r.\"lessonId\" NOT IN (SELECT jsonb_array_elements_text(payload->'lessons') FROM a1_revision_plan)")
    digest_query = '\nUNION ALL\n'.join(fingerprints)
    finish = 'COMMIT;' if apply else 'ROLLBACK;'
    return f'''BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtextextended('a1-general-module1-pilot-revision', 0));
CREATE TEMP TABLE a1_revision_plan(payload jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO a1_revision_plan VALUES(convert_from(decode('{encoded}', 'base64'), 'UTF8')::jsonb);
CREATE TEMP TABLE a1_revision_old ON COMMIT DROP AS SELECT r.* FROM a1_revision_plan, jsonb_to_recordset(payload->'old') AS r(id text, title text, "order" integer, "lessonId" text, data jsonb);
CREATE TEMP TABLE a1_revision_new ON COMMIT DROP AS SELECT r.* FROM a1_revision_plan, jsonb_to_recordset(payload->'new') AS r(id text, title text, "order" integer, "lessonId" text, data jsonb);
SELECT id FROM courses WHERE id='a1-general-module1-pilot' FOR SHARE;
SELECT id FROM modules WHERE id='a1-general-module1' FOR SHARE;
SELECT id FROM lessons WHERE id IN (SELECT jsonb_array_elements_text(payload->'lessons') FROM a1_revision_plan) FOR SHARE;
SELECT c.id FROM contents c WHERE c."lessonId" IN (SELECT jsonb_array_elements_text(payload->'lessons') FROM a1_revision_plan) FOR UPDATE;
DO $guard$ BEGIN
 IF current_database() <> 'lingowow_dev' THEN RAISE EXCEPTION 'A1_REVISION: DEV required'; END IF;
 IF (SELECT count(*) FROM lessons WHERE id IN (SELECT jsonb_array_elements_text(payload->'lessons') FROM a1_revision_plan) AND "moduleId" = 'a1-general-module1') <> 6
 OR NOT EXISTS (SELECT 1 FROM modules WHERE id='a1-general-module1' AND "courseId"='a1-general-module1-pilot') THEN RAISE EXCEPTION 'A1_REVISION: pilot boundary mismatch'; END IF;
 IF EXISTS (SELECT 1 FROM a1_revision_old o FULL JOIN (SELECT * FROM contents WHERE "lessonId" IN (SELECT jsonb_array_elements_text(payload->'lessons') FROM a1_revision_plan)) c ON c.id=o.id
 WHERE o.id IS NULL OR c.id IS NULL OR c.title IS DISTINCT FROM o.title OR c."order" IS DISTINCT FROM o."order" OR c."lessonId" IS DISTINCT FROM o."lessonId" OR c.data IS DISTINCT FROM o.data OR c."contentType" <> 'RICH_TEXT'::"ContentType" OR c."parentId" IS NOT NULL) THEN RAISE EXCEPTION 'A1_REVISION: CAS rejected; inspect changed pilot rows'; END IF;
 IF EXISTS (SELECT 1 FROM a1_revision_new n JOIN contents c ON c.id=n.id LEFT JOIN a1_revision_old o ON o.id=n.id WHERE o.id IS NULL) THEN RAISE EXCEPTION 'A1_REVISION: new identity collision'; END IF;
END $guard$;
CREATE TEMP TABLE a1_revision_before ON COMMIT DROP AS {digest_query};
UPDATE contents c SET title=n.title, "order"=n."order", data=n.data, "updatedAt"=CURRENT_TIMESTAMP FROM a1_revision_new n WHERE c.id=n.id;
INSERT INTO contents(id,title,"order","contentType","lessonId","parentId",data,"createdAt","updatedAt")
SELECT n.id,n.title,n."order",'RICH_TEXT'::"ContentType",n."lessonId",NULL,n.data,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM a1_revision_new n LEFT JOIN a1_revision_old o ON o.id=n.id WHERE o.id IS NULL;
CREATE TEMP TABLE a1_revision_after ON COMMIT DROP AS {digest_query};
DO $post$ BEGIN
 IF EXISTS (SELECT 1 FROM a1_revision_before b FULL JOIN a1_revision_after a USING(name) WHERE b.digest IS DISTINCT FROM a.digest) THEN RAISE EXCEPTION 'A1_REVISION: unrelated data changed'; END IF;
 IF EXISTS (SELECT 1 FROM a1_revision_new n FULL JOIN (SELECT * FROM contents WHERE "lessonId" IN (SELECT jsonb_array_elements_text(payload->'lessons') FROM a1_revision_plan)) c ON c.id=n.id
 WHERE c.id IS NULL OR n.id IS NULL OR c.data IS DISTINCT FROM n.data OR c.title IS DISTINCT FROM n.title OR c."order" IS DISTINCT FROM n."order" OR c."lessonId" IS DISTINCT FROM n."lessonId") THEN RAISE EXCEPTION 'A1_REVISION: postcondition failed'; END IF;
END $post$;
{finish}
'''

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('previous', 'revised', 'previous_audio', 'revised_audio'):
        parser.add_argument('--' + name.replace('_', '-'), type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    inputs = [json.loads(getattr(args, name).read_text(encoding='utf-8-sig')) for name in ('previous', 'revised', 'previous_audio', 'revised_audio')]
    sql = build_sql(*inputs, apply=args.apply)
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', seed.SERVER, 'bash -s'], input=seed.build_remote_script(sql).encode(), capture_output=True)
    if result.returncode:
        # Only our fixed diagnostic messages can cross the remote boundary.
        detail = next((line.split('A1_REVISION:', 1)[1].strip() for line in result.stderr.decode(errors='replace').splitlines() if 'A1_REVISION:' in line), 'remote execution failed; inspect privately')
        raise SystemExit('Revision failed: ' + detail)
    print(json.dumps({'mode': 'applied' if args.apply else 'dry-run-rolled-back', 'preservedContentCount': len(seed._content_rows(inputs[0])), 'contentCount': len(seed._content_rows(inputs[1])), 'historyPreserved': True}))

if __name__ == '__main__': main()
