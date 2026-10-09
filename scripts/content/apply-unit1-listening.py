"""Apply the reviewed payload-only revision to isolated dev; default is a rollback rehearsal."""
import argparse
import base64
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('plan')
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
plan = json.loads(Path(args.plan).read_text(encoding='utf-8'))
ids = {'37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b', '92983cec-2105-41d9-a47b-7fc00acba4e3'}
if plan['lessonId'] != 'cmk4otvgp0001w1p4ijdkv6i2':
    raise SystemExit('Unexpected lesson')
if not plan['patches']:
    print('No content changes required')
    raise SystemExit(0)
if len(plan['patches']) != 2 or {p['id'] for p in plan['patches']} != ids:
    raise SystemExit('Unexpected content targets')
encoded = base64.b64encode(json.dumps(plan, ensure_ascii=False).encode()).decode()
lesson_where = "c.\"lessonId\"='cmk4otvgp0001w1p4ijdkv6i2'"
targets = "('37caebcf-d2bf-487a-bcc4-d7e87d1b3d4b','92983cec-2105-41d9-a47b-7fc00acba4e3')"
content_digest = f"select md5(coalesce(jsonb_agg(to_jsonb(c) - case when c.id in {targets} then array['data','updatedAt'] else array[]::text[] end order by c.id),'[]'::jsonb)::text) from contents c where {lesson_where}"
progress_digest = f"select md5(coalesce(jsonb_agg(to_jsonb(u) order by u.id),'[]'::jsonb)::text) from user_contents u join contents c on c.id=u.\"contentId\" where {lesson_where}"
response_digest = f"select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb)::text) from block_responses r join contents c on c.id=r.\"contentId\" where {lesson_where}"
mode = 'applied' if args.apply else 'dry-run-rolled-back'
sql = f"""BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT id FROM contents WHERE \"lessonId\"='cmk4otvgp0001w1p4ijdkv6i2' FOR UPDATE;
CREATE TEMP TABLE listening_patch AS SELECT convert_from(decode('{encoded}','base64'),'UTF8')::jsonb AS payload;
CREATE TEMP TABLE listening_baseline AS SELECT ({content_digest}) AS content_digest, ({progress_digest}) AS progress_digest, ({response_digest}) AS response_digest;
DO $revision$
DECLARE payload jsonb; patch jsonb; changed integer;
BEGIN
 SELECT p.payload INTO payload FROM listening_patch p;
 IF current_database()<>'lingowow_dev' THEN RAISE EXCEPTION 'Unexpected database'; END IF;
 IF (SELECT count(*) FROM contents c WHERE {lesson_where})<>(payload->>'expectedContentCount')::integer THEN RAISE EXCEPTION 'Lesson content inventory changed'; END IF;
 IF (SELECT count(*) FROM block_responses WHERE \"contentId\" IN {targets})<>0 THEN RAISE EXCEPTION 'Recorded responses require historical-content review'; END IF;
 FOR patch IN SELECT value FROM jsonb_array_elements(payload->'patches') LOOP
  UPDATE contents SET data=patch->'nextData', \"updatedAt\"=CURRENT_TIMESTAMP
   WHERE id=patch->>'id' AND \"lessonId\"='cmk4otvgp0001w1p4ijdkv6i2' AND data::jsonb=patch->'previousData';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Content changed since the reviewed snapshot'; END IF;
 END LOOP;
 IF ({content_digest}) IS DISTINCT FROM (SELECT b.content_digest FROM listening_baseline b) THEN RAISE EXCEPTION 'Unrelated content or identity changed'; END IF;
 IF ({progress_digest}) IS DISTINCT FROM (SELECT b.progress_digest FROM listening_baseline b) THEN RAISE EXCEPTION 'Student progress changed'; END IF;
 IF ({response_digest}) IS DISTINCT FROM (SELECT b.response_digest FROM listening_baseline b) THEN RAISE EXCEPTION 'Saved response history changed'; END IF;
END $revision$;
{'COMMIT' if args.apply else 'ROLLBACK'};
"""
script = """set -euo pipefail
source /root/lingowow-ci/config.sh
[[ "$DEV_DB_NAME" == lingowow_dev && "$DEV_DB_USER" == lingowow_dev && "$DEV_DB_UUID" != "$PROD_DB_UUID" ]]
app=$(docker ps -q --filter name=wnzn19ljdvtk84yzz4j3orj1)
[[ -n "$app" && "$app" != *$'\n'* ]]
docker exec "$app" node -e 'try {const u=new URL(process.env.DATABASE_URL);if(u.pathname!=="/lingowow_dev"||!u.hostname.includes(process.argv[1]))process.exit(2)}catch{process.exit(2)}' "$DEV_DB_UUID"
docker exec -i "$DEV_DB_UUID" psql -X -v ON_ERROR_STOP=1 -U "$DEV_DB_USER" -d "$DEV_DB_NAME" -At <<'SQL'
""" + sql + "\nSQL\n"
result = subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','root@137.184.8.53','bash -s'], input=script.encode(), capture_output=True)
if result.returncode:
    print(result.stderr.decode(errors='replace'))
    raise SystemExit(result.returncode)
print(json.dumps({'mode': mode, 'patchedBlocks': 2, 'historyPreserved': True, 'otherContentPreserved': True}))
