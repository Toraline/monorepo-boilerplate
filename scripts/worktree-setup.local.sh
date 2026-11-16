#!/usr/bin/env bash
# This project's own step when a worktree is prepared. The core scripts/worktree.sh
# runs this file at the end of its setup step, inside the worktree, with
# MAIN_CHECKOUT set to the path of the main checkout. "make env" runs it too.
# make sync-skills never creates, changes or removes this file.
#
# What it does: gives the worktree its own database port. Docker Compose already
# names the container and the volume after the folder of the worktree, so each
# worktree has its own PostgreSQL server and its own data. The only value that
# two checkouts could share by mistake is the port on this machine.
# Safe to run again: a worktree that already has its own port keeps it.
set -euo pipefail

here="$(git rev-parse --show-toplevel)"
root="${MAIN_CHECKOUT:-$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")}"
cd "$here"

# The value of POSTGRES_PORT in one .env file; empty when the file or the line is missing.
port_of() {
  [ -f "$1" ] || return 0
  sed -n 's/^POSTGRES_PORT=\([0-9][0-9]*\).*/\1/p' "$1" | tail -1
}

if [ "$here" = "$root" ]; then
  echo "Database port: this is the main checkout; it keeps the port in its .env."
  exit 0
fi
if [ ! -f .env ]; then
  echo "Database port: .env does not exist. Run: make env"
  exit 0
fi

main_port="$(port_of "$root/.env")"
[ -n "$main_port" ] || main_port="$(port_of "$root/.env.example")"
[ -n "$main_port" ] || main_port=5432
current="$(port_of .env)"

if [ -n "$current" ] && [ "$current" != "$main_port" ]; then
  echo "Database port: this worktree already has its own port, $current."
  exit 0
fi

# Ports that other checkouts of this repository use, also when their database is stopped.
used=" $main_port "
while IFS= read -r other; do
  [ "$other" = "$here" ] && continue
  other_port="$(port_of "$other/.env")"
  [ -z "$other_port" ] || used="$used$other_port "
done < <(git worktree list --porcelain | sed -n 's/^worktree //p')

# True when a program on this machine listens on the port.
listening() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

port=$((main_port + 1))
while [ "$port" -le 65535 ]; do
  case "$used" in *" $port "*) ;; *) listening "$port" || break ;; esac
  port=$((port + 1))
done
[ "$port" -le 65535 ] || { echo "Database port: found no free port above $main_port." >&2; exit 1; }

tmp="$(mktemp)"
# Replace the line where it is; add it at the end when .env has no such line.
awk -v port="$port" '
  /^POSTGRES_PORT=/ { if (!done) print "POSTGRES_PORT=" port; done = 1; next }
  { print }
  END { if (!done) print "POSTGRES_PORT=" port }
' .env > "$tmp"
cat "$tmp" > .env
rm -f "$tmp"
echo "Database port: .env now has POSTGRES_PORT=$port (the main checkout uses $main_port)."
