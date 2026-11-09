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
| Accounts, sessions and connection | `WeKan/.src/WebDatabase.module`, `WebIdentity.module`, `ApiTokens.module`, `RecoveryStore.module` |
| Board/card persistence and permissions | `KanbanStore.module`, `BoardAccess.module`, `ApiMemberRoles.module`, `BoardCatalog.module`, `BoardOrder.module`, `BoardSpaces.module`, `BoardSelection.module`, `BoardPurge.module`, `ListDeletion.module` |
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
teams, public templates, original workspace UI callbacks and full facets remain
open. Native workspace tree gestures have their own source/browser coverage.
The 75-case fixture includes private workspace assignments and direct category
counts, with a numeric-to-string ID adapter preserving tie order. Personal Custom
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
setBoardSortIndexes. Original UI callbacks, multiselection workspace transfers,
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


## Personal workspace persistence

`BoardSpaces` owns the current principal's `kb_board_spaces` tree and
`kb_board_space_assignments` mapping. `Tree` emits string IDs and nested children,
matching the original profile shape; `Record` supplies native editor fields.
Names are trimmed and required, duplicate captions are valid and empty icons
are preserved as typed strings. Never accept a principal from the caller.

Writes serialize on the user row and recheck fresh session/ownership under the
transaction. Assignment additionally locks/rechecks the readable board; removal
of stale personal assignments is allowed without current board visibility. Move
validates every ancestor and the target sibling before updating ranks. Remove
collects descendants and deletes only owned nodes/mappings atomically. Retain
anonymous `kb_board_space_ids` allocator rows after deletion so stale IDs cannot
target a later workspace; failed creations roll back their allocator insertion.

Category filtering precedes count/slicing: Remaining excludes current-user
assignments, a workspace matches its direct assignments, Starred remains
independent and a nonempty literal search spans categories. Preserve these
semantics when wiring native forms, tree navigation and drag targets.

`BoardSpacesTest` checks nested edits/moves, foreign/cycle/stale denial, readonly
organization, shared history isolation, archive distinction, nonreused IDs,
late parent/membership changes, injected SQL failure rollback/retry and account/
board cleanup. Failure triggers are SQLite test fixtures, not production schema.
Original workspace UI callbacks, efficient SQL page counts and other driver
conformance remain separate requirements.


## Native workspace UI and live state

`WebformMain.RefreshSpaces` reads `BoardSpaces.Tree` and `Assignments` as a
private snapshot. Rebuild generated native rows only when that snapshot changes.
Track the selected workspace separately from the board view and reset a deleted
selection to Remaining. `LoadBoardOverview` passes that selection into the
existing category-before-count service; search remains cross-category.

Workspace editor state carries a server-side edit/parent ID. Board placement
uses a server-side board ID and an index-to-workspace ID array built from the
current principal's tree. Never accept arbitrary IDs/principals from combo text.
Save calls the guarded service, which rechecks scope even after a stale event.
Clear board placement fields/choices on access loss and close editors whose
node/parent disappears. Preserve dirty text through unrelated live tree changes.

Generated row names/icons and selected pane titles use `weba-user-text`; the
translation walker excludes these elements. Translate only fixed menu tooltips
and the first explicit Remaining destination, preserving native option values.
Imported source labels are copied verbatim; no human catalog values are edited.
Popup registration anchors root/row editors and board placement and adds native
close/Escape behavior.

The disposable BoardCatalogFixture seeds readonly boards and exports raw SQL
workspace rows independently of the UI. Its mutation modes exercise external
name/placement/deletion and membership changes. The real browser test also sends
a hidden stale native Save after revocation and checks unchanged assignments.
Source/packaged test-live includes the case after the existing live regressions.
The native Latin checks do not run original spec 39's callback unchanged: that
callback requires actual form/submit/required semantics still to be aligned.
Markdown icons, multi-board workspace drops and broader original UI/API/security
suites remain explicit TODO requirements. Folding/counts and native tree
gestures are described below.


## Workspace presentation state

