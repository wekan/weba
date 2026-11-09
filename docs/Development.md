# WeBa development

The Gambas application project is `WeKan/`. When this checkout is under a
WeKan workspace, shared repository instructions live in that workspace's root
`AGENTS.md` and `CLAUDE.md`. Project-specific development information lives here
and in the [README](../README.md), rather than in duplicate instruction files.

## Source map

| Area | Files |
| --- | --- |
| Login and registration | `WeKan/.src/WebformLogin.class` and `.webform` |
| Native navigation, editors and live board checks | `WeKan/.src/WebformMain.class`, `.webform`, `BoardLive.module`, `CardDraft.module`, `DetailLive.module`, `EntryDraft.module`, `PeopleLive.module` |
| Accounts, sessions and connection | `WeKan/.src/WebDatabase.module`, `WebIdentity.module`, `ApiTokens.module` |
| Board/card persistence and permissions | `KanbanStore.module`, `BoardAccess.module`, `ApiMemberRoles.module`, `BoardCatalog.module`, `BoardOrder.module` |
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
unchanged. People/roster synchronization and complete inline-edit/unsaved-draft
UX remain separate work.

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

## Detail pane updates and entry saves

`DetailLive.Read` builds authorized current-kind entry/checklist data and explicit
binary-free file summaries. Keep comparison state private and advance it only
after the pane rebuild succeeds; retain a pre-rebuild encoded snapshot because
preserving dirty entry baselines mutates local collections. Unchanged snapshots
leave the tree/form intact. Rebuilds preserve dirty fields, update clean fields,
retain valid parent IDs and clear deleted selections. Do not substitute the first
checklist when a draft's selected parent disappeared. Reapply comment author and
role restrictions to refreshed forms; server save guards remain authoritative.

`EntryDraft` canonicalizes nullable legacy/timer values and merges fields within
`CardContent.SaveEntry` after existing locks, permission and author checks. Copy/
full-save paths omit this baseline. Preserve explicit type/value grouping and
reject stale value edits across external custom-type changes. Foreign/orphan
native relationships are filtered before collection reads, alongside assigned
scope. Full source cross-board hierarchy remains pending.

`DetailLiveTest`, the two-user `details-live.browser.cjs` run by test-live, existing
native browser regressions and two entry-draft COMMIT/retry phases cover the
implemented behavior. The complete original suite still has unexecuted cases;
these additional native tests do not increase the original callback count.

## Relationship display titles

`EntryDraft.Read` supplies the current authorized target title for dependencies
and subtasks; use it for pane snapshots and selected display fields. `Record`
retains the stored row representation used by entry merging. Display reads never
rewrite the cached title or create history. Existing save validation still derives
the relationship title from its validated target. Generated title fields are
read-only while new-subtask creation retains its editable title.

Collection reads filter foreign/orphan and unassigned targets; selected reads
also recheck root/target authorization. Permission loss removes a target from an
open pane without closing a still-readable source card, and restoration brings
back its current title. `RelationLabelTest` and the two-user test-live scenarios
cover these paths. Full source cross-board hierarchy, dependency metadata and
navigation remain pending; original callback counts and COMMIT phases are unchanged.


## Live people panes

`PeopleLive` returns server-private snapshots after fresh board/card authorization.
Roster rows contain only public username and role, sorted deterministically. Card
snapshots keep member and assignee arrays separate and preserve raw order and
repetitions; only the native display deduplicates names. Reads write no history.
Use the current active roster for candidates, never a full user record.

`BoardPoll_Timer` checks visible people panes even when a roster was opened from
home with no selected board. Each pane records its snapshot only after successful
rendering. Loading flags suppress programmatic selection events. Preserve a valid
row/candidate by identity; clear a vanished candidate and disable Add instead of
silently choosing somebody else. Refresh role capabilities and let existing server
mutation methods recheck them on every submitted action.

The board roster editor tracks its last selected user/role. Clean fields advance
with external role changes; invitation and role drafts survive unrelated updates.
Removal of the selected existing user clears its editor. Revocation closes the
pane. Card scope loss clears its title, tree and candidate options alongside the
card editor. `PeopleLiveTest` and the two-user test-live script cover native reads
and actual browser/REST mutations; full original UI/API/security suites remain
incomplete.


## Live overview navigation

`BoardLive.Overview` uses the current user's `KanbanStore.Boards` and scoped card
queries. Include board IDs/titles, shared colors, current-user stars and only
readable card IDs/titles needed by native navigation. Do not include bodies,
hidden card changes or unrelated personal settings just to create a change token.
The JSON string remains server-private.

Poll this state only for All Boards, Starred and Archive overviews. Capture it
before the tree/grid reads in `RefreshTree` and remember it after that refresh
succeeds; otherwise a concurrent mutation or failed tree rebuild could be missed.
Changed snapshots refresh the grid and navigation together. Unchanged snapshots
leave tile DOM nodes intact and independent detail/people polling continues.

Native scope/privacy and two-user menu/membership/archive tests cover these
paths. Full original All Boards custom sorting, search, pagination and workspace
categories, other open-view navigation reactivity and idle cost remain pending.


