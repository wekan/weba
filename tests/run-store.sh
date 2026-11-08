#!/bin/sh
set -eu
: "${TMPDIR:?Set TMPDIR to an absolute repository-local temporary directory}"
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d "$TMPDIR/weba-test.XXXXXX")
trap 'rm -rf -- "$work"' EXIT HUP INT TERM
for test in AuthTest UserDeletionTest SessionGenerationTest PasswordPolicyTest StoreTest DragStoreTest WorkspaceTest BoardAccessTest InactiveMembersTest AssignedAccessTest CardMembersTest CardDatesTest CardContentTest WorkspaceActionsTest BoardTransferTest; do
  [ -f "$root/tests/$test.module" ] || continue
  project="$work/$test"
  mkdir -p "$project"
  # Only sources: each test starts without a database or seeded accounts.
  cp -R "$root/WeKan/.src" "$root/WeKan/.public" "$project/"
  cp "$root/WeKan/.project" "$project/"
  cp "$root/tests/$test.module" "$project/.src/$test.module"
  "${GBC:-gbc3}" -j 1 -a "$project"
  "${GBX:-gbx3}" -s "$test" "$project"
done

project="$work/registration-race"
mkdir -p "$project"
cp -R "$root/WeKan/.src" "$root/WeKan/.public" "$project/"
cp "$root/WeKan/.project" "$project/"
cp "$root/tests/RegistrationRace.module" "$project/.src/RegistrationRace.module"
"${GBC:-gbc3}" -j 1 -a "$project"
WEBA_TEST_MODE=prepare "${GBX:-gbx3}" -s RegistrationRace "$project"
WEBA_TEST_MODE=register WEBA_TEST_USER=parallel-one "${GBX:-gbx3}" -s RegistrationRace "$project" &
first=$!
WEBA_TEST_MODE=register WEBA_TEST_USER=parallel-two "${GBX:-gbx3}" -s RegistrationRace "$project" &
second=$!
status=0
wait "$first" || status=1
wait "$second" || status=1
[ "$status" = 0 ]
WEBA_TEST_MODE=verify "${GBX:-gbx3}" -s RegistrationRace "$project"

project="$work/registration-commit"
mkdir -p "$project"
cp -R "$root/WeKan/.src" "$root/WeKan/.public" "$project/"
cp "$root/WeKan/.project" "$project/"
cp "$root/tests/RegistrationCommitTest.module" "$project/.src/RegistrationCommitTest.module"
"${GBC:-gbc3}" -j 1 -a "$project"
python3 "$root/tests/registration-commit.py" "$project"

project="$work/deletion-commit"
mkdir -p "$project"
cp -R "$root/WeKan/.src" "$root/WeKan/.public" "$project/"
cp "$root/WeKan/.project" "$project/"
cp "$root/tests/UserDeletionCommitTest.module" "$project/.src/UserDeletionCommitTest.module"
"${GBC:-gbc3}" -j 1 -a "$project"
python3 "$root/tests/deletion-commit.py" "$project"
