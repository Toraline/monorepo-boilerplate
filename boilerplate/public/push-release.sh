#!/usr/bin/env bash
# Sends a public copy to the public repository as ONE commit on the branch
# release/v<version>, and opens the release pull request there.
#
#   bash boilerplate/public/push-release.sh <version> <folder of the public copy>
#
# The workflow "Release" of the development repository runs it
# (.github/workflows/release.yml). It creates no tag and publishes nothing:
# the workflow "Publish" of the public repository does that after the pull
# request is merged. The steps for a person: docs/releasing.md.
#
# What it does:
#   1. Clones the public repository. Stops when it has no branch main.
#   2. Stops when the version is not higher than every release tag there.
#   3. Makes one commit on a new branch release/v<version>. The parent of the
#      commit is main of the public repository. The files of the commit are
#      exactly the files of the public copy.
#   4. Pushes the branch. When the branch already exists there with the same
#      files, it keeps it. With other files, it stops and says what to do.
#   5. Opens the pull request "Release v<version>" to main, with the "gh"
#      command. When one is already open for the branch, it keeps it.
#
# Environment variables:
#   PUBLIC_REPOSITORY      owner/name on GitHub. Default: Toraline/monorepo-boilerplate
#   PUBLIC_REPOSITORY_URL  the address that git uses. Default: https://github.com/<PUBLIC_REPOSITORY>.git
#   SOURCE_COMMIT          the commit of the development repository that the copy was made from. The
#                          message of the release commit then ends with the line "Development commit: <id>",
#                          so that the release can be found again in the development repository.
#   SKIP_PULL_REQUEST=1    do steps 1 to 4 only (to try the script with a local folder as the address)
#   GH_TOKEN               read by "gh" and, after "gh auth setup-git", by git. This script never prints it.
set -euo pipefail

fail() {
  echo "$1" >&2
  exit 1
}

[ $# -eq 2 ] || fail "Usage: bash boilerplate/public/push-release.sh <version> <folder of the public copy>"
version="$1"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "\"$version\" is not a version. A version is three numbers, for example 0.1.2."
[ -d "$2" ] || fail "The folder $2 does not exist. Make the public copy first: bash boilerplate/public/make-public-copy.sh <folder>"
copy="$(cd "$2" && pwd -P)"

repository="${PUBLIC_REPOSITORY:-Toraline/monorepo-boilerplate}"
address="${PUBLIC_REPOSITORY_URL:-https://github.com/$repository.git}"
branch="release/v$version"
# The commit is made by the workflow, not by a person: the name and the
# address that GitHub gives to its own actions.
author_name="github-actions[bot]"
author_email="41898282+github-actions[bot]@users.noreply.github.com"

[ ! -e "$copy/.git" ] || fail "$copy holds a folder .git: it is a repository, not a public copy."
copy_version="$(tr -d '[:space:]' < "$copy/boilerplate/VERSION" 2> /dev/null || true)"
[ "$copy_version" = "$version" ] || fail "You asked for version $version, and boilerplate/VERSION of the copy says \"$copy_version\"."
[ -f "$copy/boilerplate/updates/$version.json" ] || fail "The copy has no file boilerplate/updates/$version.json. A release needs its updates file."

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# higher_version <first> <second>: true when the first version is higher than the second.
higher_version() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | tail -n 1)" = "$1" ]
}

echo "Reading $address."
git clone --quiet -- "$address" "$work/public" 2> "$work/clone-error" \
  || fail "The public repository could not be read: $(tail -n 1 "$work/clone-error")"
cd "$work/public"
git rev-parse --verify --quiet origin/main > /dev/null \
  || fail "The public repository has no branch main. It must hold the first releases before this workflow can add one: docs/releasing.md, \"One-time setup\"."

newest=""
while IFS= read -r tag; do
  tag_version="${tag#v}"
  [[ "$tag_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue
  if [ -z "$newest" ] || higher_version "$tag_version" "$newest"; then newest="$tag_version"; fi
done < <(git tag --list 'v*')
if [ -n "$newest" ]; then
  higher_version "$version" "$newest" \
    || fail "The public repository already has the release $newest. Version $version is not higher. Raise the version first (docs/releasing.md)."
  echo "The last released version in the public repository: $newest. This release: $version."
else
  echo "The public repository has no release tag yet. This release: $version."
fi

# The new branch starts at main of the public repository. Every file is
# removed, then the files of the copy are written: the commit holds exactly
# the copy.
git checkout --quiet -b "$branch" origin/main
git rm -r --quiet --ignore-unmatch -- . > /dev/null
tar -c -f - -C "$copy" . | tar -x -f - -C .
git add --all --force
if git diff --cached --quiet; then
  fail "Nothing to release: main of the public repository already holds exactly the files of this copy."
fi

node "$copy/boilerplate/public/release-text.mjs" "$version" commit "$copy" > "$work/commit-message"
if [ -n "${SOURCE_COMMIT:-}" ]; then
  [[ "$SOURCE_COMMIT" =~ ^[0-9a-f]{40}$ ]] || fail "SOURCE_COMMIT must be the full id of a commit (40 characters)."
  printf '\nDevelopment commit: %s\n' "$SOURCE_COMMIT" >> "$work/commit-message"
fi
GIT_AUTHOR_NAME="$author_name" GIT_AUTHOR_EMAIL="$author_email" \
GIT_COMMITTER_NAME="$author_name" GIT_COMMITTER_EMAIL="$author_email" \
  git -c commit.gpgsign=false -c core.hooksPath=/dev/null commit --quiet --file "$work/commit-message"

echo "What the release changes in the public repository:"
git diff --stat origin/main HEAD | tail -n 1

if git rev-parse --verify --quiet "origin/$branch" > /dev/null; then
  if [ "$(git rev-parse "origin/$branch^{tree}")" = "$(git rev-parse 'HEAD^{tree}')" ] \
    && [ "$(git rev-parse "origin/$branch^")" = "$(git rev-parse origin/main)" ]; then
    echo "The branch $branch already exists in the public repository with the same files. Kept."
  else
    fail "The branch $branch already exists in the public repository with other files, or on an older main. Close its pull request, delete the branch there (git push $address --delete $branch), then start again."
  fi
else
  git push --quiet origin "$branch" 2> "$work/push-error" \
    || fail "The branch $branch could not be pushed: $(tail -n 1 "$work/push-error")"
  echo "Pushed the branch $branch: one commit, $(git rev-parse HEAD)."
fi

if [ "${SKIP_PULL_REQUEST:-}" = "1" ]; then
  echo "SKIP_PULL_REQUEST=1: no pull request was opened."
  exit 0
fi

existing="$(gh pr list --repo "$repository" --head "$branch" --base main --state open --json url --jq '.[0].url')"
if [ -n "$existing" ]; then
  echo "The pull request is already open: $existing"
  exit 0
fi
node "$copy/boilerplate/public/release-text.mjs" "$version" pull-request "$copy" > "$work/pull-request-body"
gh pr create --repo "$repository" --base main --head "$branch" --title "Release v$version" --body-file "$work/pull-request-body"