## All Boards catalog service

`BoardCatalog.Page` accepts native options for search, title sort, category, page
and per-page count. The current WebIdentity supplies the principal; no userId
option is accepted. Missing/stale identities return empty pages. Native global
administration does not bypass membership. Search is literal and uses UTF-8
`String.LCase`; stable SQL title/ID ordering precedes server-side count/slicing.
Default/maximum returned sizes are 25/200. Archived pages are an explicit native
extension, not the default original All Boards method contract.

`SortBy`/`SetSortBy` read and write only the principal's preference. Writes lock
and recheck that account within a transaction. Account cleanup removes these
rows both on deletion and before a reused name is created. Schema/operations use
portable Gambas DB APIs; SQLite/Linux ARM64 is the verified driver/platform.

`BoardCatalogTest` covers invalid native options, explicit null sentinels, stale
sessions, stable/disjoint pages, 205-board limits, Unicode/literal search and
preference cleanup. Ordinary JSON decode can drop null keys; a future JSON
transport must retain them before passing options to this function. No new HTTP
endpoint or raw-JSON service contract is provided by this step.

The source conformance test executes the original getAllBoardsPage body with
actual visibility/facet helpers on independently read native SQL rows. Its
explicit adapter maps implicit native owners to active document memberships and
supplies in-memory Mongo query operations for these fixtures. Only valid source
parameters are compared; Meteor validation, wire/UI callbacks, organizations,
teams, public templates and workspaces/facets remain open. Personal Custom
ordering has separate native and real-gesture coverage below.


## Native catalog controls

`WebformMain` loads the principal's sort on open and refreshes it during overview
polling. Native popup buttons persist title order; board-name search is separate
from card Filter. Search/sort changes reset the page; shrinking totals clamp it.
`BoardCatalog.Unpaged` applies personal BoardOrder positions to all matching IDs,
while Page retains its bounded title-sort service contract.

Compute scoped IDs and update pagination controls before queuing Visual.Refresh.
The render function consumes the private page snapshot, intersects it with fresh
board visibility and emits only the selected tiles in the chosen title order.
Updating button properties from inside Render left stale enabled states in the
browser; retain the pre-render update ordering. Overview change detection still
captures state before reads and commits it after the refresh.

The dedicated fixture is copied only into disposable HTTP projects. Native
catalog browser tests use actual menus/inputs and independently query saved sort
preferences; external native transactions exercise preference changes and page
clamping. Test source and packaged apps, mobile bounds/clicks and imported labels.
Original UI callbacks, workspace/facet semantics and efficient SQL
count/slicing remain separate work.


## Personal board order

`BoardOrder` stores principal/board/index rows with portable Gambas schema APIs.
Save locks the account and selected boards, rechecks current session, Custom mode
and active membership, then upserts provided indices in one transaction. Preserve
indices outside a filtered view, matching the original user-model merge. Readonly
members may change this personal preference. Never update shared history/clocks.
Account cleanup removes all principal rows; permanent board deletion removes its
rows for every user. Positions are included only for visible boards in overview
snapshots so unrelated users/hidden changes do not trigger personal refreshes.

The native drag handler rebuilds the current filtered IDs rather than trusting
client order arrays. Its two IDs must belong to that view; archive/sorted modes
reject the request. The common pointer engine supports board grids independently
of card write capabilities. Touch requires a handle; ordinary touch keeps native
scrolling. Mouse surface/handle, cancellation, RTL arrows and keyboard moves use
the existing drag transport and server guards. Keyboard focus is remembered only
until the expected server order arrives (or expires/cancels), and another active
field is not refocused.

Native failure-injection tests verify late membership/mode guards and full
rollback/retry. The row-write failure is an UPDATE
failure test, not a new physical COMMIT phase. Real source/packaged Chromium tests
use trusted touch events and compare actual stored maps with original helpers and
setBoardSortIndexes. Original UI callbacks, multiselection/workspace transfers,
locale/driver-wide collation and efficient polling remain unverified/pending.


## Header menus and stable popup styles

`CloseHeaderMenus` closes Sort/View/Account during native view and overview
navigation. Toggling a header menu explicitly closes the competing two; include
new menus in both the native lifecycle and popup.js trigger/Escape registries.
Do not reset the personal sort or board-search draft merely to close a popup.

Keep kanban.css in the stable LanguageSelector bootstrap alongside other shared
assets. Loading it from Visual_Render removed/reloaded global styles on each
report refresh, so placement could measure an unstyled width and retain a
coordinate that put the final close button outside the viewport. The popup
helper also repositions on stylesheet load and FontFaceSet completion; document
teardown guards keep pending observer callbacks harmless.

The catalog browser test reproduces the competing-menu bug and covers both
opening directions, overview navigation and Escape on desktop/mobile. The popup
unit test changes width after initial placement without a resize or attribute
mutation, dispatches stylesheet load and verifies the new bounds. It captures
asynchronous jsdom errors, including teardown, instead of accepting a passing
exit status with an uncaught callback error. Full original UI callbacks remain
separate work.