`BoardSpaces.Collapsed` returns current-principal folded IDs. The separate
`kb_board_space_collapsed` table stores only username/space rows with a composite
key; expand deletes rather than storing false. `SetCollapsed` rechecks ownership
after the account lock, commits atomically and rolls back failures. Subtree
removal includes these rows in its existing transaction; account deletion and
recreation clear all rows for that principal. Keep allocated workspace IDs so
old events cannot fold a later node under a reused ID.

`Counts` initializes zeros for the principal's spaces, then counts only directly
assigned readable active boards. Use the normal native visibility query and
exclude helper titles, matching the original workspace helper's title pattern
without a driver-specific regular expression. A revoked stale assignment stays
private but contributes zero. Template types and organization/team schema remain
separate work. This does not change the original page-method contract or expose
a new HTTP service.

Include fold/count maps in the private live snapshot. Index ALL workspace names
before rendering only visible rows, so a hidden selected descendant remains
valid. Keep the native click's requested fold state instead of toggling a later
database value, then focus the replacement caret. Translate only the action;
append the literal name and synchronize aria-expanded with caret direction.

The new native presentation test injects insert/delete failure, a late ownership
change and partial subtree failure, then checks rollback and recovery. It tests
readonly/revoked count boundaries, zero/default/idempotent state, typed key removal
and deletion/recreation cleanup. The source comparator calls the original
helperBoards export against real native SQL count results; it is a 25-case helper
comparison, not an unchanged original workspace UI callback. Real browser tests
cover Enter/Space/focus, reload/live expansion, hidden selection, direct counts
and archive/restore updates.


## Workspace drops and native transport

`BoardSpaces.Drop(sourceId, targetId, position)` accepts before/after/inside.
Resolve target parent and its next sibling after acquiring the account lock,
then use the same `MoveWithin` primitive as native `Move`. Recheck every owned
ancestor and reject self/descendant targets. Skip unchanged sibling order so a
no-op does not normalize ranks. All affected updates share one transaction; fold
and board placement rows are untouched. Native tests inject a late foreign
parent and a failure after earlier rank updates, then verify rollback/retry.

`DragAction` workspace commands carry source/target/position plus an empty
reserved field in the existing base64 POST protocol. The handler requires an
All Boards overview, including its Archive category. Non-overview forged
commands fail before mutation. This is private tree organization and needs no
shared board write permission. No whole client tree or caller principal is
accepted.

Native row classes contain only the visible principal's numeric workspace and
parent IDs. The common decorator publishes those as drag metadata and registers
the native handle. The pointer engine uses the original quarter-row rule,
checks visible ancestor chains and marks before/after/inside without rearranging
widget-owned DOM. The server retains full ownership/cycle authority. Touch
starts only on handles; mouse names may start a drag.

Keyboard arrows select a sibling or logical parent/previous sibling. Restore
focus only after the matching visible parent/order arrives, while focus is on
the body and the request is within five seconds. Use the target handle when a
folded target hides the source. Pointer input and another keyboard drag kind
clear competing requests. Preserve the target's fold state.

`workspace-drop-conformance.test.cjs` executes 196 actual native cases and the
unchanged original immutable move helper. The DOM test separately compares the
quarter-row classifier and checks cancellation/scroll/menu/cycle/replacement/RTL
wire rules. The real browser checks SQL AND the visible tree before another
gesture, because a commit may precede the native DOM response. Source/packaged
trusted touch/focus tests add evidence; original UI callbacks, multi-board drop
targets, desktop-handle preferences and multiselection remain open.


## Single-board drops and archive transactions

`BoardSpaces.DropBoard` accepts board ID, target enum/owned workspace and source
category. The native handler derives source from its server-side view state,
checks the board belongs to the freshly loaded visible page and rejects a
nonempty reserved field before mutation. Client source attributes are hints,
not authority. Home/groups/multi-board commands are not provided by this step.

