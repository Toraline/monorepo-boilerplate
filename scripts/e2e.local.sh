#!/usr/bin/env bash
# Runs the end-to-end tests (the folder e2e/, Playwright). Used by: make e2e
# This file belongs to the project: make sync-skills never creates, changes or removes it.
#
# What it does, in order:
#   1. Starts the database when it is not running.
#   2. Downloads the browser of the tests when this machine does not have it.
#   3. Runs Playwright. Playwright starts the server and the web app of the
#      run on their own ports, with a database of their own, runs the tests,
#      and stops the server and the web app (e2e/playwright.config.ts).
#   4. Stops the database, only when step 1 started it.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"; cd "$root"
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

[ -f .env ] || die ".env not found. Fix: run 'make env', then run 'make e2e' again."

database_answers() {
  (cd apps/api && .venv/bin/python manage.py check_database) >/dev/null 2>&1
}

started_database=0
stop_what_was_started() {
  if [ "$started_database" = "1" ]; then
    echo "Stopping the database, because this command started it."
    bash scripts/db.local.sh down
  fi
}
trap stop_what_was_started EXIT

if database_answers; then
  echo "The database is already running. It stays running after the tests."
else
  echo "The database is not running. Starting it for the tests."
  bash scripts/db.local.sh up
  started_database=1
fi

# Does nothing when the browser is already on this machine.
npm run browser --workspace e2e

npm run e2e --workspace e2e
