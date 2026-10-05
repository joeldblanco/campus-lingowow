#!/usr/bin/env bash
# Only production reads and writes to the explicitly configured dev database.
set -Eeuo pipefail
source /root/lingowow-ci/config.sh
[[ "$PROD_DB_UUID" == tg0g6o6y9sgwlxrpgcmy2r5n ]] || exit 2
[[ "$DEV_DB_UUID" =~ ^[a-z0-9]+$ && "$DEV_DB_UUID" != "$PROD_DB_UUID" ]] || exit 2
[[ "$DEV_APP_ID" =~ ^[0-9]+$ && "$DEV_APP_ID" != 6 ]] || exit 2
[[ "$DEV_DB_NAME" == lingowow_dev && "$DEV_DB_USER" == lingowow_dev ]] || exit 2

umask 077
install -m 700 -d /root/lingowow-ci/tmp
dump=$(mktemp /root/lingowow-ci/tmp/production-snapshot.XXXXXX)
candidate="lingowow_dev_refresh_$(date +%s)"
previous="lingowow_dev_previous_$(date +%s)"
containers=()
stopped=false
swapped=false
cleanup() {
  result=$?
  rm -f -- "$dump"
  if [[ "$stopped" == true ]]; then
    for container in "${containers[@]}"; do docker start "$container" >/dev/null || true; done
  fi
  if [[ "$swapped" == false ]]; then
    docker exec "$DEV_DB_UUID" dropdb -U "$DEV_DB_USER" --if-exists "$candidate" >/dev/null 2>&1 || true
  fi
  exit "$result"
}
trap cleanup EXIT

echo 'Taking a read-only snapshot of production.'
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' "$PROD_DB_UUID" \
  pg_dump -U lingowow -d lingowow -Fc --no-owner --no-acl > "$dump"
docker exec "$DEV_DB_UUID" createdb -U "$DEV_DB_USER" "$candidate"
docker exec -i "$DEV_DB_UUID" pg_restore -U "$DEV_DB_USER" -d "$candidate" \
  --exit-on-error --no-owner --no-acl < "$dump"

# Remove credentials and notification destinations from the dev copy only.
docker exec -i "$DEV_DB_UUID" psql -X -v ON_ERROR_STOP=1 -U "$DEV_DB_USER" -d "$candidate" <<'SQL'
BEGIN;
TRUNCATE api_keys, device_tokens, refresh_tokens, password_reset_tokens, verification_tokens, impersonation_tokens;
UPDATE "Account" SET refresh_token=NULL, access_token=NULL, id_token=NULL, session_state=NULL;
UPDATE subscriptions SET "niubizCardToken"=NULL;
COMMIT;
SQL

mapfile -t containers < <(docker ps -q --filter "label=coolify.applicationId=$DEV_APP_ID")
if ((${#containers[@]})); then
  # Bring the snapshot up to the schema expected by the current dev release.
  database_url=$(docker exec "${containers[0]}" node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/"+process.argv[1];console.log(u.toString())' "$candidate")
  docker exec -e DATABASE_URL="$database_url" "${containers[0]}" \
    node node_modules/prisma/build/index.js migrate deploy
  docker stop "${containers[@]}" >/dev/null
  stopped=true
fi
docker exec -i "$DEV_DB_UUID" psql -X -v ON_ERROR_STOP=1 -U "$DEV_DB_USER" -d postgres <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DEV_DB_NAME' AND pid<>pg_backend_pid();
BEGIN;
ALTER DATABASE $DEV_DB_NAME RENAME TO $previous;
ALTER DATABASE $candidate RENAME TO $DEV_DB_NAME;
COMMIT;
SQL
swapped=true
for container in "${containers[@]}"; do docker start "$container" >/dev/null; done
stopped=false
echo "Dev snapshot refreshed. Previous dev database retained as $previous. Production was read-only."
