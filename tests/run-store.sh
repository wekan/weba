#!/bin/sh
set -eu
: "${TMPDIR:?Set TMPDIR to an absolute repository-local temporary directory}"
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d "$TMPDIR/weba-test.XXXXXX")
trap 'rm -rf -- "$work"' EXIT HUP INT TERM
for test in AuthTest UserDeletionTest SessionGenerationTest NativeAuthTest PasswordPolicyTest StoreTest DragStoreTest WorkspaceTest BoardAccessTest BoardViewPreferenceTest DragHandlePreferenceTest BoardViewPolicyTest InstanceFeaturesTest BoardViewTransferTest SignedBoardViewsTest BoardVisibilityTest BoardVisibilityReadTest PublicBoardCatalogTest PublicAttachmentReadTest GuestBoardReadTest GuestCommandsTest InactiveMembersTest AssignedAccessTest CombinedScopeTest BoardLiveTest OverviewLiveTest BoardCatalogTest BoardOrderTest BoardSpacesTest WorkspaceIconColorTest BoardSpacePresentationTest BoardSpaceDropTest BoardDropTest BoardBatchDropTest BoardSelectionTest BoardSelectedStarsTest HomeBoardTest BoardRouteTest CardRouteTest BoardArchiveTest HomeDropTest HomeCatalogTest BoardPurgeTest ListDeletionTest AttachmentLifecycleTest TransferPolicyTest BoardAttachmentAllowanceTest BoardCopyAuthorizationTest BoardCopiesTest BoardBatchExportTest CachedExportScopeTest ExternalArchiveExportTest RedmineExportTest TasksOrgExportTest ExportNumberTest CopyOptionsTest BoardCreationTest MarkdownPolicyTest MarkdownTitlesTest ExternalLinkPolicyTest ImportExportPolicyTest AttachmentExportNativeTest SingleBoardCopyTest CardDraftTest DetailLiveTest PeopleLiveTest RelationLabelTest CardMembersTest NativeAssigneeTest CardDatesTest CardArchiveTest ItemChangesTest CardContentTest WorkspaceActionsTest BoardTransferTest ExportFieldsTest; do
  [ -f "$root/tests/$test.module" ] || continue
  project="$work/$test"
  mkdir -p "$project"
  # Only sources: each test starts without a database or seeded accounts.
  cp -R "$root/WeKan/.src" "$root/WeKan/.public" "$project/"
  cp "$root/WeKan/.project" "$project/"
  cp "$root/tests/$test.module" "$project/.src/$test.module"
  if [ "$test" = BoardVisibilityTest ]; then cp "$root/tests/BoardVisibilityMatrix.module" "$project/.src/BoardVisibilityMatrix.module"; fi
  "${GBC:-gbc3}" -j 1 -a "$project"
  if [ "$test" = ExternalArchiveExportTest ]; then
    WEBA_TEST_EXTERNAL_ARCHIVE_PROJECT="$project" "${NODE:-node}" "$root/tests/external-archive-export-conformance.test.cjs"
  elif [ "$test" = TasksOrgExportTest ]; then
    WEBA_TEST_TASKSORG_PROJECT="$project" "${NODE:-node}" "$root/tests/tasksorg-export-conformance.test.cjs"
  elif [ "$test" = ExportNumberTest ]; then
    WEBA_TEST_NUMBER_PROJECT="$project" "${NODE:-node}" "$root/tests/export-number-conformance.test.cjs"
  elif [ "$test" = RedmineExportTest ]; then
    WEBA_TEST_REDMINE_PROJECT="$project" "${NODE:-node}" "$root/tests/redmine-export-conformance.test.cjs"
  elif [ "$test" = PublicBoardCatalogTest ]; then
    WEBA_TEST_PUBLIC_PROJECT="$project" "${NODE:-node}" "$root/tests/public-board-catalog-conformance.test.cjs"
  else
    "${GBX:-gbx3}" -s "$test" "$project"
  fi
  if [ "$test" = BoardVisibilityTest ]; then WEBA_TEST_VISIBILITY_PROJECT="$project" "${NODE:-node}" "$root/tests/board-visibility-conformance.test.cjs"; fi
  if [ "$test" = DragHandlePreferenceTest ]; then
    mkdir -p "$project/api-data"
    WEBA_API_REQUEST=1 WEBA_DB_HOST="$project/api-data" "${GBX:-gbx3}" -s "$test" "$project"
  fi
  if [ "$test" = BoardVisibilityReadTest ]; then
    mkdir -p "$project/api-data"
    WEBA_API_REQUEST=1 WEBA_DB_HOST="$project/api-data" "${GBX:-gbx3}" -s "$test" "$project"
  fi
  if [ "$test" = AttachmentExportNativeTest ]; then
    WEBA_API_REQUEST=1 WEBA_TEST_EXPORT_API=1 "${GBX:-gbx3}" -s "$test" "$project"
  fi
done

"${NODE:-node}" "$root/tests/native-scope-conformance.test.cjs"
"${NODE:-node}" "$root/tests/board-catalog-conformance.test.cjs"
"${NODE:-node}" "$root/tests/home-presentation-conformance.test.cjs"
"${NODE:-node}" "$root/tests/home-drop-conformance.test.cjs"
"${NODE:-node}" "$root/tests/board-space-counts-conformance.test.cjs"
"${NODE:-node}" "$root/tests/workspace-drop-conformance.test.cjs"
"${NODE:-node}" "$root/tests/board-drop-conformance.test.cjs"
"${NODE:-node}" "$root/tests/purge-conformance.test.cjs"
"${NODE:-node}" "$root/tests/list-delete-conformance.test.cjs"
"${NODE:-node}" "$root/tests/attachment-conformance.test.cjs"
"${NODE:-node}" "$root/tests/transfer-policy-conformance.test.cjs"
"${NODE:-node}" "$root/tests/board-copy-conformance.test.cjs"
"${NODE:-node}" "$root/tests/selected-copy-conformance.test.cjs"
"${NODE:-node}" "$root/tests/copy-options-conformance.test.cjs"
"${NODE:-node}" "$root/tests/board-creation-conformance.test.cjs"
"${NODE:-node}" "$root/tests/import-export-policy-conformance.test.cjs"
"${NODE:-node}" "$root/tests/batch-export.test.cjs"

python3 "$root/tests/change-clock.test.py"

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

"${NODE:-node}" "$root/tests/board-view-policy-conformance.test.cjs"
"${NODE:-node}" "$root/tests/board-view-order-conformance.test.cjs"
"${NODE:-node}" "$root/tests/drag-handles-conformance.test.cjs"
"${NODE:-node}" "$root/tests/board-view-transfer-conformance.test.cjs"
"${NODE:-node}" "$root/tests/instance-features-conformance.test.cjs"