Validate source/target pairs and current archive state before and after locking
the account and board. Require read for every drop and manageBoard for archive
or restoration. Recheck target ownership under the lock. `AssignWithin` is a
private primitive shared with Assign; only its guarded callers may invoke it.
Star drops write only a missing current-principal star, honoring the existing
legacy fallback, and do not toggle or unassign.

Restore plus assignment/unassignment and activity share the outer transaction.
Use the existing board archive mutation inside that transaction; avoid separate
commits or nested public assignment calls. Trigger fixtures prove activity and
archive rollback after placement failure, with retry and late membership/role/
workspace-owner/archive-state guards. These SQLite triggers are test-only;
production operations still use portable Gambas DB APIs.

Archive overview requests the native archived `archive` menu, which bypasses
personal assignment filtering after normal visibility checks. Explicit archived
workspace categories remain available to native callers. The original active
page-method comparator is unchanged; no new public HTTP contract is claimed.

The common pointer engine prioritizes workspace/menu targets before grid
reordering and emits a distinct board-drop tuple. Sorted/Archive handles may
place a board, while keyboard/grid reordering still requires Custom. Archive
confirmation uses the copied source catalog. DOM cancellation and invalid source
limits, native late/rollback tests and actual source/packaged browser behavior
have separate evidence.

The 156-case source comparator runs original callback bodies with explicit
DOM/dataTransfer and Meteor-call effect adapters. It compares supported single,
multi and mixed final state, not original permission checks, asynchronous race
behavior or the full original Playwright fixture. The real browser exports
independent archived/star/assignment SQL rows, so UI completion and persistence
are both checked. Remaining broad parity requirements stay in TODO.md.


## Atomic board batch foundation

`DropBoards` is a native service; selection UI/transport integration remains
required. Future handlers must derive origin from trusted view state and obtain
the complete authorized selection from native state, not trust an arbitrary
client ID array. Select All must add only the current rendered page while
retained selections may cross pages/categories.

The batch service accepts a nonempty unique positive integer array, validates
context/owned target and reads each board's archive snapshot/authority. Copy
and sort only the lock list. Lock the account then boards in stable numeric
order; recheck the whole set before calling the shared private ApplyBoardDrop
primitive. Recheck identity, target and the affected board before each effect,
then validate identity/target/all boards and expected archive state before commit.
Use the original archive snapshot to retain manageBoard checks for restored
members even though they are now active.

Mixed selections intentionally do not assume every board shares the dragged
origin's archive state. Restore archived members only, require read for active
personal changes and require manageBoard for restoration/archive. Star remains
a personal add-only operation with no archive transition. The existing single
DropBoard contract still requires its source archive state exactly; both share
validated context and mutation primitives. No public loop of individually
committing DropBoard calls is used for the batch.

`BoardBatchDropTest` traces lock update order in SQLite, preserves reverse caller
input and compares affected SQL rows across partial failure/rollback. It covers
empty/null/duplicate/foreign/stale input, mixed states/roles, second placement/
unassignment/activity failure, late membership during locking/application and
final target/membership/restore-role loss. The last checks prove pending writes
cannot commit after authority disappears on the final effect. SQL triggers and
trace tables are disposable test fixtures, not production migrations or proof
of all drivers' locking behavior.

The source comparator includes 52 single and 104 multi/mixed contexts, executing
unchanged original workspace/menu/archive callback bodies. Explicit effects
adapters compare archive/assignment/star final state; they do not reproduce
Meteor publication timing or original per-call failure semantics. The native
transaction adds all-or-none failure handling. Existing single-board real UI
regressions protect the shared primitive; no native multi-selection browser
coverage is claimed before its actual controls and transport are implemented.


## Native board selection transport

BoardSelection owns a private Collection per WebformMain instance, bound to the
current principal and account generation. ID getters return copies. Visible-only
toggle/add validates the entire candidate set before mutating; no browser ID list
can replace the retained set. Changes increment a revision. DropIds checks active
mode, captured revision and visible selected origin, then returns the server set
to the atomic BoardSpaces.DropBoards service. That service reauthorizes retained
off-page members. Single-drop transport rejects selected origins during active
mode; neither grouped mouse nor keyboard paths fall back to Custom reordering.

