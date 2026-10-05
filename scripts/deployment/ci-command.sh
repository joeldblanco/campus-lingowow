#!/usr/bin/env bash
# Installed as a forced SSH command; this key cannot open a shell.
set -euo pipefail
command=${SSH_ORIGINAL_COMMAND:-}
if [[ "$command" =~ ^deploy-(dev|main)\ ([0-9a-f]{40})$ ]]; then
  branch=${BASH_REMATCH[1]}
  commit=${BASH_REMATCH[2]}
  action=deploy
elif [[ "$command" == refresh-dev-data ]]; then
  action=refresh
else
  echo 'Unsupported staging/deployment command.' >&2
  exit 2
fi

source /root/lingowow-ci/config.sh
exec 9>/root/lingowow-ci/operation.lock
flock -w 1800 9 || { echo 'Another operation is still running.' >&2; exit 3; }
if [[ "$action" == refresh ]]; then
  exec /root/lingowow-ci/refresh-dev-data.sh
fi

latest=$(git ls-remote --heads https://github.com/joeldblanco/campus-lingowow.git "refs/heads/$branch" | cut -f1)
[[ "$latest" == "$commit" ]] || { echo 'Commit is not the current branch tip.' >&2; exit 4; }
if [[ "$branch" == dev ]]; then app_uuid=$DEV_APP_UUID; else app_uuid=$MAIN_APP_UUID; fi
token=$(cat /root/.coolify-ci-token)
[[ "$app_uuid" =~ ^[a-z0-9]+$ ]] || { echo 'Invalid configured application.' >&2; exit 5; }
response=$(docker exec coolify php artisan tinker --execute="echo json_encode(queue_application_deployment(application: App\\Models\\Application::where('uuid', '$app_uuid')->firstOrFail(), deployment_uuid: (string) new Visus\\Cuid2\\Cuid2, commit: '$commit', is_api: true));")
deployment_uuid=$(jq -r '.deployment_uuid // empty' <<< "$response")
[[ "$deployment_uuid" =~ ^[a-z0-9]+$ ]] || { echo 'Deployment was not queued.' >&2; exit 5; }
echo "Deployment queued: $deployment_uuid"
for ((attempt=0; attempt<240; attempt++)); do
  state=$(curl -fsS -H "Authorization: Bearer $token" "http://localhost:8000/api/v1/deployments/$deployment_uuid" | jq -r '.status')
  case "$state" in
    finished) echo "Deployment completed for $branch ($commit)."; exit 0 ;;
    failed|cancelled|canceled) echo "Deployment $state." >&2; exit 6 ;;
  esac
  sleep 10
done
echo 'Deployment wait timed out.' >&2
exit 7
