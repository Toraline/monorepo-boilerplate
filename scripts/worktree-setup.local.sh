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
#
# The rule: a worktree gets the first port, counting up from 5433, that is not
# the port of the main checkout, not the port of another worktree, and not in
# use by a program on this machine. The script writes a comment line above the
# line POSTGRES_PORT of .env that names the port it chose. A port without that
# line was not chosen by this script (it came from .env.example or from the
# .env of the main checkout), so it is replaced.
# Safe to run again: a worktree keeps the port that this script gave it, also
# while its own database is running on that port.
set -euo pipefail

here="$(git rev-parse --show-toplevel)"
root="${MAIN_CHECKOUT:-$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")}"
cd "$here"

# The first port that a worktree can get. A test sets another value.
first_port="${WORKTREE_FIRST_PORT:-5433}"
# The comment line that this script writes above POSTGRES_PORT. The port follows it.
marker="# The port below was chosen for this worktree by scripts/worktree-setup.local.sh:"

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
# The port that this script wrote into .env in an earlier run; empty when it never did.
given="$(sed -n "s|^$marker \([0-9][0-9]*\)\$|\1|p" .env | tail -1)"

# Ports that other checkouts of this repository use, also when their database is stopped.
used=" $main_port "
while IFS= read -r other; do
  [ "$other" = "$here" ] && continue
  other_port="$(port_of "$other/.env")"
  [ -z "$other_port" ] || used="$used$other_port "
done < <(git worktree list --porcelain | sed -n 's/^worktree //p')

if [ -n "$current" ] && [ "$current" = "$given" ]; then
  case "$used" in
    *" $current "*) ;;
    *)
      echo "Database port: this worktree keeps its own port, $current."
      exit 0
      ;;
  esac
fi

# True when a program on this machine listens on the port. lsof exists on macOS
# and on most Linux systems, and sees a program that listens on any address.
# The second check opens a connection with bash itself: it works with no extra
# tool, and it also finds a program of another user, which lsof does not show
# on Linux.
listening() {
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; then
    return 0
  fi
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

port="$first_port"
while [ "$port" -le 65535 ]; do
  case "$used" in *" $port "*) ;; *) listening "$port" || break ;; esac
  port=$((port + 1))
done
[ "$port" -le 65535 ] || { echo "Database port: found no free port from $first_port up." >&2; exit 1; }

tmp="$(mktemp)"
# Drop the comment line of an earlier run. Replace the line POSTGRES_PORT where
# it is, with the comment line above it; add both at the end when .env has no such line.
awk -v port="$port" -v marker="$marker" '
  index($0, marker) == 1 { next }
  /^POSTGRES_PORT=/ { if (!done) { print marker " " port; print "POSTGRES_PORT=" port }; done = 1; next }
  { print }
  END { if (!done) { print marker " " port; print "POSTGRES_PORT=" port } }
' .env > "$tmp"
cat "$tmp" > .env
rm -f "$tmp"
echo "Database port: .env now has POSTGRES_PORT=$port (the main checkout uses $main_port)."
