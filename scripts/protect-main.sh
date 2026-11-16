#!/usr/bin/env bash
# Protects the branch main of this repository on GitHub with one ruleset.
#
#   make protect-main                      asks before it changes anything
#   bash scripts/protect-main.sh --yes     asks no question
#   bash scripts/protect-main.sh --status  changes nothing; prints one word:
#       protected          the repository has a ruleset
#       not-protected      the repository has no ruleset
#       no-github-remote   the remote "origin" is missing or is not on GitHub
#       unknown            GitHub did not answer; the reason is printed after the word
#   --repo <owner>/<name>  another repository than the one of the remote "origin"
#
# The ruleset is named "protect-main". Its 4 rules for the branch main:
#   1. A change needs a pull request. No approval is required, so one person
#      can work alone.
#   2. The automatic check must pass before the merge. Its name is read from
#      .github/workflows/check.yml: the name of the first job.
#   3. No force push.
#   4. The branch cannot be deleted.
#
# It needs the "gh" command, logged in as a person who is an admin of the
# repository. It does nothing when a ruleset with the name "protect-main"
# already exists. GitHub allows rulesets on a private repository only with a
# paid plan; on a public repository every plan has them.
set -euo pipefail

RULESET_NAME="protect-main"
BRANCH="main"
CHECK_WORKFLOW=".github/workflows/check.yml"

fail() {
  echo "$1" >&2
  exit 1
}

confirmed=0
status_only=0
repository=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes) confirmed=1 ;;
    --status) status_only=1 ;;
    --repo)
      [ $# -ge 2 ] || fail "--repo needs a value: --repo <owner>/<name>"
      repository="$2"
      shift
      ;;
    *) fail "Unknown option: $1. Usage: bash scripts/protect-main.sh [--yes] [--status] [--repo <owner>/<name>]" ;;
  esac
  shift
done

# The owner and the name of the repository on GitHub, from the address of the
# remote "origin": git@github.com:owner/name.git or https://github.com/owner/name.git
if [ -z "$repository" ]; then
  address="$(git remote get-url origin 2> /dev/null || true)"
  repository="$(printf '%s\n' "$address" | sed -nE 's#^(git@github\.com:|ssh://git@github\.com/|https://github\.com/)([^/]+/[^/]+)$#\2#p')"
  repository="${repository%.git}"
fi
if ! [[ "$repository" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
  if [ "$status_only" -eq 1 ]; then
    echo "no-github-remote"
    exit 0
  fi
  fail "This repository has no remote \"origin\" on GitHub. Put it on GitHub first (gh repo create <owner>/<name> --private --source . --remote origin --push), then run this again."
fi

command -v gh > /dev/null 2>&1 || {
  if [ "$status_only" -eq 1 ]; then
    echo "unknown: the command gh is not installed"
    exit 0
  fi
  fail "The command \"gh\" is not installed. Install it (https://cli.github.com), run \"gh auth login\", then run this again."
}

# Explains an answer of GitHub that is an error, in one sentence.
reason_of() {
  local answer="$1"
  if grep -qiE 'upgrade|HTTP 403' <<< "$answer"; then
    echo "GitHub refused. Two causes are possible. 1: the plan of the owner of $repository does not allow rulesets on a private repository; make the repository public or change the plan (https://github.com/pricing). 2: you are not an admin of $repository."
  elif grep -qiE 'HTTP 404|not found' <<< "$answer"; then
    echo "GitHub does not find $repository, or your login may not see it. Check: gh repo view $repository"
  elif grep -qiE 'HTTP 401|auth|log ?in' <<< "$answer"; then
    echo "The command gh is not logged in. Run: gh auth login"
  else
    echo "GitHub answered: $(tail -n 1 <<< "$answer")"
  fi
}

existing=""
if ! existing="$(gh api "repos/$repository/rulesets" --paginate --jq '.[].name' 2>&1)"; then
  if [ "$status_only" -eq 1 ]; then
    echo "unknown: $(reason_of "$existing")"
    exit 0
  fi
  fail "The rulesets of $repository could not be read. $(reason_of "$existing") Nothing was changed."
fi

if [ "$status_only" -eq 1 ]; then
  if [ -n "$existing" ]; then echo "protected"; else echo "not-protected"; fi
  exit 0
fi

if grep -qxF "$RULESET_NAME" <<< "$existing"; then
  echo "$repository already has a ruleset named \"$RULESET_NAME\". Nothing was changed."
  echo "See it: https://github.com/$repository/settings/rules"
  exit 0
fi

# The name that GitHub shows for the check: the "name:" of the first job of the
# check workflow, or the id of that job when it has no name.
check_name=""
if [ -f "$CHECK_WORKFLOW" ]; then
  check_name="$(awk '
    /^jobs:/ { in_jobs = 1; next }
    in_jobs && /^[^ #]/ { exit }
    in_jobs && job == "" && /^  [A-Za-z0-9_-]+:/ { job = $1; sub(/:.*/, "", job); next }
    job != "" && /^  [A-Za-z0-9_-]+:/ { exit }
    job != "" && /^    name:/ { name = $0; sub(/^    name:[ \t]*/, "", name); gsub(/^["\047]|["\047]$/, "", name); print name; found = 1; exit }
    END { if (!found && job != "") print job }
  ' "$CHECK_WORKFLOW")"
fi

echo "This creates the ruleset \"$RULESET_NAME\" in $repository, for the branch $BRANCH:"
echo "  1. A change needs a pull request. No approval is required."
if [ -n "$check_name" ]; then
  echo "  2. The check \"$check_name\" ($CHECK_WORKFLOW) must pass before the merge."
else
  echo "  2. No check is required: $CHECK_WORKFLOW does not exist or has no job."
fi
echo "  3. No force push."
echo "  4. The branch cannot be deleted."
echo "After it, nobody pushes to $BRANCH directly, also not you: every change goes through a pull request."

if [ "$confirmed" -ne 1 ]; then
  if [ ! -t 0 ]; then
    fail "Nothing was changed: no question can be asked here. Run it again with --yes: bash scripts/protect-main.sh --yes"
  fi
  printf 'Create it now? Type yes: '
  read -r answer
  if [ "$answer" != "yes" ] && [ "$answer" != "y" ]; then
    echo "Nothing was changed."
    exit 0
  fi
fi

status_checks_rule=""
if [ -n "$check_name" ]; then
  status_checks_rule=",
    { \"type\": \"required_status_checks\", \"parameters\": { \"strict_required_status_checks_policy\": false, \"required_status_checks\": [ { \"context\": \"${check_name//\"/\\\"}\" } ] } }"
fi
body="{
  \"name\": \"$RULESET_NAME\",
  \"target\": \"branch\",
  \"enforcement\": \"active\",
  \"conditions\": { \"ref_name\": { \"include\": [ \"refs/heads/$BRANCH\" ], \"exclude\": [] } },
  \"rules\": [
    { \"type\": \"deletion\" },
    { \"type\": \"non_fast_forward\" },
    { \"type\": \"pull_request\", \"parameters\": { \"required_approving_review_count\": 0, \"dismiss_stale_reviews_on_push\": false, \"require_code_owner_review\": false, \"require_last_push_approval\": false, \"required_review_thread_resolution\": false } }$status_checks_rule
  ]
}"

if ! answer="$(printf '%s\n' "$body" | gh api --method POST "repos/$repository/rulesets" --input - 2>&1)"; then
  fail "The ruleset was not created. $(reason_of "$answer")"
fi
echo "Created the ruleset \"$RULESET_NAME\" in $repository."
echo "See it: https://github.com/$repository/settings/rules"