The source/package test-live runner includes board-selection.browser.cjs; the
isolated --board-selection mode also exercises paging and late off-page access
revocation. SQL fixtures and native service tests cover storage/authorization
separately. No unchanged full original selection callback suite is claimed.


## Permanent board purge boundary

RecoveryStore owns the default-off site setting and independent recovery_events
journal. Mutators derive the actor from current WebIdentity, lock/recheck the
account and setting and commit success audits with effects. Failed attempts are
appended only after rollback; failure-audit errors must not replace the original
error. Events requires current Global Admin, and the new panels clear on demotion.

BoardPurge is the explicit global-admin exception for deleting archived boards,
not a general board-read override. Validate the entire bounded unique selection,
lock account/setting/sorted boards, and recheck gate/state through effects/final
commit. Keep cleanup references and native lifecycle tests current as schemas grow.
The legacy board service is gated; UI per-board commands must reject board purge.
Native Archive confirmation captures private selection revision and derives IDs
server-side. Keep recovery events out of board/account cleanup so audit survives.
Other recovery event types, original report/filter/wire parity and public API
adapters remain separate work; do not infer full original-suite completion.


## Reversible list lifecycle

ListDeletion stores separate kb_deleted_items marks and immutable per-list batch
journals. The global kb_delete_batch_ids allocator survives board purge; journals
and marks are board-owned and included in purge cleanup. Never derive permission
from the retained actor text. Ordinary source list writes require the board write
capability; REST separately rejects all raw assigned-only flags. Restore matches
board and batch and does not revive earlier marks or alter archive state.

Canonical card/list guards, REST selectors/counts, exports, relationship views,
change-clock reductions and destinations must exclude marks. Keep raw row access
inside trusted deletion/restore/purge or lifecycle cleanup, not ordinary readers.
Cross-board lane moves containing deleted lists are refused until restoration so
marks cannot be transplanted without their batch. Full source hierarchy parity is
still separate work. Legacy hard-delete routes require global purge permission;
list physical deletion goes only through PurgeList and accepts an optional captured
batch for native stale-consent rejection.

DeleteApiList authorizes before list lookup, locks the account/board, uses a private
site-admin scope only around the inner native operation, rechecks raw API scope
before outer commit and sanitizes failures. The outer transaction is necessary:
native assigned writers are valid list writers, but a REST member gaining a raw
assigned flag during the inner operation must roll back the entire API mutation.
The 60-case source comparator explicitly adapts native IDs/times and stubs source
history stores; do not describe it as complete source history/undo coverage.


## Attachment lifecycle

kb_files retains bytes after ordinary removal. kb_attachment_deletions keys the
file and stores its board/card scope, actor/time/batch; kb_attachment_history is
an immutable scoped lifecycle journal with filename snapshots and prior deletion
time. Actor text is attribution, never authority. Read files through the live
predicate; raw rows are reserved for lifecycle operations and physical container
cleanup. Keep these tables in card moves and card/list/lane/board purge cleanup.

AttachmentLifecycle locks/rechecks the current writer and parent/file scope before
and after mutation, including idempotent calls. Delete clears only a matching
cover; restore never writes cover metadata. A cover pointer must resolve to a live
file on the same card. Copies and exchange must map file IDs, never copy pointers.
DetailLive sends history metadata without blobs. Native handlers resolve selected
journal IDs afresh and enforce writer scope independently of visible controls.

DeleteApiAttachment keeps its site-admin scope private to the inner operation.
The outer transaction independently checks raw active assigned-only flags before
and after native deletion, including site administrators. Inspect late permission
failure before rollback only to choose a sanitized 403; unclassifiable driver
errors stay sanitized 500. Do not use general card REST write authorization:
attachment deletion permits normal assigned writers on their assigned cards.
The 12-case helper comparator proves decision outcomes on actual SQL state, not
server activity callbacks, full ChangeHistory/undo or complete attachment APIs.


