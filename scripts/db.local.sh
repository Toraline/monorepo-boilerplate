#!/usr/bin/env bash
# The database commands of this project: one PostgreSQL server in Docker (docker-compose.yml).
# Used by the Makefile: make db-up / db-wait / db-down / db-ps / db-logs / db-destroy / db-reset.
# This file belongs to the project: make sync-skills never creates, changes or removes it.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"; cd "$root"
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  cat <<'USAGE'
Usage:
  scripts/db.local.sh up        start the database and wait until it accepts connections
  scripts/db.local.sh wait      wait until the database accepts connections
  scripts/db.local.sh down      stop the database; the data stays
  scripts/db.local.sh ps        show the state of the database container
  scripts/db.local.sh logs      show the log of the database; Ctrl+C stops it
  scripts/db.local.sh destroy   stop the database and DELETE its data (needs CONFIRM=yes)
  scripts/db.local.sh reset     DELETE the data and start an empty database (needs CONFIRM=yes)
USAGE
}

need_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker not found. Fix: install Docker Desktop (https://docs.docker.com/get-started/get-docker/), open it, then run this command again."
  docker info >/dev/null 2>&1 || die "Docker is installed but it is not running. Fix: open Docker Desktop, wait until it shows that the engine is running, then run this command again."
  docker compose version >/dev/null 2>&1 || die "Docker Compose not found. Fix: update Docker Desktop; it includes Docker Compose."
}

# The port of the database on this machine: POSTGRES_PORT in .env, or 5432.
port() {
  local value=""
  [ ! -f .env ] || value="$(sed -n 's/^POSTGRES_PORT=\([0-9][0-9]*\).*/\1/p' .env | tail -1)"
  printf '%s' "${value:-5432}"
}

running() { [ -n "$(docker compose ps -q --status running postgres 2>/dev/null)" ]; }
listening() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

cmd_wait() {
  need_docker
  echo "Waiting for PostgreSQL to accept connections..."
  local i=0
  while [ "$i" -lt 60 ]; do
    if docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
      echo "PostgreSQL is ready on 127.0.0.1:$(port)."
      return 0
    fi
    i=$((i + 1)); sleep 1
  done
  die "PostgreSQL was not ready after 60 seconds. See its log: make db-logs"
}

cmd_up() {
  need_docker
  if ! running && listening "$(port)"; then
    die "Port $(port) is already in use by another program, so the database cannot start. Fix: stop that program, or set POSTGRES_PORT in .env to a free port (for example $(( $(port) + 1 ))), then run: make db-up"
  fi
  docker compose up -d
  cmd_wait
}

confirm() {
  [ "${CONFIRM:-}" = "yes" ] && return 0
  if [ -t 0 ]; then
    local answer=""
    printf 'This DELETES every row of the database of this checkout (%s). Type yes to continue: ' "$root"
    read -r answer
    [ "$answer" = "yes" ] && return 0
    die "Nothing was deleted."
  fi
  die "This deletes the data of the database of this checkout. Nothing was deleted. To confirm, run the command again with CONFIRM=yes"
}

case "${1:-}" in
  up) cmd_up ;;
  wait) cmd_wait ;;
  down) need_docker; docker compose down; echo "The database is stopped. Its data is kept." ;;
  ps) need_docker; docker compose ps ;;
  logs) need_docker; docker compose logs -f postgres ;;
  destroy) confirm; need_docker; docker compose down -v; echo "The database and its data are deleted." ;;
  reset) confirm; need_docker; docker compose down -v; cmd_up; echo "The database is empty and running." ;;
  *) usage; exit 1 ;;
esac
