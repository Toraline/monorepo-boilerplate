#!/usr/bin/env bash
# This project's own checks, run by "make doctor" after the core checks (scripts/doctor.sh):
# Docker, Docker Compose, npm, the JavaScript packages of the web apps, Python,
# the virtual environment of the server and the state of the database.
# Node and .env are checked by the core doctor.
# This file belongs to the project: make sync-skills never creates, changes or removes it.
set -uo pipefail
root="$(git rev-parse --show-toplevel)"; cd "$root"
fail=0
ok()   { echo "OK      $*"; }
warn() { echo "WARNING $*"; }
bad()  { echo "FAIL    $*"; fail=1; }

echo "=== doctor: tools of this project ==="

# npm (it comes with Node)
if command -v npm >/dev/null 2>&1; then ok "npm $(npm --version)"
else bad "npm not found. Fix: install Node with nvm (nvm install); npm comes with it"; fi

# The JavaScript packages of the npm workspace: apps/web (http://localhost:3000),
# apps/internal (http://localhost:3001) and packages/shared.
if [ -f apps/web/package.json ] || [ -f apps/internal/package.json ]; then
  if [ ! -f node_modules/.package-lock.json ]; then
    warn "the dependencies of apps/web, apps/internal and packages/shared are not installed. Fix: make install-js"
  elif [ package-lock.json -nt node_modules/.package-lock.json ]; then
    warn "the dependencies of apps/web, apps/internal and packages/shared are older than package-lock.json. Fix: make install-js"
  else
    ok "the dependencies of apps/web, apps/internal and packages/shared are installed (node_modules)"
  fi
  # The web apps read the address of the server from .env.
  if [ -f .env ] && ! grep -q '^NEXT_PUBLIC_API_BASE_URL=' .env; then
    warn ".env has no line NEXT_PUBLIC_API_BASE_URL: the web apps then call http://localhost:8000. Fix: copy the line from .env.example into .env"
  fi
fi

# Docker
docker_ready=0
if ! command -v docker >/dev/null 2>&1; then
  bad "Docker not found. Fix: install Docker Desktop (https://docs.docker.com/get-started/get-docker/) and open it"
elif ! docker info >/dev/null 2>&1; then
  bad "Docker is installed but it is not running. Fix: open Docker Desktop and wait until it shows that the engine is running"
elif ! docker compose version >/dev/null 2>&1; then
  bad "Docker Compose not found. Fix: update Docker Desktop; it includes Docker Compose"
else
  docker_ready=1
  ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null), Docker Compose $(docker compose version --short 2>/dev/null)"
fi

# Python. The version is in .python-version. The server (apps/api) needs it.
want="$(tr -d ' \n' < .python-version 2>/dev/null)"
if [ -n "$want" ]; then
  have=""
  for candidate in "python$want" python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      version="$("$candidate" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null)"
      if [ "$version" = "$want" ]; then have="$candidate"; break; fi
    fi
  done
  fix="Fix on macOS: brew install python@$want. Other systems: https://www.python.org/downloads/"
  if [ -n "$have" ]; then ok "Python $want ($have)"
  elif [ -d apps/api ]; then bad "Python $want not found (.python-version). $fix"
  else warn "Python $want not found (.python-version). Nothing needs it until apps/api exists. $fix"; fi
fi

# The virtual environment of the server
if [ -d apps/api ]; then
  if [ -f apps/api/.venv/.installed ]; then ok "the dependencies of apps/api are installed (apps/api/.venv)"
  else warn "the dependencies of apps/api are not installed. Fix: make install-api"; fi
fi

# Database
if [ "$docker_ready" -eq 1 ]; then
  port="$(sed -n 's/^POSTGRES_PORT=\([0-9][0-9]*\).*/\1/p' .env 2>/dev/null | tail -1)"; port="${port:-5432}"
  if [ -n "$(docker compose ps -q --status running postgres 2>/dev/null)" ]; then ok "the database is running on 127.0.0.1:$port"
  else warn "the database is not running. Fix: make db-up"; fi
fi

echo
[ "$fail" -eq 0 ] && echo "All required checks of this project passed." || echo "Fix the FAIL lines above and run make doctor again."
exit "$fail"
