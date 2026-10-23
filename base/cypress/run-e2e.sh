#!/usr/bin/env bash
# Run the Cypress suite against the real stack: the Rails API on :3006 with a
# freshly seeded demo practice, and a production build of the console on :3005.
#
#   cypress/run-e2e.sh            headless run (what CI does)
#   cypress/run-e2e.sh --open     interactive runner
#   SKIP_BUILD=1 cypress/run-e2e.sh   reuse the last `next build`
#
# E2E=true points the API at storage/e2e.sqlite3 and lifts its rate limits; see
# api/config/database.yml and api/config/initializers/rack_attack.rb.
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$BASE_DIR/../api"
LOG_DIR="$BASE_DIR/cypress/logs"
mkdir -p "$LOG_DIR"

export E2E=true
export RAILS_ENV=development
export NEXT_PUBLIC_API_URL=http://localhost:3006
# Rails' db tasks in development also act on the test database; leave it alone.
export SKIP_TEST_DATABASE=true

for port in 3005 3006; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    echo "Port $port is in use. Stop the dev servers first (make dev-stop)." >&2
    exit 1
  fi
done

pids=()
cleanup() {
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT

wait_for() {
  local url=$1 name=$2
  for _ in $(seq 1 120); do
    if curl -sf -o /dev/null "$url"; then return 0; fi
    sleep 1
  done
  echo "$name did not come up; see $LOG_DIR." >&2
  exit 1
}

echo "Seeding the e2e database..."
# Delete the files rather than db:drop, which leaves SQLite's -wal and -shm
# behind for the new database to replay.
rm -f "$API_DIR"/storage/e2e.sqlite3*
(cd "$API_DIR" && bundle exec rails db:schema:load db:seed) > "$LOG_DIR/seed.log" 2>&1

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  echo "Building the console..."
  (cd "$BASE_DIR" && pnpm run build) > "$LOG_DIR/build.log" 2>&1
fi

(cd "$API_DIR" && exec bundle exec rails server -p 3006) > "$LOG_DIR/api.log" 2>&1 &
pids+=($!)
(cd "$BASE_DIR" && exec pnpm exec next start -p 3005) > "$LOG_DIR/web.log" 2>&1 &
pids+=($!)

wait_for http://localhost:3006/up "The API"
wait_for http://localhost:3005/login "The console"

cd "$BASE_DIR"
if [[ "${1:-}" == "--open" ]]; then
  pnpm exec cypress open --e2e
else
  pnpm exec cypress run "$@"
fi
