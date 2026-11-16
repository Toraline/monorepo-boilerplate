#!/usr/bin/env bash
# Installs the Python dependencies of the server (apps/api) into its own virtual
# environment, apps/api/.venv. Used by the Makefile: make install-api, and every
# apps/api target when the virtual environment is missing or older than the
# requirements files. Safe to run again.
# This file belongs to the project: make sync-skills never creates, changes or removes it.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"; cd "$root"
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

venv="apps/api/.venv"
want="$(tr -d ' \n' < .python-version)"
# The version of one Python program, as "3.13". Empty when the program does not run.
version_of() { "$1" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || true; }

if [ -x "$venv/bin/python" ]; then
  have="$(version_of "$venv/bin/python")"
  [ "$have" = "$want" ] || die "$venv uses Python ${have:-unknown}, and .python-version says $want. Fix: delete the folder $venv, then run: make install-api"
else
  python=""
  for candidate in "python$want" python3 python; do
    if command -v "$candidate" >/dev/null 2>&1 && [ "$(version_of "$candidate")" = "$want" ]; then
      python="$candidate"; break
    fi
  done
  [ -n "$python" ] || die "Python $want not found (.python-version). Fix on macOS: brew install python@$want. Other systems: https://www.python.org/downloads/"
  echo "apps/api: creating the virtual environment $venv with Python $want..."
  "$python" -m venv "$venv"
fi

echo "apps/api: installing the packages of apps/api/requirements-dev.txt..."
"$venv/bin/python" -m pip install --quiet --disable-pip-version-check -r apps/api/requirements-dev.txt
# The Makefile compares the date of this file with the dates of the requirements files.
touch "$venv/.installed"
echo "apps/api: the dependencies are installed in $venv."