## Attachment uploads and attributes

kb_attachment_data is file-owned board/card-scoped MIME and UTC millisecond
metadata. Create it inside the file transaction, preserve MIME on copy/exchange,
transfer its scope on card moves and clean it on container purge. Legacy files
without metadata use octet-stream; do not infer an original MIME from a filename.
The Gambas SQLite driver formats zero-length blobs as NULL; keep the file row and
verify its native content.Data returns the zero-length byte string.

UploadApiAttachment shares the attachment-specific write guard with DELETE,
not the stricter general REST card-write guard: assigned normal members may
upload on their assigned cards. Validate raw card path before enabling scoped
site-admin write access, clear that scope before the independent final guard,
and roll back all file/metadata/activity/clock changes on late permission or
allowsAttachments changes. The board allowance is a boolean native board setting
requiring manageBoard with a final guard and is included in board copy/exchange.
Its manager checkbox and four Global Admin transfer controls are implemented below;
full storage policy remains future work.

RestApi parses the original encoded query so form '+' spaces and escaped '%2B'
remain distinct; never repair Request.Get output after it has lost that distinction.
Translate URL-safe base64 alphabet before UnBase64 to match Buffer.from behavior.
The host normalizes only upload JSON supplementary filename/type characters and
updates CGI length; raw bytes and other routes remain opaque. Size gates apply
before normalization. Read in bounded chunks with one absolute 30-second deadline,
not a timeout reset by every byte; restore the socket timeout and reject incomplete
bodies before CGI. API uploads are still buffered and database-backed; report
that backend honestly and retain streaming/multiple-backend requirements in TODO.
The source helper comparator uses unchanged function bodies with explicit storage/
ID and no-op security-log adapters; it is not the full original security callback.


## Attachment read APIs

AttachmentReads uses ordinary current board membership, never the write API's
scoped site-admin exception. BoardAccess wrappers reset that private scope. Raw
active assigned-only flags apply through canonical seesAllCards and actual card
assignment checks; final guards recheck scope before returning data. List filters
use source null/unknown/foreign semantics. Query only names, attributes, sizes and
container IDs for metadata; fetch the blob only after download scope/size checks.
Legacy metadata falls back to its stored date/octet-stream without backfilling.

Read the original route/cache bodies before changing deletion filters. Source
listings apply liveAttachments; direct info/download retrieve retained files and
apply fresh membership/assigned-card permission. The native gallery's FileRecord
live guard serves a different source UI path. Do not accidentally call it from
these retained API reads or grant global nonmember read access. Parent deletion
marks are not part of these source attachment selectors. Actual container purge
still removes the file and its attributes.

Raw CGI output carries X-WeBa-Download-Name as private base64 metadata; the host
accepts it only on attachment download GETs and replaces it with the source safe
Content-Disposition. Never forward that internal header. Split CGI headers at the earliest supported
blank-line boundary so delimiter bytes inside a binary body stay intact. Keep explicit empty
base64/false/zero fields with Collection.Add. Preserve sandbox/nosniff/no-store
and byte bounds; raw output remains buffered until streaming storage is added.
The 192-case comparator executes unchanged source handlers with explicit SQL-ID,
time, database stream, transfer policy and no-op security logger adapters. Full
source storage, DDP, eventlog and original UI callbacks remain separate work.

## Persistent attachment transfer limits

Global Admin → Attachments now controls native upload/download and API
upload/download independently. Each offers Unlimited, Maximum file size and
Blocked, with GB/MB/Bytes conversion. Settings persist globally with actor/time;
ordinary owners and readers cannot read or change the settings panel. Role
revocation closes and clears it. Existing source translations supply the labels.

Saved limits override environment defaults, including explicit zero. Native
downloads fall back to the saved API download limit, then its environment default.
Both native and API byte paths retain a physical 64 MiB buffered-backend ceiling;
Unlimited removes the configured limit within that ceiling. Native uploads use
ATTACHMENTS_UPLOAD_MAX_SIZE when unset. Native/API upload host bodies have a
96 MiB safety bound and a 30-second deadline; JSON exchange remains 20 MiB overall.

