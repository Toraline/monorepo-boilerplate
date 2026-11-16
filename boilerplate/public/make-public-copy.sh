#!/usr/bin/env bash
# Writes the public copy of this repository into a folder: the files that go
# into the public repository, Toraline/monorepo-boilerplate.
#
#   bash boilerplate/public/make-public-copy.sh <new folder> [<commit, tag or branch>]
#       1. Writes every file that git tracks at the commit (default: HEAD).
#       2. Leaves out each path of boilerplate/public/private-files.txt.
#       3. Copies each file of boilerplate/public/overlay/ to the same path
#          from the root folder: the files that only the public repository has.
#       4. Checks the copy for secrets and for private names, with
#          scripts/check-secrets.sh. With a hit it ends with code 1. It never
#          prints a private name.
#       The same commit always gives the same files with the same content.
#       The list and the overlay are read from the commit, not from the
#       working files.
#
#   bash boilerplate/public/make-public-copy.sh --apply-rules <folder>
#       Does only steps 2 and 3, in a folder that already holds the files.
#       The tests of the two npm commands use it: a new monorepo is created
#       from the public copy, so the tests create it from the public copy too.
#
# The private names: the file local-docs/private-names.txt of the main
# checkout, or the file that PRIVATE_NAMES_FILE names (scripts/check-secrets.sh
# says more). When that file does not exist, only the secrets are checked, and
# the script says so.
set -euo pipefail

RULES_FOLDER="boilerplate/public"
PRIVATE_LIST="$RULES_FOLDER/private-files.txt"
OVERLAY_FOLDER="$RULES_FOLDER/overlay"

fail() {
  echo "$1" >&2
  exit 1
}

# apply_rules <folder>: leaves out the private paths, then writes the public files.
apply_rules() {
  local folder="$1" line entry
  [ -f "$folder/$PRIVATE_LIST" ] || fail "$folder/$PRIVATE_LIST does not exist: the folder is not a copy of the boilerplate."
  while IFS= read -r line || [ -n "$line" ]; do
    # Remove the spaces at both ends of the line.
    entry="${line#"${line%%[![:space:]]*}"}"
    entry="${entry%"${entry##*[![:space:]]}"}"
    case "$entry" in
      ""|"#"*) continue ;;
      /*|..|../*|*/..|*/../*|.|.git|.git/*) fail "$PRIVATE_LIST: the path \"$entry\" is not a path inside the repository." ;;
    esac
    if [ -e "$folder/$entry" ] || [ -L "$folder/$entry" ]; then
      rm -rf -- "${folder:?}/$entry"
      echo "Left out: $entry"
    else
      echo "Left out: $entry (it is not in this copy)"
    fi
  done < "$folder/$PRIVATE_LIST"

  [ -d "$folder/$OVERLAY_FOLDER" ] || return 0
  local file
  while IFS= read -r file; do
    file="${file#./}"
    mkdir -p "$(dirname "$folder/$file")"
    rm -rf -- "${folder:?}/$file"
    # -P: a link stays a link.
    cp -P "$folder/$OVERLAY_FOLDER/$file" "$folder/$file"
    echo "Public file: $file"
  done < <(cd "$folder/$OVERLAY_FOLDER" && find . \( -type f -o -type l \) | LC_ALL=C sort)
}

# check_copy <folder> <names file>: runs the secret check of the copy over every file of the copy.
check_copy() {
  local folder="$1" names_file="$2" check_folder status=0
  check_folder="$(mktemp -d)"
  # A git repository beside the copy, never inside it: it lists every file of
  # the copy as added, which is what scripts/check-secrets.sh reads.
  git init --quiet "$check_folder/repository"
  if [ -f "$names_file" ]; then
    echo "Checking the copy for secrets and for the private names of $names_file."
  else
    echo "Checking the copy for secrets. NOT checked: private names, because $names_file does not exist."
  fi
  (
    cd "$folder"
    export GIT_DIR="$check_folder/repository/.git" GIT_WORK_TREE="$folder"
    git add --all --force
    PRIVATE_NAMES_FILE="$names_file" CHECK_SECRETS_BASE="" bash scripts/check-secrets.sh
  ) || status=1
  rm -rf "$check_folder"
  return "$status"
}

if [ "${1:-}" = "--apply-rules" ]; then
  [ $# -eq 2 ] && [ -d "$2" ] || fail "Usage: bash boilerplate/public/make-public-copy.sh --apply-rules <folder>"
  apply_rules "$(cd "$2" && pwd)"
  exit 0
fi

[ $# -ge 1 ] && [ $# -le 2 ] || fail "Usage: bash boilerplate/public/make-public-copy.sh <new folder> [<commit, tag or branch>]"
output="$1"
reference="${2:-HEAD}"

root="$(git rev-parse --show-toplevel)"
commit="$(git -C "$root" rev-parse --verify --quiet "${reference}^{commit}")" \
  || fail "\"$reference\" is not a commit, a tag or a branch of this repository."
names_file="${PRIVATE_NAMES_FILE:-$(dirname "$(git -C "$root" rev-parse --path-format=absolute --git-common-dir)")/local-docs/private-names.txt}"

if [ -e "$output" ]; then
  [ -d "$output" ] || fail "$output is a file, not a folder."
  [ -z "$(ls -A "$output")" ] || fail "The folder $output is not empty. Nothing was changed. Name a folder that does not exist yet."
fi
mkdir -p "$output"
output="$(cd "$output" && pwd -P)"
case "$output/" in
  "$(cd "$root" && pwd -P)/"*) rmdir "$output"; fail "The folder must be outside the repository: $output is inside $root." ;;
esac

git -C "$root" archive --format=tar "$commit" | tar -x -f - -C "$output"
apply_rules "$output"

if ! check_copy "$output" "$names_file"; then
  fail "The public copy in $output must NOT be published: it holds a secret or a private name. The lines above name each file. Correct the files in a commit, then run this again."
fi
echo "The public copy of $commit is in $output: $(find "$output" \( -type f -o -type l \) | wc -l | tr -d ' ') files."
