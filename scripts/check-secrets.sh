#!/usr/bin/env bash
# Refuses a commit that adds a password, token, private key or connection string,
# or a private name.
# Runs as the git pre-commit hook (.githooks/pre-commit). Install: make hooks
#
# Private names: names that must never be in this repository, for example the
# name of a private repository, of a customer or of a person. They are not
# written in this file, because this file is committed. Each person keeps them
# in a file that git ignores, in the main checkout:
#   local-docs/private-names.txt
# One name per line. A line that starts with # is a comment. Upper and lower
# case count as the same letter. A name matches inside a longer word too.
# When the file does not exist, only the secrets are checked.
# PRIVATE_NAMES_FILE names another file; the tests use it.
#
# Two ways to run it:
#   bash scripts/check-secrets.sh
#       checks what "git add" staged. This is what the pre-commit hook does.
#   CHECK_SECRETS_BASE=<commit> bash scripts/check-secrets.sh
#       checks what the commits from <commit> to HEAD changed. The automatic
#       check on GitHub runs it this way for a pull request, because a commit
#       that was made with "git commit --no-verify", or on a machine that
#       never ran "make hooks", did not pass the hook.
#
# What it cannot do: it knows the form of the tokens of some services, and the
# form NAME=value of a password line. A secret in another form passes.
set -euo pipefail

# The tokens of GitHub (ghp_, gho_, ghu_, ghs_, ghr_, github_pat_), npm (npm_),
# OpenAI and others (sk-), Stripe (sk_live_, sk_test_, rk_live_, rk_test_,
# whsec_), AWS (AKIA), Google (AIza), Slack (xox), Notion (ntn_), Linear
# (lin_api_), Figma (figd_); a private key; an address with a name and a password.
patterns='(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{20,}|[sr]k_(live|test)_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|ntn_[A-Za-z0-9]{20,}|lin_api_[A-Za-z0-9]{20,}|figd_[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[a-z]+://[^/ :@]+:[^/ @]{3,}@[A-Za-z0-9.-]+)'

# A line of the form NAME=value, where NAME is in capital letters and holds
# PASSWORD, PASSWD, SECRET, TOKEN, API_KEY or PRIVATE_KEY, and the value has 8
# characters or more. The line starts with the "+" of git diff.
assignment='^\+[[:space:]]*(export[[:space:]]+)?[A-Z0-9_]*(PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)[A-Z0-9_]*=["'"'"']?[^[:space:]"'"'"']{8,}'
# The values that are no secret: a sample value of this repository (it starts
# with "sample-"), a variable ($NAME, ${NAME}), a placeholder (<...>, {{...}},
# PASTE_..., ...example...).
harmless_value='=["'"'"']?(sample-|\$|<|\{|PASTE|[^[:space:]]*example)'

main_checkout="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
names_file="${PRIVATE_NAMES_FILE:-$main_checkout/local-docs/private-names.txt}"
names=""
if [ -f "$names_file" ]; then
  names="$(grep -Ev '^[[:space:]]*(#|$)' "$names_file" || true)"
fi

# What is compared: the staged files with HEAD, or HEAD with CHECK_SECRETS_BASE.
base="${CHECK_SECRETS_BASE:-}"
changes() {
  if [ -n "$base" ]; then git diff "$base" HEAD "$@"; else git diff --cached "$@"; fi
}
# The content of a file as the commit holds it.
content_of() {
  if [ -n "$base" ]; then git cat-file blob "HEAD:$1"; else git cat-file blob ":$1"; fi
}

found=0
found_name=0
while IFS= read -r file; do
  [ -n "$file" ] || continue
  # The lines that the commit adds to the file. They are read into a variable
  # first: a search that stops at its first match must not end a pipe early,
  # because "pipefail" would then report a failure and hide the match.
  added="$(changes -U0 -- "$file" | grep -E '^\+' | grep -Ev '^\+\+\+' || true)"
  # The name itself is never printed: the output of a commit can end up in a log.
  if [ -n "$names" ] && grep -Fiq -f <(printf '%s\n' "$names") <<< "$file"$'\n'"$added"; then
    echo "Refused: $file adds a private name, or has one in its path. The names are in $names_file" >&2
    found_name=1
  fi
  case "$file" in
    .env.example|*/.env.example|*.lock|package-lock.json|*/package-lock.json|scripts/check-secrets.sh) continue ;;
    # An env file in any folder, for example apps/api/.env or .env.local.
    .env|.env.*|*/.env|*/.env.*) echo "Refused: $file is an env file and must not be committed." >&2; found=1; continue ;;
  esac
  # git shows no lines for a binary file (a picture, an archive). Its whole
  # content is searched for the form of a token.
  if [ "$(changes --numstat -- "$file" | cut -f1)" = "-" ]; then
    # "grep -c" reads the whole content, so the pipe never ends early.
    if [ "$(content_of "$file" | LC_ALL=C grep -aEc "$patterns" || true)" != "0" ]; then
      echo "Refused: $file is a binary file that holds something that looks like a secret." >&2
      found=1
    fi
    continue
  fi
  assigned="$(grep -E "$assignment" <<< "$added" || true)"
  if grep -Eq "$patterns" <<< "$added"; then
    echo "Refused: $file adds something that looks like a secret." >&2
    found=1
  elif [ -n "$assigned" ] && grep -Evq "$harmless_value" <<< "$assigned"; then
    echo "Refused: $file adds a line that sets a password, a secret, a token or a key to a value." >&2
    echo "  A sample value is accepted when it starts with \"sample-\"." >&2
    found=1
  fi
# R: a file that was renamed, with or without a change, is checked as a new file.
done < <(changes --name-only --no-renames --diff-filter=ACMR)

if [ "$found" -ne 0 ]; then
  echo "Remove the secret (use a placeholder and keep the real value in .env), then commit again." >&2
fi
if [ "$found_name" -ne 0 ]; then
  echo "Replace the private name with a neutral phrase (for example \"an earlier private project\"), then commit again." >&2
fi
if [ "$found" -ne 0 ] || [ "$found_name" -ne 0 ]; then
  exit 1
fi