Fresh server guards cover file-picker uploads, downloads, API raw/JSON bodies and
native JSON import/export. Uploads also require the board attachment allowance.
Actor/policy/scope locks and final checks roll back late policy or permission
changes, including changes after the final imported activity. Blocks leave
metadata reads and trusted internal copy/delete/restore operations available.

TransferPolicyTest covers schema, Global Admin, SQL failures and late-change
rollback. The conformance test compares 234 native outcomes with unchanged source
form and API-limit helpers, with explicit SQL/scientific-number adapters. Actual
HTTP checks cover independent blocks, defaults, zero/fractional limits and rollback.
Browser checks cover owner/reader forgery, live controls, mobile editing, Corsican
labels and admin revocation. Focused modes: --transfer-policy-api and
--transfer-policy, with --archive for packaged checks.

Avatar upload controls/integration, storage/cloud settings, streaming beyond the
buffered ceiling, full version/retention behavior, remaining board settings,
DDP, security eventlog/Problems reporting and complete original UI/API/security
suites remain pending. This implements the four transfer controls, not the full
source attachment-storage settings schema or its failure fallback behavior.

### Board attachment allowance

Board settings → Attachments opens a persisted checkbox for board managers.
The default is enabled. Disabling it prevents native and bearer uploads while
preserving existing file metadata, downloads and internal copies. Global transfer
blocks and byte limits remain independent and take precedence on their paths.

The server validates the board context, boolean value and current manageBoard
permission. It locks actor then board, checks permission again after writing and
checks the committed candidate value. Late role loss, value replacement and SQL
failure roll back the change. Permission loss hides the open control/form;
forged stale saves still pass through the server guards. Shared popup anchoring
observes class-only native reveals; viewport checks wait for scheduled placement
while retaining strict bounds. A regression reproduces the delayed-reveal defect.
The native test covers
normal, readonly, comment, worker and assigned-only denial plus manager retry.
The browser test covers real manager/owner controls, reader and stale-manager
forgery, mobile form bounds, reload persistence, live upload changes, bearer
refusal and exact retained download. Run tests/run-http.py --board-allowance,
adding --archive for the packaged application.

This control implements allowsAttachments only. Minicard display preferences,
background/map files, linked-card permissions, full board settings and original
DDP/UI/security callbacks remain separate TODO work.

### Board copy authorization

Whole-board Copy requires board administration, matching the current source
copyBoard method. Reading a board, ordinary write access and site administration
without board membership do not authorize copying it. Assigned-only container
restrictions remain enforced. Native context menus hide Copy for nonmanagers;
forged opens are denied, and live role loss closes and clears a pending copy form.

The service locks the actor and source board, rechecks scope before cloning and
checks identity, source administration, source owner/title/archive state and
new-board owner/title/live state before commit. Card-link preparation is inside
the transaction. Late changes and failed child writes roll back the complete
hierarchy, bytes, metadata, activity and clocks. Retained deleted cards are
excluded from clone queries instead of causing a copy failure or entering a copy.

BoardCopyAuthorizationTest covers eight nonadmin roles, global nonmembership,
manager exact binary content, retained-card exclusion and late role/source/target
or SQL rollback/retry. Thirteen SQL-backed authorization outcomes match the
unchanged source copyBoard authorization prefix and hasAdmin helper; owner-to-
active-admin membership, ID, findWhere and no-op logging adapters are explicit.
This comparison does not execute the full original copy method or its properties,
options, creation-policy, content, DDP or security-event callbacks. The real browser
covers readonly forgery, successful manager copying and stale-save denial after
live demotion. Focused mode: tests/run-http.py --board-copy, plus --archive for
the packaged application.

Selected-board duplication, per-field copy options, source unique-title generation,
board-creation policy, unimplemented board content and full original UI/API/security
suites remain open. Existing single native copy titles are supplied by the user.
