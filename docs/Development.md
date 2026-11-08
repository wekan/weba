# WeBa development

The Gambas application project is `WeKan/`. When this checkout is under a
WeKan workspace, shared repository instructions live in that workspace's root
`AGENTS.md` and `CLAUDE.md`. Project-specific development information lives here
and in the [README](../README.md), rather than in duplicate instruction files.

## Source map

| Area | Files |
| --- | --- |
| Login and registration | `WeKan/.src/WebformLogin.class` and `.webform` |
| Native navigation, editors and live board checks | `WeKan/.src/WebformMain.class`, `.webform`, `BoardLive.module`, `CardDraft.module` |
| Accounts, sessions and connection | `WeKan/.src/WebDatabase.module`, `WebIdentity.module`, `ApiTokens.module` |
| Board/card persistence and permissions | `KanbanStore.module`, `BoardAccess.module`, `ApiMemberRoles.module` |
| REST routing and projections | `RestApi.module`, `BoardRestData.module` |
| UTC dates, archive history and change clocks | `CardDates.module`, `CardArchive.module`, `ItemChanges.module` |
| Workspace menus, transfer and rich content | `WorkspaceStore.module`, `WorkspaceActions.module`, `BoardTransfer.module`, `CardContent.module` |
| Embedded report components | `WeKan/.public/kanban.js`, `kanban.css`, `ui.js` |
| Local CGI host | `runtime/server.py` |
| Build, checks and packaging | `build.sh`, `tests/`, `releases/`, `.github/workflows/` |

`TODO.md` records completed verification, current work and remaining parity gaps.
The two project changelogs are `CHANGELOG.md` (Upcoming plain bullets) and
`WeKan/.hidden/CHANGELOG` (dated Gambas entries). Generated output belongs in
ignored locations such as `dist/`; no runtime user database belongs in a package.

## Gambas tools

`build.sh` discovers a standalone `.tools/` or the containing workspace's tools
directory. `WEBA_TOOLS_DIR` selects it explicitly. The preferred installation is
`bin/gambas`, with the earlier `bin/gambas3` layout as a fallback.
`GAMBAS_PREFIX` selects a relocated installation; `GAMBAS_ROOT` supplies the
compiler's `-r` prefix. Executable overrides are `GBC`, `GBX`, `GBA`, `GBR` and
`NODE`. Relocated runtimes may also need `GB_PATH` and `LD_LIBRARY_PATH`.

Use `./build.sh doctor` to inspect the toolchain and `./build.sh test` for local
checks. The build uses one compiler job (`gbc3 -j 1 -a WeKan`). The menu's
**Copy Gambas to Flatpak Sandbox** copies the host tools/components/dependencies;
CPU and libc compatibility still require verification. See the README's build,
Flatpak and packaging sections for the current commands and target limitations.

Create repository-local `.tools/tmp` and export its absolute path as `TMPDIR`
before compilers/test runners. Tests create isolated projects/databases there;
never point a test at deployed data. A passing local SQLite/Linux ARM64 run does
not establish support for every writable Gambas driver or release platform.

## Persistence and verification details

SQLite is the tested default. Production schema uses Gambas `Connection.Tables`
and field/primary-key APIs; data uses bound parameters, portable operations and
`DatabaseTransactions`. SQLite-specific triggers/DDL in isolated tests inject
failures and are not production migrations. Driver components and independent
conformance are needed before claiming another database is verified.

`Crypt.Check` returns True on a mismatch. Authentication checks must cover both
password outcomes; first registration, optional length policy and stored session
versions have dedicated tests. Native cookies and Bearer tokens are separate.

`ItemChanges.Mark` is an internal hook called only after the owning mutation has
authorized its operation. Its clocks must share that mutation's transaction.
Native card visibility uses raw assigned-only flags independently of canonical
role precedence. Preserve this distinction when adding card readers/writers:
role capabilities decide the action, while RequireCard/CardRows constrain the
card. Native global site administration does not bypass that scope; the explicit
private REST override is scoped and reset separately. The native 256-case
conformance test compares actual queries with the parent source functions.

Whole-board clock reads require full-card scope. Use `Collection.Add` when a
wire object must retain a typed empty string: indexed assignment removes it,
and Gambas 3.20 `JSONCollection._put` converts it to null.

The HTTP tests run source and packaged paths. `WEKAN_SOURCE` can select a
reference checkout for unchanged original callbacks/helper comparisons, including
list reduction and implemented single-card/checklist serialization; absent
reference checks report a skip. Those partial checks and Chromium workflows do
not establish that the complete original UI/API/security suites pass. See the
README and TODO for the exact current coverage and remaining work.

## Open-board synchronization

`BoardPoll_Timer` uses a native one-second WebTimer event through the authenticated
same-origin command transport. Its private `BoardLive.State` reads authorized
visible rows and never creates clocks, activities or a client-visible version
value. Include every rendered field when extending it. Capture state before
render queries, so a concurrent mutation cannot be hidden by a newer post-render
snapshot. Recheck scope when clearing stale open panels; keep permitted drafts
unchanged. Deep-pane synchronization and complete inline-edit/unsaved-draft UX
remain separate work.

Run `WEBA_BROWSER_URL=http://127.0.0.1:9231 ./build.sh test-live` against a local
Chromium CDP service for both source and packaged original archive callbacks.
The adapter supplies explicit SQLite fixtures and an actual Playwright page;
original callbacks/assertions remain unchanged. Unit/native checks cover stable
read-only state, hidden-card isolation, layout/settings and scope revocation.
Heartbeat efficiency and complete source reactivity remain TODO items.

## Native editor saves

`CardDraft.Read` supplies both the editor fields and the private opening baseline
from the same authorized read. Existing-card native Save passes that baseline to
`KanbanStore.SaveCard`; it merges against the current row only after existing
user/board/card locks and permission rechecks. Values equal to the baseline keep
current data. Changed values win independently; lane/status/list form one
placement group. Preserve the existing full-replacement contract when no baseline
is supplied, as used by creation/import and other internal store operations.

Keep current-assignee and due-day comparisons after merging so an unrelated edit
cannot reset raw people sequences or precise dates. Programmatic committed
menu/people updates advance only their affected baseline fields. Refresh the
whole baseline/UI only after success; failed transactions leave it reusable.
Use typed empty strings in baseline collections. Add coverage for baseline and
merge paths when introducing an editable field, alongside full-save callers.

`CardDraftTest` and real browser Save exercise the old data-loss case. SQL lock
injection verifies the current row is read after locking; two failed-COMMIT/retry
phases inspect exact rollback and preserved other fields/relations/dates.
