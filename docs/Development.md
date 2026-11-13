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
Workspace creation uses an actual form, required textarea and submit input.
Its native command binds actor, session generation, editor revision and parent;
closed, stale and completed form packets cannot create another workspace.
`wekan-workspace-latin.browser.cjs` executes original spec 39's Latin callback
unchanged against production selectors. Explicit adapters establish a native
password session and apply client locale; this proves neither DDP nor persisted
profile language. `wekan-catalog-server.browser.cjs` also executes the three
original server callbacks plus the sort/search UI callbacks and their hooks
unchanged. Its disposable fixture creates and cleans actual native boards and calls `BoardCatalog.Page`; a test-only
browser RPC binding revalidates an actual API token before each call and maps
its verified principal to a native fixture session. Each original callback gets
fresh native normal accounts, created and deleted
through native admin services, preserving the original fixture isolation from
earlier suites and their boards/preferences.
Numeric IDs, fixture DB and transport/session adapters are explicit. A revoked API token is refused before
native service invocation while the independent native UI remains signed in.
This verifies native paging/search/privacy outcomes, not production DDP or routing. The source profile sort
assertion maps explicitly to a raw `kb_board_preferences` read. All six callbacks
have adapter-backed execution (five catalog callbacks plus Latin separately).
Run with `python3 tests/run-http.py --original-catalog` (add
`--archive` for the package), or as part of `--catalog` and `test-live`.
The production overview renders a `ul` with `li.js-board` rows and escaped
`.board-list-item-name` text; native search controls carry the source selectors.
The original search callback runs against those elements and native events with
no locator/assertion adapters. List styling retains the tile grid geometry.
Native sort buttons become anchors with their original IDs/attributes/handlers
and child nodes. Class/text updates still target those same IDs. Enter and Space
activate once without fragment navigation; disabled aria state refuses clicks.
The source `.boards-pagination` class exists only for visible sorted paging,
with a separate stable native layout class.
Workspace edit mode uses `.js-workspace-actions-form[data-id]`, required
`.js-workspace-name`, `.js-workspace-icon` and a translated submit input. Native
edit controls live inside that form; switching creation/edit modes unwraps and
rewraps the same controls, retaining existing native events and draft behavior.
The shared native form command accepts captured name/icon values only for the
current open revision, actor and session generation; the server's private ID
selects the target, never the DOM's `data-id`. The former Save click refuses
writes. Source/packaged workspace tests exercise blank/whitespace names, stale
root-to-child packets, completed-form replay, forged old Save, literal Unicode/
icon values, translated controls and create/edit transitions. The edit label
uses its own imported source key (now 163 keys/237 catalogs).
The inline subworkspace form is a separate sibling form with source selectors,
optional accessible textarea and translated submit button. The shared native
command accepts a child-name snapshot only for the current editor revision,
actor/session and visible edit mode; the server's private edit ID supplies the
parent. Submitted DOM IDs cannot redirect the mutation. Legacy direct-button,
closed/completed and stale-parent commands refuse writes. Parent edit drafts are
not saved by child creation. Browser tests compare actual SQL changes with the
unchanged original `addSubworkspace` helper for empty, whitespace and trimmed
names, with explicit method/session/SQL-ID adapters. Empty submissions close
the popup without writes, matching the source event; server trimming recognizes
ECMAScript Unicode whitespace. Broader source popup and
transport integration remains pending.
Workspace icon source is held in a hidden native text label separately from the
literal name. The client builds an icon/name structure and renders icon HTML
only through the bundled unchanged source helper/sanitizer. Empty icons show a
folder; icon links keep native workspace selection without following their URL.
A WeakMap plus renderer/policy generations prevents observer loops and redundant
rendering, while native text refreshes rebuild missing structure. The standalone
Blaze/HTML/ReactiveVar adapters supply synchronous content/policy snapshots
without source DDP. All source plugins are retained. Native persisted raw-code,
URL-scheme and external-rule settings and readable title snapshots are described
below. Icon-color metadata persistence/rendering is covered below too; original
source publication/card routing remain open.
`tools/import-wekan-markdown.cjs` imports source bytes, bundles installed parent
dependencies and records hashes/versions and license notices. The oracle test
compares 136 full/raw/custom/forbidden-scheme/title outputs against the parent source;
real browser cases exercise persisted formatting, emoji, links, default folders,
policy changes, hidden-link warnings, and executable/form/clobber injection.
Builds carry the prebuilt assets and need no Node.js at runtime.
`MarkdownPolicy` stores `always_raw`, actor and UTC milliseconds in a typed
singleton table. Null means source-default false. `Settings` protects audit with
the admin guard, while `AlwaysRaw` supplies the nonsecret public boolean. Save
locks actor/settings rows and rechecks identity, admin and persisted value before
commit; late role/session/value changes or SQL failure roll back the audit too.
Global Admin / Security loads/saves the flag. `ValidateMarkdownPolicy` refreshes
the hidden reader snapshot and clean admin checkbox, retaining dirty drafts and
clearing denied panels. `ui.js` applies a changed snapshot before rendering icons,
so new/reloaded readers honor the persisted flag. The synchronous source adapter
is reused; no source code changes or new HTTP setting route are introduced.
Native and two-browser tests cover the transaction and live/control boundaries.
170 source caption keys are copied verbatim across all 237 catalogs.
`markdown_url_settings` is a separate typed singleton for the exact
`automaticLinkedUrlSchemes` text, actor and UTC milliseconds. It is created
additively for existing stores. `UrlSettings` protects its audit; `UrlSchemes`
exposes only the nonsecret text, with empty/null equivalent to source defaults.
`SaveUrlSchemes` locks actor/settings and rechecks identity/admin/value before
commit. Independent native triggers prove write, late role/session/value failures
roll back audit and data together. The Security textarea has a translated
accessible label and separate Save. Polling refreshes its hidden public snapshot
and clean editor, retains dirty text and clears it after demotion. The snapshot
is JSON with spaces escaped as Unicode, so Gambas label HTML cannot join lines
or replace spaces in the parser input. A direct browser assertion checks exact
decoded multiline text. `ui.js` feeds
the snapshot through the unchanged vendored source parser before configuring the
viewer. Parser source/hash and output comparisons cover normalization, invalid/
forbidden names and the 50-entry cap; real browser tests verify transitions,
reload, dirty fields, denial, demotion and mobile/Finnish labels.
`ExternalLinkPolicy` adds an independent typed singleton for the four public
external-tracker fields and private actor/time audit. Saves validate the exact
four-string shape and source UTF-16 rules/alias limits, lock actor/settings and
recheck identity/admin/all four persisted values before committing. Native trigger
tests prove write failure and late role/session/value rollback. Security saves
apply the same Unicode trim as the source event. Public lossless JSON snapshots
configure the existing unchanged viewer pattern/rules ReactiveVars; no renderer
fork or new HTTP route is added. Clean groups refresh, any dirty group is retained,
and loss of admin clears all fields. Browser tests verify exact trimmed multiline
snapshots, alias/prefix/rule links, existing-link protection, unsafe targets,
disable/live/reload, denied saves and accessible Finnish/mobile controls. The
trusted fixture adapts empty JSON values back into typed string collections.
`BoardLive.CardTitles` uses the same current active/archive-context board and
card queries as native navigation, exposing only readable IDs/titles and applying
raw assigned-only and deleted-list filters. Empty or stale sessions return no
map. A private JSON snapshot (spaces escaped before WebLabel HTML rendering)
updates the standalone source helper's `resolveCardTitle` through `setCardTitles`.
The resolver accepts only own string-valued keys; source URL parsing, existing-link
protection, bracket/backslash escaping and sanitization remain unchanged. Snapshot
changes advance the existing icon render generation before decoration. Native
and real browser tests cover private scope, no read writes, rename, archive/list/
assignment/membership/session loss, literal anchors, hostile labels and recovery.
The oracle adds 24 title-resolution cases for 136 source comparisons. This is a
native navigation bridge, not source Meteor subscription/card-route parity.
`kb_board_space_icons` is an additive private `(username, space_id)` color
metadata table. Optional typed `BoardSpaces.Edit` color text preserves on omission/
null and explicitly clears on empty string; TypeOf distinguishes Gambas empty
strings from null. Edits recheck current identity, row owner, name/icon and supplied
color after writes before commit. Trigger tests prove write and late owner/session/
value failures roll back the whole edit; reparent keeps metadata and subtree/account
cleanup removes it. Record/Tree return only owner-scoped colors. The current source
name/icon form preserves existing color, verified with its unchanged update helper;
no source-missing color picker or public settings route is added.
Hidden lossless row JSON drives only `element.style.color` on the formatted icon
or default source emoji-icon folder wrapper. The render cache includes color for
live updates. Invalid values are retained in storage but never interpreted as
CSS declaration lists/HTML; real browser tests check no injected background/request,
private isolation, reload, default clear and mobile behavior. Original profile-tree
transport/import remains pending.
Remaining broader original
UI/API/security suites remain explicit TODO requirements. Folding/counts and native tree
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

Remaining per-field models/controls, remaining template/system-board creation models, unimplemented board
content and full original UI/API/security suites remain open. Existing single native copy
titles are supplied by the user; selected-copy queue and title behavior follow below.

### Selected-board duplication

Multi-Selection → Duplicate Board opens a per-form queue for selected active
boards, including selections retained outside the visible search/page. Clicking
Selected: reopens the selection sidebar after using search. Cancel before running
creates nothing. Each copy requires current board administration and commits
independently. A failed board rolls back its hierarchy/bytes while previous
successes remain. The panel reports completed/remaining counts; retry processes
only unfinished boards. Selection clears after every board succeeds.

The private queue is bound to the current account, session generation and selection
revision. Selection changes, leaving the active overview or disabling selection
cancel the panel; stale/forged submits cannot replace its source IDs. Each copy
locks actor/source, checks source scope/archive state and uses the guarded native
copy service. Busy/reentrant and completed-repeat checks prevent repeated work
within the same form operation. Queue state is per-form, matching the source
popup's lifetime: cancellation/reload starts a new operation; this is not durable
crash-resume or an idempotency protocol across lost responses.

Titles follow the source's terminal [number] convention over stored board names,
including regex characters, Unicode whitespace and existing numbered copies.
Native titles retain the 255-character bound and refuse counters at/above
9007199254740991 rather than produce a lossy repeated name. Integer formatting
preserves the largest supported suffix exactly. Concurrent unrelated sources do
not gain a global title reservation/unique constraint.

BoardCopiesTest covers per-board commits, failed-child rollback, exact completed
bytes, pending-only retry, completed repeats, revision/principal/role/archive and
reentrant guards plus title bounds. Twenty-nine actual SQL-backed title results
match the unchanged source uniqueTitle body. Six queue stages match the unchanged
selected-duplication submit callback for success, first/second failure and retry,
with explicit regex/ID/transport/reset adapters. Native browser checks cover
readonly denial/cancel, off-page selection/sidebar return, revision forgery,
mobile progress, late role loss, retry, exact bytes, successful clear/reload,
Finnish captions and Archive rejection. Focused mode: tests/run-http.py
--selected-copy, adding --archive for the packaged application. Source labels are
imported verbatim for all 237 catalogs (155 imported keys).

This flow duplicates the content supported by the existing native copy service.
Remaining source copy-option models, remaining template/system-board creation models, destination placement/order,
unsupported rules/integrations/
scrum and other missing board data, complete original UI/DDP/API/security suites
and durable request-level batch recovery remain open. The queue comparison does
not claim those behaviors or replace the unchanged backend copy method.

### Selected-copy content options

The selected-duplication panel offers Select all/none and eight functional checkbox
buttons: Swimlanes, Lists, Cards, Labels, Custom fields, Checklists, Comments and
Attachments. Labels and custom fields currently mean native card label text and
typed card-field values; source board-defined label/field models remain pending.
Buttons expose checkbox roles/checked state, work with the keyboard and use
existing source translations. The two-column layout fits the mobile sidebar.

Disabling a parent clears its children: swimlanes → lists → cards → checklists,
comments and attachments. Enabling a child enables every required parent.
Independent labels/custom-field choices remain independent, matching the source.
The internal eleven-key schema also validates rules/integrations/scrum and the
customFields → scrum dependency; those three models/controls are not implemented.

Options are copied/normalized on read and write, reject unknown or nonboolean
values and cannot change a busy or stale batch. Choices can change after a handled
partial failure: retry uses them only for unfinished boards; completed copies are
preserved. The guarded copy service applies filters before cloning each category,
skips source card-link preparation when cards are omitted, clears omitted labels,
remaps retained checklist parents/relationships and carries exact retained bytes,
MIME and cover references only when attachments are selected. Existing copy callers
retain their defaults; stopped time, dates, assignees and other supported card data
remain independent of these content choices. A new empty board can still create
its own native default layout when opened; omitted source layout is not cloned.

CopyOptionsTest checks 256 actual native content selections and source-content
preservation. BoardCopiesTest verifies changing attachment options before retry
without recopying/deleting completed bytes. The conformance test compares 2,104
native outcomes with unchanged source option helpers, including every one of 2,048
boolean combinations, parent-chain toggles and malformed values. Typed JSON,
explicit null-member retention (Gambas JSON decode drops null members), and default
argument adapters are documented in the test. This is helper/schema evidence,
not an assertion that a raw copy-options API endpoint exists.

The real mobile browser checks checkbox/keyboard semantics, all/none, translated
captions, dependent toggles, partial failure with changed-options retry, omitted
remaining details/labels/files/cover and preserved completed bytes. Focused mode:
tests/run-http.py --copy-options, adding --archive for the packaged application.

Rules, integrations, scrum, source board-defined labels/custom-field definitions,
source template/system-board models, destination placement/order, actual source
routing/subscription integration, complete original backend/UI/API/DDP/security
callbacks and durable request-level batch recovery remain open.

### Global board-creation policy

Admin → Visibility offers Only admins can create boards. The default is off;
when on, every implemented new working-board path requires an actual Global Admin.
Board administration alone does not qualify. The global singleton persists the
flag, saving actor and UTC milliseconds; only a current Global Admin can open/save
its settings. Ordinary users can read the effective flag needed for their controls.

New board insertion, whole-board copy, selected-copy steps and JSON import all
check the shared service. Writes lock actor then creation-policy row before source
boards (and before import transfer-policy locks). Checks repeat under the lock and
before the final commit, including after all copy/import children and activity.
Late policy changes, admin loss, replacement settings and SQL failures roll back
the attempted board/hierarchy and settings mutation. Existing board edits, card
copies within an existing board, attachments and other existing data access keep
their own authorization; the creation flag does not disable them.

Create/import/whole-board-copy actions hide live when denied. Stale single-copy
and import forms clear; pending selected-copy state remains private and can retry
when creation is allowed again. Server guards still refuse forged controls. The
settings checkbox refreshes external changes while clean and preserves an unsaved
draft. Admin revocation hides and clears the settings pane and refuses stale Save.
The source Visibility/Only admins labels are imported verbatim across 237 catalogs
(157 imported keys).

BoardCreationTest covers defaults, strict setting types/attribution, ordinary and
Global Admin creation/copy/batch/import outcomes, retained edits/bytes, late flag
changes after complete child copying/import, late admin loss, settings replacement,
SQL rollback and recovery. The conformance test compares 392 native strict-boolean/
type results with unchanged source boardCreationAllowed and both server guard
functions, including template/default-type cases. Numeric singleton/typed SQL and
no-op security-log adapters are explicit. Native entry points accept working boards
only; the pure helper's template exemption does not create a native template bypass.

The browser checks persisted settings and forged access, live controls, cleared
stale forms, retained/re-enabled pending copies, ordinary creation refusals, Global
Admin creation, clean/dirty external settings, mobile Finnish labels and admin
revocation. Focused mode: tests/run-http.py --board-creation, adding --archive for
the packaged app.

Native templates/system-created boards and their real creation/exemption flows,
missing source board-creation/import/copy REST and DDP endpoints, generic Visibility
settings, security eventlog/Problems reporting and complete original UI/API/security
suites remain pending. This implements the policy on current native paths; it does
not claim those missing paths or reporting callbacks.

### Single-board copy content controls

The existing board-menu Copy dialog now offers the eight supported content
choices, Select all/none and source parent dependencies. It uses the same native
filtering service as selected duplication. The title editor starts with the source
title; the saved title uses source-style collision numbering.
Keyboard checkbox roles, translated captions and the shared two-column mobile
layout apply to both dialogs. Choices reset to defaults when opening a new single
copy and remain separate from selected-copy state. Card/list/swimlane copies keep
their existing default content behavior.

A private operation binds the source board, username and session generation.
Changing the board/context invalidates the old form. Current board administration,
full container scope and creation policy are checked before reading choices or
copying; the existing transactional service rechecks them while copying. Busy or
completed operations cannot change options or run again. A failed copy rolls back
its data and leaves the same operation available for correction/retry. A completed
or cancelled form rejects subsequent submit/option events. This is per-form replay
protection; durable request IDs and recovery across lost responses remain open.

Role loss, assigned-only scope narrowing (including a board admin with a raw
assigned-only flag), or creation-policy denial hides and clears the single form.
A different board menu cannot substitute its source into an already prepared
copy. The shared action handler also refuses hidden copy forms. The server still
checks authority for forged events. Selected-duplication retry state is unaffected.

SingleBoardCopyTest verifies copied options, filtered comments/labels/files,
source/account/generation binding, busy/completed state, child SQL failure and
retry, readonly/role/assigned-scope/policy refusal. Actual browser checks cover
mobile and keyboard choices, exact filtered data and omitted covers, cancellation/
default reset, completed replay, two authorized source boards (substitution is
refused), live role/scope/policy loss, Finnish labels and selected-state isolation.
Focused mode: tests/run-http.py --single-copy, adding --archive for packaged runs.
The existing source option-helper comparisons and 256 native content selections
continue to cover the reused option/filter semantics.

This extends the native single-copy dialog. The original clone popup's
withoutCards choice corresponds to clearing Cards here. Source-style numbered
titles and native destination navigation are implemented below. Placement/order,
actual Meteor routing/subscriptions and full original UI/API/DDP/security behavior
remain pending. Rules/integrations/scrum and board-defined label/custom-
field models also remain pending; there are no placeholder controls for them.

### Single-clone title and destination

The single Copy dialog starts with the source board title and generates a unique
numbered title at save time, using the same source-derived title algorithm as
selected copies. An edited base stays supported; a previously unused base is kept
as entered. Native title trimming and the 255-character/counter bounds still
apply. Account, policy and source locks precede title generation inside an outer
transaction. A failed child or late session-generation change rolls back the copy
and leaves the operation retryable; completion is recorded after that transaction
commits. Repeated copies of the same source receive successive numbered titles.

After success, select the copied board in Swimlanes, close the previous card
editor and discard its draft. A failed save keeps the source and form. This is native navigation;
it does not implement Meteor URLs or subscriptions. The authorization browser
regression explicitly returns to the source before testing its demotion.

SingleBoardCopyTest covers numbered retries, repeated titles, blank-title refusal
and late session-generation rollback/retry. Real browser checks compare two native
SQL snapshots (with and without cards) with the unchanged source uniqueTitle and
clone submit callback, using explicit native-ID, cache, method-result, Session,
subscription and router adapters. They check the source title, card choice,
callback sequence and destination identity alongside native mobile/security
behavior. The
source sort argument is inspected, but native destination rank/placement is not
claimed. Full original UI/API/DDP/security suites, actual routing/subscriptions,
non-SQLite concurrency and missing content models remain pending.

### Native import/export policy

Global Admin now has Import / Export settings with independent Disable all import
and Disable all export switches, both default off. Persist typed booleans with
actor/time metadata under account and policy locks, rechecking authority and saved
values before commit. Normal board administrators cannot read the audit settings
or forge saves. A demoted admin's pane closes and its checkbox values clear.
Refresh each clean checkbox from external changes while preserving an unsaved
change to the other checkbox. Use three additional source captions (160 keys
across 237 catalogs), including the Finnish/mobile regression.

Disable export gates every current native board/card/list/swimlane JSON export in
BoardTransfer, including direct service calls and forged menu events. Lock the
policy and source while building the result, then recheck actor, session, scope
and policy before committing and returning text. A denied or failed export returns
no document. Hide the native Export action when disabled.

Disable import gates JSON upload preparation and the import transaction before
parsing, after locks and before commit. It also gates native whole-board copies
through the shared copy service and private single/selected wrappers, following
the source disable-all-import description's board-cloning scope. Keep account,
creation-policy, import-policy and source lock ordering consistent. Hide import
and duplication actions and close/clear stale prepared forms; retain selected
copy progress for pending-only retry after re-enabling. Ordinary new boards,
local card/list/swimlane copies and authorized attachment reads retain their
existing behavior. Ordinary native downloads are attachment reads. The new
dedicated attachment-export API is described below.

ImportExportPolicyTest covers independent/default flags, typed/admin audited
settings, refused transfers without writes, stale single/selected copies, retained
file reads, late admin loss and import/copy/export policy injection with
rollback/retry.
Nine native SQL boolean/null combinations match the unchanged source settings,
import/export assertion and HTTP-refusal helpers with explicit Settings/Meteor
error/security-log adapters. This comparison covers those helpers; full original
copy/import/export callbacks and security event reporting remain open.

Actual browser tests download and inspect exact binary content in native JSON,
prepare a real file import and single/selected copies, disable them in another
session, verify cleared/retained states and forged no-write/no-download refusal,
then resume pending duplication. They also cover independent switches, external
clean refresh/dirty checkbox preservation, mobile/Finnish labels and demotion.
Focused mode: tests/run-http.py --import-export-policy; add --archive for the
packaged app. It is included in both test-live phases.

These switches cover current native paths. Avatar exclusions/anonymization,
missing original multi-format import/export HTTP routes,
streaming, security eventlog/Problems reporting, non-SQLite concurrency and full
original UI/API/DDP/security suites remain pending. No controls for unsupported
formats or privacy transformations are shown.

### Selected board JSON, CSV, TSV, Excel and external-tool export

The native Multi-Selection action exports selected active boards into one
`wekan-boards-weba.zip`, with a complete weba-2 document in each strict
`board-ID.json` entry. `BoardBatchExport` owns an account/session/selection-
revision-bound ordered queue. Every pending item calls the locked active-board
serializer, which rechecks export policy, full-board read scope, the assigned-
only exclusion and archive state inside the transaction. A later failure retains
completed JSON only in private form memory and retry resumes at the pending item;
no partial ZIP is sent.

The retained export panel can instead produce `wekan-boards-csv.zip` or the
parent WeKan `scsv` format's `wekan-boards-scsv.zip`, with one strict
`board-ID.csv` entry for each selected board. TSV uses the parent `tsv` key,
`wekan-boards-tsv.zip` and strict `board-ID.tsv` entries. `BoardCsvExport` follows the
source fixed 20-column order, quotes every cell, writes CRLF rows, doubles quotes,
preserves embedded newlines and prefixes formula-leading text. It currently maps
native card, list, lane, member, assignee, label and date data; custom-field
columns and source models without native counterparts remain pending.

The parent `excel` format produces one `wekan-boards.xlsx` workbook after the
queue completes. `BoardExcelExport` returns a fixed 20-column descriptor from
inside the same locked transfer transaction. The browser validates every
descriptor, creates one caller-ordered worksheet per board, sanitizes and
case-insensitively deduplicates 31-character sheet names, and writes the parent
seven-row preamble and merge ranges. Values are XML-escaped inline strings, so
formula-leading text cannot become a spreadsheet formula. Unsupported source
board/card models remain explicit blank cells.

The first external format, `kanboard`, writes
`wekan-boards-kanboard.zip` with ordered strict `board-ID.json` entries.
`BoardKanboardExport` runs inside the same locked transfer transaction and
matches the parent board/columns/swimlanes/numbered-tasks shape. It maps native
text, containers, ISO dates and labels, flattens checkitems to Kanboard
subtasks, retains comments and builds reciprocal parent/dependency task links.
Fields whose source model has no native counterpart remain absent.

The `markdown` format writes `wekan-boards-markdown.zip` with ordered strict
`board-ID.md` entries. `BoardMarkdownExport` reproduces the parent task-list
formatter: a board heading, non-empty list headings, checked tasks for terminal
list names, unchecked tasks otherwise, and two-space-indented non-empty
description lines. It preserves literal Markdown and the source trailing
newline while running inside the same locked transfer transaction.

The `leo` format writes `wekan-boards-leo.zip` with ordered strict
`board-ID.leo` entries. `BoardLeoExport` reproduces the parent Leo XML outline:
deterministic gnx IDs, the board-title header, every list, nested cards and
checklists/items, terminal/completed marks, escaped card-description body nodes,
and the trailing newline. It runs inside the same locked transfer transaction.

The `opml` format writes `wekan-boards-opml.zip` with ordered strict
`board-ID.opml` entries. `BoardOpmlExport` reproduces the parent OPML 2.0
outline: board/list/card/checklist hierarchy, completion attributes, `_note`
descriptions, XML attribute and line-break/tab escaping, indentation, and the
trailing newline inside the same locked transfer transaction.

The `orgmode` format writes `wekan-boards-orgmode.zip` with ordered strict
`board-ID.org` entries. `BoardOrgModeExport` reproduces the parent Org outline:
collapsed single-line headings, TODO/DONE and priority keywords, Unicode-property
tags, UTC scheduled/deadline/closed stamps, normalized description lines, every
list and nested checklist items. A compact dependency-free range table preserves
the parent JavaScript letter/number semantics instead of reducing tags to ASCII.
It runs inside the same locked transfer transaction.

The `todotxt` format writes `wekan-boards-todotxt.zip` with ordered strict
`board-ID.txt` entries. `BoardTodoTxtExport` follows the parent one-task-per-line
contract: terminal state, priority placement, collapsed titles, project/context
tags, UTC due/threshold days, list metadata and trailing newline. Native cards
have no creation timestamp, so completion day is omitted as todo.txt requires it
to accompany creation. Gambas represents an empty returned string as null or an
omitted JSON field; the browser normalizes that shape only for an already strict
`.txt` descriptor and continues to reject every other non-string content value.

The `taskwarrior` format writes `wekan-boards-taskwarrior.zip` with ordered
strict `board-ID.json` entries. `BoardTaskwarriorExport` reproduces the parent
pretty JSON array and deterministic RFC 4122 UUIDs, terminal-list state,
collapsed titles, compact UTC dates, exact priority/project labels, normalized
tags, comment annotations and WeKan list/description UDAs. Native cards lack a
creation timestamp, so the optional Taskwarrior `entry` field is absent. Empty
boards serialize exactly as `[]` plus a newline inside the same locked transfer
transaction.

The `focalboard` format writes `wekan-boards-focalboard.zip` with ordered
strict `board-ID.jsonl` entries. `BoardFocalboardExport` reproduces the parent
archive header, deterministic base-36 block IDs, board/view/property records,
cards, status and label option references, millisecond due ranges, description
text, flattened checklist items and authored comment blocks. Native board
descriptions, card creation timestamps and custom fields have no current model,
so those source-only values remain empty or absent. The JSONL is built inside
the same locked transfer transaction.

The `todoist` format writes `wekan-boards-todoist.zip` with ordered strict
`board-ID.csv` entries. `BoardTodoistExport` reproduces Todoist's 14-column
project-template header, board-view metadata, card-derived section ordering,
task priorities and normalized labels, responsible assignee, UTC start/due
mapping, unfinished checklist sub-tasks, authored comment notes, selective RFC
4180 quoting and CRLF rows. Completed checklist items are omitted because
Todoist exports no completed tasks. It runs inside the same locked transfer
transaction.

The `planner` format writes `wekan-boards-planner.zip` with ordered strict
`board-ID.xlsx` entries. `BoardPlannerExport` reproduces Microsoft Planner's
`Tasks` descriptor: plan name/ID/export day, the blank fourth row, exact
17-column header and task rows. Native cards supply card ID, title, list
bucket, ordered assignees, UTC start/due/end days, description, flattened
checklist completion/count/items and labels. Progress and Late are derived;
priority defaults to Medium. Creation/requester, Completed By and source-only
custom-field values remain empty because native cards do not model them. The
browser strictly validates the bounded descriptor, writes inline-string OOXML
with the header bold, and nests each stored workbook in the selected-board ZIP.
The descriptor is built inside the same locked transfer transaction.

The `meistertask` format writes `wekan-boards-meistertask.zip` with ordered
strict `board-ID.csv` entries. `BoardMeisterTaskExport` reproduces the
seven-column MeisterTask import shape, mapping board/list/card text, UTC due
timestamps to seconds, end-date completion status and semicolon-safe labels.
It excludes archived cards, applies selective quote/comma/newline escaping and
CRLF rows, and runs inside the same locked transfer transaction.

The `obsidian` format writes `wekan-boards-obsidian.zip` with ordered strict
`board-ID.md` entries. `BoardObsidianExport` reproduces the Obsidian Kanban
plugin frontmatter, lane/card spacing and settings footer, with native lists,
labels, UTC due/start/end markers, priority emoji, descriptions, Dataview custom
fields and flattened checklist items. It excludes archived cards. Native lists
have no WIP-limit field, so the optional lane limit is absent. The Markdown is
built inside the same locked transfer transaction.

The `linear` format writes `wekan-boards-linear.zip` with ordered strict
`board-ID.csv` entries. `BoardLinearExport` reproduces Linear's 29-column order,
formula guard, selective CSV quoting and CRLF, mapping native card ID, team,
status, assignee, labels, UTC dates, Priority/Estimate/Project/Cycle/Canceled
custom fields and inverse subtask parent. Archived cards are excluded. Creator,
created/project IDs and source-only Linear lifecycle fields remain blank because
the native card model has no counterpart. It uses the same locked transaction.

The `ticktick` format writes `wekan-boards-ticktick.zip` with ordered strict
`board-ID.csv` entries. `BoardTickTickExport` reproduces TickTick 7.2's fully
quoted date/version/status preamble and fixed 25-column task rows. It maps native
board/list/card text, labels, flattened checklist glyphs, UTC planning/completion
timestamps, stable sequential task IDs/order and inverse subtask parents. The
`Folder` and `Priority` custom fields map to TickTick folder and Low/Medium/High
priority; the exact `won't do` label maps to canceled state and is excluded from
tags. Archived cards are excluded. Reminder, repeat and created time remain blank
because the native card model has no counterpart. It uses the same locked
transaction.

The `clickup` format writes `wekan-boards-clickup.zip` with ordered strict
`board-ID.csv` entries. `BoardClickUpExport` reproduces ClickUp's 31 workspace
columns followed by the spreadsheet importer's `Checklist` column, using
selective CSV quoting and CRLF. It maps native card identity/text/status,
millisecond and ISO start/due pairs, ordered assignees plus members, bracketed
labels, list/swimlane/board placement, flattened comma-safe checklist names and
both parent/child subtask references. `Task Type`, `Custom ID`, `Folder`,
`Priority` and `Time Estimate (hours)` custom fields map to ClickUp columns.
Archived cards are excluded. Link, creation, attachment, comment and tracked-time
columns stay blank or use ClickUp's empty defaults because the native export has
no safe counterpart. It uses the same locked transaction.

The `nullboard` format writes `wekan-boards-nullboard.zip` with ordered strict
`board-ID.nbx` entries. `BoardNullboardExport` reproduces Nullboard's compact
JSON board object with format `20190412`, nonzero export-time ID, revision 1,
title and all ordered native lists, preserving empty and duplicate-titled lists.
Active cards become notes with a normalized one-line title, trimmed description,
readable checklist blocks, exact `raw` label mapping and explicit `min:false`.
Other labels, dates, people, comments and attachments are omitted because a
Nullboard note has no corresponding fields. Native boards lack creation time,
so the parent formatter's fallback export epoch supplies the required ID. The
document is built inside the same locked transfer transaction.

The `kanri` format writes `wekan-boards-kanri.zip` with ordered strict
`board-ID.json` entries. `BoardKanriExport` reproduces the parent single-board
JSON shape with native stable IDs, ordered empty/duplicate columns, literal card
text, hex/default colors, UTC due dates, flattened checklist tasks and shared
used label tags. Native labels use their name as ID and have no color definition.
Use explicit `JSON.Null` values for background/absent due dates; native decoded
null keys may appear absent, so test serialized bytes and browser-parsed JSON.
The native model lacks board timestamps and dueComplete: both board dates use
the source export-time fallback, and due completion stays false. Omit archived
cards and unsupported comments/people/attachments. All reads run in the existing
locked active-board export transaction. Browser tests compare empty-board
snapshots with the actual parent `formatKanri`, using only explicit numeric-ID/
list-ID/export-clock adapters; rich native tests cover card fields/tasks/tags.

The `pivotal` format writes `wekan-boards-pivotal.zip` with strict ordered
`board-ID.csv` entries. `BoardPivotalExport` follows the parent import header,
per-board dynamic repeated owner/comment/task widths, owner deduplication/five
limit, type/state selection, Story points/Estimate and valid Priority fields,
UTC accepted/release deadlines, author/date comment tails, and flattened task
completion. Prefix leading equals signs, selectively quote CSV and use CRLF.
Explicit branches pad absent values without eagerly indexing beyond short
arrays. Native creation/requester/source Scrum/link data is absent; do not
invent it. Tests include a persisted archived-card canary and compare real
source/packaged empty-board downloads to actual `formatPivotalCsv`; rich native
fixtures cover owners/comments/tasks/dates/escaping and per-board widths.
The exporter runs inside the same locked active-board policy/scope transaction.

The `redmine` format writes `wekan-boards-redmine.zip` with ordered strict
`board-ID.csv` entries. `BoardRedmineExport` matches the English import columns,
UTF-8 BOM/CRLF/quoting, case-insensitive reserved captions and case-sensitive
extra custom columns. Map native IDs, project/status/text, first label/assignee,
Priority/Category/Target version, UTC day/minute dates, stopped minutes to hours,
scoped subtask parent and reciprocal untyped dependencies (`Related to`).
Exclude archived/deleted/out-of-file references and running timers. Native cards
lack creation/requester fields and typed dependencies, so keep those limitations
explicit instead of inventing actors or relation types.

`ExportNumber` parses finite JavaScript Number strings with portable decimal
long division and exact binary rounding, avoiding Gambas 3.20 parser/display
precision differences. Redmine estimates match `toFixed(2)`, including half-cent
and negative-zero cases; percent fields use `Math.round` and shortest integer
text. Large values use shortest round-tripping scientific text. The numeric
oracle compares 1,547 deterministic decimal/radix/long-mantissa/overflow/
subnormal/tie/whitespace cases against actual JavaScript IEEE bytes and integer/
scientific strings. `RedmineExportTest` compares a rich SQLite export exactly to
the unchanged parent `formatRedmineCsv`, with explicit native numeric-ID,
first-assignee/stopped-hours/untyped-link/absent-creator adapters. It tests
reserved/case-sensitive custom names, dates, BOM/quoting, scoped hierarchy,
archived omission and assigned-only refusal. Both oracles run from run-store.sh
in separate initially empty projects/databases. Real source/packaged downloads
compare empty-board bytes with the actual parent formatter.

The `tasksorg` format writes `wekan-boards-tasksorg.zip` with ordered strict
`board-ID.json` backups. `BoardTasksOrgExport` reproduces `formatTasksOrgBackup`:
one local account, native list calendars (including duplicate names/empty lists),
stable native card IDs, per-name tag definitions and UTF-16-equivalent ID
sanitization, exact priority choices, all-day/noon versus timed-minute/second-one
dates, positive completion times, notes, filtered comments and stopped tracked
hours converted to seconds. Use finite JavaScript numeric parsing/rounding for
estimates; JSON-normalize overflowing seconds to null and preserve large integer
values with the existing exact numeric text helpers. Standard JSON encoding
still escapes every key/string; the private tree encoder handles only the
backup's rounded numeric fields.

Checklist entries become indexed subtask records, retaining original checklist/
item positions when blank items are skipped. Completed entries use the card end
date or export-time fallback. Link the first in-file native parent only within
the same calendar; cross-list links are omitted as in the source. Archived and
deleted cards are excluded, and native running timers are not exported. Native
cards have no source creation time, so use the source export clock fallback;
undated comments use the same fallback, and Tasks.org comments carry no author.
Attachments, alarms, locations and account preferences stay empty/absent exactly
as the current parent formatter writes them. Source-only identity/storage/import
and full original UI/API/security integration remain open.

`TasksOrgExportTest` compares a rich native SQLite backup to the unchanged parent
formatter after JSON wire normalization, with explicit numeric-ID/list/clock/
stopped-time adapters. It covers Unicode/astral tag IDs, deduplication, empty and
duplicate calendars, dates including pre-epoch omission, undated/blank comments,
blank/indexed checklist items, same/cross-list parents, exact/tiny/overflow
estimates, running-time omission, archived content and assigned-only/global-policy
refusal. The normal store runner isolates its database. Real source/package
selected-export downloads compare empty backups to the actual parent formatter.

The `monday` format writes `wekan-boards-monday.zip` with strict ordered
`board-ID.xlsx` entries containing actual workbook bytes. `BoardMondayExport`
collects native active rows inside the locked export transaction and emits a
private `format/title/rows` descriptor. Follow the source ten columns, first-seen
case-sensitive non-role custom columns, combined assignee/member order (including
cross-list duplicates), ISO dates/timeline and native text/number/date/checkbox
values. Numeric envelopes retain stored decimal text until JavaScript's Number
conversion; checkbox values remain booleans, Priority is rendered as source
String(value), and native date fields remain ISO date strings. Source board-level
definitions/dropdowns/admin-only rules and full original transport remain TODO.

`batch-export.js` validates the exact Monday root/header/row/cell shapes and Excel
grid limits before producing fixed-path OOXML. It preserves finite numeric and
boolean cell types and uses shared strings for text, including empty cells and
formula-looking values. No formula or external-link XML is generated. Match the
installed source writer's XML control-character removal and lowercase/UTF-16/
invalid-character worksheet naming. Native preflight rejects source-invalid
leading/trailing apostrophe names before consuming the queue and enforces Excel
row/column bounds; U+0130's sole JS lowercase UTF-16 length expansion is accounted
for, while actual casing stays in JavaScript. The main generic/Planner workbook
paths retain their existing behavior.

`MondayExportTest` compares rich typed rows and real XLSX readback with unchanged
`formatMondaySheets`/`writeMondayWorkbook`/`readMondayWorkbook`, using explicit
native field/identity adapters. It verifies aliases, case-sensitive extras,
Unicode naming/text, dates, people order, numeric/checkbox/date cells, literal
formulas, bold header, archive exclusion, invalid-number pending retry and
assigned-only refusal. Workbook boundary tests compare actual source name/
empty/control/Unicode/wide-column behavior and reject malformed descriptors,
cells and ZIP paths. Real source/package downloads open nested XLSX entries with
the actual source reader. Monday participates in the all-tool archive regression.

### External-tool archive scope

The source `collect()` in `models/lib/externalExporters.js` selects active cards.
Every implemented native tool exporter follows that scope, including metadata
and section-discovery passes. Archived labels/comments must not leak through a
prepass after card rows have been filtered. Native `weba-2` backups and generic
CSV/TSV/multi-board Excel follow their different source contract and keep archive
content; do not apply the external-tool filter to those paths.

`ExternalArchiveExportTest` exercises every accepted tool format as both owner
and readonly member, verifies active content, excludes archived title/body/tag/
comment canaries, and checks retained card/state/entries/history plus native/
generic archive output. Its Node oracle executes the unchanged source collector
with explicit neutral-cache/disabled-field/no-op anonymization adapters and
checks that every implemented tool format participates. Add a format to this
regression when extending the private queue. The Planner-specific batch canary
also verifies retained data. Legacy active/archived missing-list cards exercise
Todoist's separate No section branch for both actors. The complete scope/auth/
eventlog paths remain
separate existing tests and TODO work.

The final file snapshot crosses the native command boundary as base64 JSON.
`batch-export.js` bounds and validates the JSON/table/Excel envelope, writes
stored UTF-8 ZIP or OOXML entries with CRC-32 and a central directory, and never
accepts path-shaped or browser-supplied names. Tests cover exact attachment
bytes, no-write failure,
immutable snapshots, retry/replay/reentrancy, stale/foreign/archive/policy denial
and ZIP structure. `python3 tests/run-http.py --selected-export` (add `--archive`)
checks the real controls, live and forged global gate, selection retention and
all twenty-six download contents. The original caption is among 271 source keys in all
237 catalogs. Remaining external-tool formats and the original HTTP route stay
open.

### Single-attachment export API

GET /api/boards/:boardId/attachments/:attachmentId/export now returns the current
native card attachment as source-shaped JSON: string _id/cardId, name, type and
base64 file. Preserve Unicode metadata, exact binary bytes and file: "" for a
zero-byte attachment. A live file from another board, a missing/noncanonical ID
or a soft-deleted file returns an empty object after authorization. The separate
retained attachment read APIs keep their existing behavior.

This endpoint follows the private-board export contract: Disable all export
returns plain-text 403 first; a missing board returns JSON 404 before token
lookup; invalid supplied tokens return JSON 401; a signed-out private-board
request returns JSON 403. Exporter permissions require active full-board
visibility. Assigned-only members, including a board administrator with a raw
assigned flag, are refused. A site administrator needs board membership or
ownership here. These are the source exporter rules, separate from board/card
REST projection permissions.

Accept the native token issued by POST /users/login either as a Bearer header
or in this endpoint's source-compatible authToken query parameter. A nonempty
query token takes precedence; an invalid one cannot fall back to a valid header.
An empty query value permits Bearer fallback. Other API routes keep their current
Bearer authentication, and native cookies grant no API authority. The host
recognizes only this route for query credentials, bounds parsing and the source
UTF-16 token length, rejects duplicate/bracketed values, strips the raw credential
before
CGI dispatch and forwards a digest plus bounded state. Request logs stay disabled.

Hold account/token, export-policy, transfer-policy and source locks while
preflighting and serializing the file. Recheck the token, current full-board
scope, export switch and native API download byte policy before commit/return.
Metadata/content failures return an opaque JSON 500; no partial document is
sent. Responses use no-store and nosniff. The native API size/block policy and
buffer cap apply; streaming remains pending. File bytes come from a bound SQL
BLOB lookup, never a caller-supplied filesystem path.

Five credential tests include actual mocked CGI dispatch inspection for raw
credential removal and precedence. Actual HTTP/SQL tests cover missing/auth/
disabled ordering, Unicode and exact binary/empty content, query scope/bounds,
combined assignment/admin guards, retained versus exported deletion, legacy
metadata, native limits, late policy/token rollback/retry and opaque SQL failure.
126 real query/Bearer HTTP responses also match the unchanged source export
route, Exporter.build/canExport and role/visibility/live helpers across twelve
role/scope states. That comparison uses explicit numeric-ID/private-board/token,
SQL-to-filesystem, absent field-definition and security-log adapters.

Focused mode: tests/run-http.py --attachment-export-api; add --archive for the
packaged app. Both checks are part of full members source/package runs. Public/
instance boards, anonymous/Sandstorm/impersonation, board-defined admin-only
custom fields, background/source models, alternate storage and complete original
UI/API/DDP/security suites remain pending. Whole-board source formats and batch
export also remain pending. The native attachment-export action is described below.

### Native single-attachment export action

A selected live attachment now has an Export button in the native details pane.
It downloads wekan-attachment.json with the same five-field source JSON as the
attachment-export API, preserving exact bytes, empty data and literal Unicode
metadata. The button uses the existing native icon/keyboard controls and source
Export caption (now included in 170 keys across 237 catalogs). Owner and readonly full-board
members can export; assigned-only members cannot, even when raw flags also make
them board administrators.

The API and native entry points share metadata/byte serialization and final
policy/scope checks, with separate context guards. The native path binds the
selected board/card/file and current session generation; the API path retains
its token checks and whole-board source response semantics. API requests cannot
enter the session exporter, and native cookies cannot enter the API exporter.
Native exports neither prepare the API token store nor issue credentials. The
browser regression verifies that a real signed-in cookie still gets 403 from
the API endpoint without a token.

Native export follows the native attachment download block/size policy. API
limits remain independent. Hide export on global disable or scope loss; disable
it for a native download block. Closed panes, missing selections, other detail
kinds and history entries refuse forged actions. A stale/deleted selected file
cannot be replaced by another card's file or an automatic first-row fallback.
Native live Download keeps its existing behavior, and retained bytes remain for
the separate read/history services.

Native tests cover exact/empty data, context separation, source/card substitution,
readonly/assigned roles, transfer independence, the global gate, late assignment/
session changes with rollback/retry and retained deletion. Browser tests inspect
actual owner/readonly/keyboard downloads, quoted/HTML-looking Unicode filenames
without script execution, no token issuance, real cookie/API isolation, live
raw-admin assignment/global/policy changes, disabled/limited/stale/history refusal,
retained bytes and mobile/Finnish controls. Download event accounting catches
unexpected exports throughout the test. Focused mode: tests/run-http.py
--attachment-export; add --archive for the packaged application. Both test-live
phases include it. Full members API checks retain the 126 unchanged source route/
serializer comparisons after sharing the reader.

This completes the current native attachment-export action. Full original UI
callbacks, public/instance/Sandstorm/impersonation and board-defined field/storage
models, whole-board source formats and batch export remain pending.


## Native overview URL entry

`runtime/server.py:all_boards_entry_section` whitelists only the implemented
Remaining/Starred/Archive source URL shapes. GET maps to the root CGI HTML path
with an empty query; other methods and multiply encoded aliases are refused.
Existing traversal/development-route, Host/origin and native POST checks still
run. Arbitrary static paths are not rewritten. Entry queries cannot introduce
CGI command parameters or API authentication context.

The browser validates/decode-matches those same three sections and stores only
the section in per-tab sessionStorage during login handoff. Once the signed-in
hidden `EntryRouteAction` exists, it sends one native text update. Its handler
requires current identity and statically dispatches to the three existing native
navigation methods. The handler clears a captured nonempty command, safely
ignoring its nested empty Change, so reloading an identical URL after manual
navigation still applies it. Unknown input leaves the page unchanged. Login/main rendering
sets a same-origin root base before custom assets; nested entry pages therefore
use the same resource/native command URLs as root. Real browser checks compare
paths with unchanged source `allBoardsPath`, exercise unauthenticated/authenticated
entry and reload, encoded/trailing paths, denied section input, viewer/assets and
mobile. Host tests prove root-only dispatch, empty CGI query and non-GET/encoding
refusal. Included in full live source/package runs and `--overview-entry`.

The three supported overview menus now use the same consumed route command for
click, entry and popstate. A unique per-document intent token accompanies the
section; the native handler validates the section-dependent two/three-field shape, known section and
bounded nonempty token after current-identity checks. `OverviewRouteState` sends
the current supported native section, correlation token, selected workspace ID
and owned workspace tree in private lossless JSON. The client waits for a matching pair, not merely an already-visible section:
a delayed Back reply must not acknowledge a newer Forward just because its target
was visible before either request ran. Menu clicks push only a changed source path;
popstate updates metadata without push. The initial root frame keeps its URL and
stores its acknowledged section. Disabled controls are not intercepted. These are
UI correlation tokens, not authentication or authorization credentials.
`overview-history.browser.cjs` compares source paths, tests exact history lengths,
root preservation, Back/Forward, a held old native request followed by newer
Forward, reload, malformed/forbidden input, and mobile. Both entry and history run
in focused `--overview-entry` and full source/package live modes.
Workspace slug routing now imports unchanged `models/lib/allBoardsUrls.js` and
uses the installed source `limax`, with hashes/version/license verification in the
viewer build manifest. The adapter exposes path/resolve/name helpers; 22 oracle
results compare them to the parent helpers and same slugifier, independently of
136 Markdown comparisons. Native route payloads for Workspaces add an ID field:
strict canonical positive integer plus `BoardSpaces.Record` ownership validation,
or `0` for the safe index. No foreign node is looked up through client slugs.
The index uses internal `$spaceMenu=-1` and the source empty-category filter;
free-text search retains the source global behavior. Missing selected nodes fall
back to this index, retaining their stale URL and partial source name trail.
The private route acknowledgement includes the owned tree/selected ID. Initial
slug resolution waits for the helper bundle and tree; menu/history transitions
retain token/section/ID correlation. Duplicate sibling slugs take the first,
including menu resolution. Late matching nodes resolve reactively; deleted pending
targets retry the safe index after fresh ownership denial. Names, path fallback,
Unicode transliteration and emoji IDs come from the original helper/slugifier.
Header breadcrumbs use textContent and translate only static prefixes. Passive
rename/reparent leaves the current URI stale until navigation, as in the source.
UI workspace capture consults the drag module's suppression window so a completed
gesture cannot become an unintended route click. The host wildcard rewrites only
Workspaces entries to HTML root and validates strict single percent/UTF-8 decoding
before CGI, preserving existing traversal/method/query/origin protections.
`workspace-urls.browser.cjs` covers nested/Unicode/emoji/duplicate routes, login/
reload/history, private/malformed IDs, partial/index fallback, matching-node
arrival, live rename/move/delete, held-request deletion, late helper delivery,
literal/Finnish breadcrumb and mobile/assets. Existing workspace tests now require the source route after an
icon click without following its hash, and check safe-index deletion before
explicitly checking removed assignments in Remaining. Run `--workspace-urls` or
full source/package live suites. Home/Templates, other-page navigation and
original Meteor route/DDP/profile transport remain TODO.

Businessmap selected workbook export

Businessmap (formerly Kanbanize) produces `wekan-boards-businessmap.zip` with
one actual `board-ID.xlsx` workbook per selected board. Native snapshots contain
only active cards, native typed custom fields, people, dates, labels, comments
and same-board parent references. A strict local renderer matches the source
optional columns, repeated Comment columns, custom columns, priority synonyms,
palette/hex colors and Businessmap Card ID parent lookup. Native IDs are never
invented as Businessmap Card IDs. Preserve numeric/Boolean cells, literal formula
strings, shared empty cells and bold headers. Sheet names preserve case and follow
the source UTF-16 truncation/sanitization rules, including protected `History`
and apostrophe refusal. Native snapshots bound cards and possible column counts
before queue completion; malformed numbers/names retain pending-only retry.
Source board-defined field models and unsupported original transport remain TODO.

`BusinessmapExportTest` constructs rich native SQL content and compares rows and
actual XLSX readback with unchanged `businessmapFormat.js` and
`businessmapWorkbook.js`. Cover repeated comments, parent Card IDs, ordered
assignee/member adapters, native hex color, dates, typed fields, archive omission,
malformed-number repair and assigned-only denial. `businessmap-workbook.test.cjs`
checks all palette colors, names/XML/UTF-16, optional and 40 extra columns, literal
formulas, duplicate IDs and malformed descriptor/cell/date boundaries. The shared
archive test includes every accepted external-tool format. Real source and
packaged selected-export browser runs now cover 27 formats/download paths and
cached scope revocation/API-403/regrant. These focused checks do not establish
complete original Meteor UI/API/security parity.

Super Productivity selected backup export

Super Productivity produces `wekan-boards-superproductivity.zip` with one
native `board-ID.json` backup per selected board. Match the current source
cross-model version and project/task/tag/note/boards/archive slices, including
required null settings. Used swimlanes become projects; lists become filter
panels with source backlog/progress/done behavior. Flatten nested descendants
under the top-level ancestor, inherit its project, and leave cyclic or absent
parents unlinked. Preserve checklist Markdown notes, deduplicated labels, all-day
versus timed due dates, stopped time and numeric estimates/priorities. Running
timers, archived cards and source-unsupported content are excluded. Native cards
have no creation timestamp, so use the source export-time fallback. Native
unique lane titles and numeric card IDs remain explicit schema adapters.

`SuperProductivityExportTest` and `SuperProductivityCasesTest` compare actual
native SQL backups with unchanged `formatSuperProductivity` at the emitted
export timestamp. Cover literal/Unicode text, required null/empty values,
checklist notes, midnight/timed/pre-epoch dates, stopped/running time, finite and
overflow estimates, empty/legacy-empty layouts, multiple used/unused lanes with independently expected native reorder,
backlog/state panels, cross-project nested roots, legacy cycles, missing lists
and archived parents, including stopped-time millisecond overflow to JSON null.
Legacy invalid states are explicit SQL fixture mutations;
normal APIs still reject them. Malformed numeric fields preserve pending work
and retry after repair. Shared archive coverage includes every accepted tool
format. The selected-export browser compares the actual backup ZIP with the
source formatter. Complete original Meteor UI/API/security parity remains TODO.

Taiga selected project export

Taiga produces `wekan-boards-taiga.zip` with one project `board-ID.json` dump
per selected board. Match source story/task/epic/issue mapping, sequential refs,
unique status names/slugs, list identity, native colors/WIP, dates, people,
comment history and typed custom attributes. Story checklist items become tasks;
checklists of other item types append Markdown notes. Native snapshots retain
only active cards and validated finite numeric fields; malformed numeric or WIP
values fail before pending work is consumed and can be repaired/retried. A strict
local renderer accepts only the native descriptor shape and canonical IDs/dates,
then writes the actual dump into the ZIP. A private file format marker explicitly
binds this transformation; other JSON stays unchanged. Source settings and null
fields remain intact. Native numeric IDs, string label names and absent card/
board creation dates are adapters; source fallback uses the snapshot timestamp.
Native Scrum models/sprints and board label definitions remain TODO, so no sprint
or label-color metadata is invented. Native snapshots support up to 50,000 cards.

`TaigaExportTest` and `TaigaCasesTest` compare scoped native snapshots after
rendering with unchanged `formatTaiga`. Cover duplicate-title list IDs, all four
item kinds, epic-linked stories, nested tasks, story checklist tasks, issue
facets, typed custom-attribute conflicts/consumed fields, people, dated histories,
colors/WIP, empty/missing layouts, legacy cycles and archived parents. WIP
corruption uses the actual native metadata schema; normal setters still validate
it. Both malformed and negative WIP values and malformed numeric entries retain
pending work and recover after repair. `taiga-renderer.test.cjs` checks strict
shape/type/date/ID/count boundaries, Unicode/slug/literal values, real transformed
ZIP JSON and unchanged unmarked JSON, even when it resembles a Taiga descriptor.
Source and packaged Chromium compare actual ordered two-board JSON dumps with
the parent formatter. Shared archive tests include every accepted external tool.
These checks do not establish complete original Meteor UI/API/security parity.

Vikunja selected nested archive export

Vikunja produces `wekan-boards-vikunja.zip` with one actual `board-ID.zip` per
selected board. The inner archive contains exactly `data.json`, `filters.json`
and `VERSION` (`v1.0.0`, without a trailing newline). Match source projects and
child projects per native lane, four views, list buckets and WIP limits, task
positions/bucket links, users, deduplicated labels, done/priority/percent fields,
RFC 3339 dates and zero time, comments and parent/subtask pairs. Cross-project
parent references retain the source behavior; Vikunja may discard them on import.
Descriptions/comments are escaped paragraphs and checklist items become TipTap
HTML task lists. Attachment/background bytes and saved filters are absent as in
the source formatter. A strict private format marker permits only this generated
fixed-path inner archive. Taiga and Vikunja share native collection and strict
snapshot normalization; their shapes, limits and renderers remain distinct.
Native Vikunja snapshots support up to 20,000 cards. Native numeric IDs and
absent creation/creator metadata remain adapters; source timestamps use the
snapshot time and unknown creators stay absent. Remaining original transport
and content-model work stays TODO.

`BoardExternalSnapshot` holds the existing Taiga collector with a checked format
argument and format-dependent date shape/card bound. Taiga's wrapper preserves
its descriptor. Vikunja adds start dates and uses the same full-scope metadata
reads and exact finite-number envelopes. `VikunjaExportTest` and
`VikunjaCasesTest` compare native snapshots after rendering with unchanged
`formatVikunja`/`vikunjaArchiveFiles`, then read actual generated ZIPs through the
source archive reader and compare with the source writer. Cover rich native
values, empty/legacy layouts, multiple lanes, nested/cyclic/archived parents,
comments/checklists, metadata WIP corruption and numeric repair/retry.
`vikunja-renderer.test.cjs` verifies priority/percent/date matrices, zero time,
escaped literal HTML, TipTap task lists, exact files/VERSION, actual nested ZIPs,
strict descriptors/types/IDs/counts/dates and marker/path mismatches. Existing
Taiga native/renderer tests verify shared-code compatibility. Both Chromium
builds compare actual nested two-board downloads with the source files. Complete
original Meteor UI/API/security parity remains unproven and open in TODO.

Wrike workflow metadata export

Wrike workflow produces `wekan-boards-wrikeworkflow.zip` with one
`board-ID.json` per selected board, shaped like the source GET /workflows
response. Lists become ordered custom statuses; names are trimmed/truncated and
collision-safe, and required Active/Completed groups are supplied. Use source
list-name group inference and color fallback. The native collector reads only
board/list metadata, so unrelated card text and malformed card fields are absent.
The source full-board, active-board and policy gates still apply. Strict format
binding renders only the known descriptor and preserves other JSON exports.
Wrike applies a workbook's Workflow/Custom Status cells only when the matching
workflow exists in Wrike. The matching XLSX exporter uses the same mapping. Native
automation-rule models remain TODO; their move/complete overrides are not
invented, and this export currently uses the source no-rule fallback.

`WrikeWorkflowExportTest` compares native empty/rich/closed-only snapshots after
rendering with unchanged `formatWrikeWorkflow`. Verify duplicate list names,
legacy long-name collisions, required status groups, source colors, no-write
content/history behavior, no card-body collection, read-only success and
assigned-only/disabled/archived denial. Long names exceed the current native UI
limit, so those cases use explicit legacy SQL fixture mutation. The renderer
checks native descriptor shapes/types/markers/paths, Unicode/UTF-16 and palette
fallback matrices and actual generated JSON ZIP bytes. Shared archive coverage
asserts metadata-only shape for this format while preserving active-card
presence and archive exclusion for every card-bearing format. Source/packaged
selected-export browser checks compare actual workflow documents with the
source helper. Matching Wrike XLSX is recorded below; native rules and full original Meteor
UI/API/security parity remain pending.

Wrike selected workbook export

Wrike XLSX produces `wekan-boards-wrike.zip` with one actual `board-ID.xlsx`
per selected board, on a Tasks sheet. Match source fixed and extra columns,
Default-first lane order, folder rows, sequential keys, parent-key references,
people, priorities/duration and the workflow/status mapper used by workflow JSON.
Numbers and checkboxes retain their cell types; formula-looking text stays text.
Start/End/Constraint date columns use actual date cells and yyyy-mm-dd styles,
including bold headers and empty cells. Preserve the source Date.UTC year/epoch
behavior. Native SQL preflight checks the 65,000-row bound including header and
folder rows before collecting content or completing pending work. Oversized
boards can be repaired and retried. The source formatter ignores list WIP, so
this path does not read it; Taiga/Vikunja retain their own WIP validation. Native
rules are still absent, so workflow groups use the source no-rule fallback.
Remaining native model and original transport work remains TODO.

`WrikeExportTest`/`WrikeCasesTest` compare actual native snapshots after rendering
with unchanged `formatWrikeRows`, then compare real XLSX readback with the source
writer. Cover folders, ordering/keys/parents, workflow/status names, typed fields,
dates, empty/legacy/multi-lane/cycle states and archive/scope refusal. Native
`WrikeRowLimitTest` bulk-seeds 65,000 Default cards and 32,500 distinct-folder
cards; both exceed the row bound by one, retain pending work and resume after
repair. Assigned-only users cannot observe these counts before full-board
authorization. The focused native cases also prove irrelevant malformed/negative WIP
cannot block Wrike. `wrike-workbook.test.cjs` covers real dates and date formats
on columns/header/empty cells, source year/epoch conversion, 40 extra typed
columns, literal formulas, strict malformed inputs and actual ZIP-contained XLSX.
Monday/Businessmap/workflow tests verify shared-writer/mapper compatibility.
Source/packaged Chromium compare actual ordered two-board workbook downloads
with the parent writer. Complete original Meteor UI/API/security parity is open.

Teamwork selected workbook export

Teamwork produces `wekan-boards-teamwork.zip` with one actual `board-ID.xlsx`
per selected board. Match the source ten-column task template, same-list nested
subtasks with dash prefixes, cross-list roots/cycle fallback, title-prefix
cleanup, people, priorities, estimated hours-to-time text, completion, labels
and UTC date cells. The worksheet keeps the source name sanitization and UTF-16
truncation; native prechecks reject protected History/apostrophe names before
pending work completes. Date columns retain yyyy-mm-dd formatting on headers,
empty cells and dates. Native SQL preflight checks the 20,000-row bound before
collection, behind full-board authorization; row/name/numeric failures can be
repaired and retried. As in Wrike, unused WIP metadata is ignored. The source
template omits swimlanes, other custom fields, comments/checklists and attachment
content. Native card IDs/parent relations and absent due-completion flags remain
explicit adapters; Complete custom fields and end dates supply completion.
Remaining native model and original transport work stays TODO.

`TeamworkExportTest`/`TeamworkCasesTest` compare native snapshots after rendering
with unchanged `formatTeamworkSheet` and actual source workbook readback. Cover
ten columns, same-list nesting, cross-list roots and cycles, title prefixes,
people, numeric hours/completion, dates, legacy layouts and archive/scope gates.
Native `TeamworkBoundaryTest` seeds 20,000 cards, confirms count privacy for an
assigned-only user, verifies pending-only row repair, and tests sanitized
History/apostrophe/UTF-16-boundary names plus name repair. The renderer matrix
checks source date/year/name/estimate behavior, real date cells and formats,
literal formula text, hierarchy and malformed descriptors with nested XLSX.
The saved-board-title expectation reflects the native API's trimming; raw name
edge cases are covered separately. Shared-writer Wrike tests remain green.
Source/packaged browser tests compare actual ordered workbook downloads with
the parent writer. Full original Meteor UI/API/security parity remains open.

Quire selected CSV export

Quire produces `wekan-boards-quire.zip` with one native `board-ID.csv` per
selected board. Match the source fixed and repeated Assignee/Tag columns,
deduplicated ordered people/labels, sequential #1 references and exported-parent
numbers, statuses/Priority defaults, English UTC month/day/year text and exact
CRLF/RFC 4180/formula-prefix quoting. Only the custom Priority value is read;
unused malformed fields and WIP do not affect this export. Numeric/checkbox
Priority values use the source Medium fallback. Native creation timestamps and
creator/requester fields are absent, so Created/Created by stay blank. Native
comma-separated labels and numeric/first-parent IDs are explicit adapters;
source board-defined label metadata remains TODO. Archive/full-board/policy/
session guards remain shared with the other selected exports. Full original
transport and content-model work stays open.

`QuireExportTest`, `QuireCasesTest` and `QuireMatrixTest` compare actual native
CSV bytes with unchanged `formatQuireCsv`. Cover rich repeated/deduplicated
people/tag columns, parent refs, empty/legacy/cyclic/archived-parent states,
all twelve UTC months and epoch dates, every supported priority/default type,
formula prefixes, quoted commas/quotes/newlines and Unicode literals. Malformed
unrelated numeric fields and list WIP are deliberately ignored, while disabled
export and assigned-only full-board access are denied. The original contract
suite is `tests/quireCsv.test.cjs`. Shared batch/archive tests retain ordering,
isolation and active-card scope. Real source/packaged Chromium compare actual
ordered two-board CSV ZIPs with the parent formatter. Complete original Meteor
UI/API/security parity remains unproven in TODO.

Notion selected CSV export

Notion produces `wekan-boards-notion.zip` with one `board-ID.csv` per selected
board. Scoped native snapshots are normalized before source-matching local CSV
rendering. Keep fixed columns first, followed by Swimlane only when active cards
use multiple lanes, then custom fields in source order. Exclude reserved/base/
prototype names, write checkbox values as Yes/No, preserve exact JavaScript
numeric text, deduplicate assignees and retain source tag repetition. Dates use
UTC MM/DD/YYYY; values and RFC 4180/CRLF quoting remain source-exact. An explicit
private CSV marker binds conversion, while unmarked generic CSV stays unchanged.
This export does not inherit unrelated formats' card limits or Notion-import-only
character limits; common download-envelope/ZIP bounds still apply. Native typed
field models, comma-separated labels and absent creation/identity metadata remain
adapters. Other tool formats and original transport/content work remain TODO.

`NotionExportTest`/`NotionCasesTest` compare actual rendered native CSV bytes with
unchanged `formatNotionCsv`, covering numeric/Boolean/text fields, reserved-name
canaries, empty/overwritten columns, dynamic lanes, metadata/model adapters, archive/scope guards, malformed
numeric pending repair and irrelevant WIP independence. `notion-renderer.test.cjs`
checks negative zero/subnormal/max/hex/exponent numeric strings, reserved/prototype
collisions, used versus unused lanes, dates/people/tags/literal values, strict
shapes/markers/paths, actual CSV ZIP contents and unchanged generic CSV. A
50,001-card comparison proves no unrelated inherited row limit. Source/packaged
Chromium compare ordered two-board downloads with source bytes. Source audit
finds 40 formats: 30 native implementations including Notion; deck, openproject,
github, gitea, forgejo, gitlab, trello, jira, asana and zenkit remain. Full original
Meteor UI/API/security parity remains unproven and open in TODO.

Final native collection omits Notion-unused comments, checklists, parent links,
colors/layout and completion metadata while keeping the strict common descriptor
shape. Reserved fields are filtered before value parsing. Native collection Add
preserves empty text and the first column position when a duplicate field
replaces a value, matching JavaScript property order; direct assignment had
removed empty columns. Native regressions assert both CSV bytes and omission
of unused/private descriptor values. Full verification is repeated after this
collector fix, with Taiga/Vikunja native compatibility checked separately.

Notion legacy numeric storage containing only whitespace is normalized to zero
before descriptor handoff, matching the native finite-number parser and JavaScript
number conversion. The regression fixture inserts this legacy state directly; the
normal card-content save path rejects empty numeric input.

Nextcloud Deck selected export uses `BoardDeckExport` under the existing locked
`BoardTransfer.ExportChecked` boundary. It reads only active cards and the native
list, people, label, date and comment models. It matches each stack by list title
rather than list ID, preserving duplicate-title repetition and the source empty
list-title fallback for missing list links. Optional absent due/done/people/comment
properties are omitted. Native numeric IDs, comma-separated labels and membership
names remain explicit storage adapters; creator and card creation timestamps have
no native persisted counterpart yet. The source collector provides time tracking
only for Jira, so Deck has no fabricated time-tracking object.

`DeckExportTest` and `DeckCasesTest` compare actual native batch/direct exports to
unchanged `formatters.deck`: literal Unicode, source duplicate title behavior,
rich comments/people/dates, archived exclusion, empty/legacy/missing-list cases,
export-policy denial and assigned-only full-read denial. The selected-export
browser harness downloads ordered per-board JSON files through the real Deck
button in both source and packaged applications. Complete original feature and
security parity remains separate pending work.

OpenProject selected export builds scoped native snapshots with
`BoardOpenProjectExport` and renders explicitly marked `.json` entries through
`openprojectData`. Its isolated source formatter retains numeric work-package
IDs, ordered dynamic schema fields, typed values, HAL people/status/parent links,
comments and optional dates. The strict snapshot validator rejects unexpected
keys, types, invalid dates/numbers, duplicate IDs and path/format mismatches.
Missing native due dates are omitted as in the source collector. Native empty
custom text is skipped before assignment, so an empty duplicate does not erase
an earlier field; primitive `__proto__` entries are ignored as the source object
setter does. Empty numeric storage becomes explicit zero. Layout/color/checklist
metadata is omitted where the formatter does not use it; no unrelated row cap
is introduced. Existing other-format behavior remains separate.

`OpenProjectExportTest` and `OpenProjectCasesTest` compare actual native snapshots
through the renderer to unchanged `formatters.openproject`, covering rich typed
fields, comments/people/date/parent links, empty/legacy/missing-list cases,
archive exclusion, malformed-number pending repair, disabled exports and
assigned-only denial. Renderer comparisons cover numeric extremes, prototype and
integer-like field names, cyclic/missing parent links, literal comments, actual
JSON ZIP contents, unmarked JSON preservation and 50,001 cards. The browser
harness compares ordered two-board downloads with source output in source and
packaged applications. Native numeric IDs, stored label/member models and absent
creator/creation/Scrum data remain explicit adapters; complete original parity
is pending.

GitHub selected export uses `BoardGithubExport` beneath the existing locked
`ExportChecked` full-read/policy/session boundary and private batch publication
scope recheck. It emits a plain source-shaped issue array, preserving active card
order, literal titles/descriptions, repeated label-name objects and optional UTC
due dates. The source non-Unicode `/done|closed|complete|archiv|finished/i` rule is
implemented with ASCII-only lowercasing and substring matching, preserving both
surprising matches (`incomplete`, `undone`) and Unicode nonmatches. Native comma
label splitting/ECMAScript whitespace trimming and numeric IDs are explicit
storage adapters. No unused custom/checklist/people/comment/WIP model is read.

`GithubExportTest`, `GithubCasesTest` and `GithubStatesTest` compare 27 actual
native batch/direct outputs with unchanged `formatters.github`, covering rich
Unicode text, repeated labels, empty/legacy/missing-list cases, all terminal
substrings, casing and Unicode lookalikes, optional/pre-epoch dates, irrelevant
malformed custom/WIP independence, archive exclusion, disabled export and
assigned-only full-read denial. The browser harness downloads exact ordered
per-board JSON and compares to source in both source and packaged applications.
Complete original import routes/model options/security integration remain pending.

Gitea selected export has a distinct `ExportActiveBoardGitea` locked transfer
entry and batch/UI/download action. `ExportChecked` delegates to the existing
native issue formatter because unchanged `formatters.github` and
`formatters.gitea` share `githubLike`. `IssueExportFixture` dispatches only test
fixtures to the real selected/direct entry. The Gitea conformance runner creates
fresh SQLite data beneath the task-local test project, runs the same 27 rich,
empty/legacy/missing-list and state/date/Unicode cases, and compares to the
unchanged Gitea alias. GitHub still runs independently with its default fixture.
Test dispatch flags are confined to test files and do not enter production.
The browser checks ordered Gitea filenames and exact source JSON in source and
packaged applications; archive regression includes owner and read-only Gitea.
Complete original route/options/model/security parity remains pending.

Forgejo selected export has its own `ExportActiveBoardForgejo` locked transfer
and selected batch/UI/download action, while sharing `BoardGithubExport` exactly
as source `formatters.github/gitea/forgejo` share `githubLike`. The common fixture
supports all three names; the Forgejo runner uses separate task-local SQLite
data and compares all 27 rich/empty/legacy/orphan/state cases to the unchanged
Forgejo alias. GitHub and Gitea regressions still run independently. Browser
coverage downloads ordered per-board Forgejo JSON and compares it with source
in source/packaged builds. Owner/read-only archive regression includes Forgejo.
Complete original route/options/model/security parity remains pending.

GitLab selected export uses `BoardGitlabExport` through the existing locked
`ExportChecked` full-read/policy/session and private cached-publication checks.
It emits source Issues API v4 arrays: literal title/description, exact ASCII
terminal-list state (`closed` or `opened`), repeated label names, optional UTC
due dates, ordered native assignees/members and comments as non-system notes with
native authors/timestamps. Close dates appear only when the list is terminal;
`iid` stays absent to avoid an extra Source line on import. Creator, card creation
and Scrum planning have no native persisted model yet and are left absent.
No unrelated custom/WIP/checklist data is read and no source-absent row cap added.

The shared issue fixture dispatches to the real GitLab transfer/batch entry with
fresh SQLite data, comparing 27 rich/empty/legacy/orphan/state outputs against
unchanged `formatters.gitlab`. State cases also store end dates: comparisons
and explicit assertions verify conditional close dates, opened issues without
close dates, notes/assignees and iid omission. Existing three issue-format
regressions still run independently. Browser coverage checks ordered per-board
GitLab JSON vs source output in source/packaged applications; archive coverage
includes owner and read-only exports. Full original parity remains pending.

Trello selected export uses `BoardTrelloExport` beneath the existing locked
full-read/policy/session transfer and private cached-publication scope check.
Its source shape is a board with blue/private prefs, live list IDs, active cards,
nullable due dates, closed=false flags and empty member/checklist/action arrays.
Cards retain actual list links, so duplicate list titles do not duplicate cards;
a missing native link omits idList as an undefined source field does. No unrelated
custom/WIP/comment/people/checklist data is read and no source-absent row cap added.

Native cards store comma-separated label names without board label definitions.
The explicit adapter uses trimmed names as stable board-local IDs, preserves
repeated card label IDs and creates one definition per name in first active-card
encounter order. Colors stay absent; unused native board label definitions/IDs/
colors need a persisted model and remain pending. The source oracle supplies
these explicitly adapted definitions/IDs to unchanged `formatters.trello`.

`TrelloExportTest` and `TrelloCasesTest` compare rich/empty/legacy/orphan outputs
with source, including list-ID references, duplicate titles, repeated/prototype
labels, nullable dates, exact source empty arrays, archive and unselected-board
canaries, irrelevant malformed custom fields, policy and assigned-only denial.
Browser downloads compare ordered per-board Trello JSON to source; allocated SQL
list IDs remain the explicit native adapter. Owner/read-only archive coverage
includes Trello. Complete original route/options/model/security parity is pending.

Jira selected export uses `BoardJiraExport` and the existing locked full-read/
policy/session transfer, private selected queue and cached-publication checks.
Marked JSON entries pass strict snapshot validation and an isolated unchanged
Jira formatter. It assigns sequential WEKAN keys, named typed custom fields,
parent links, assignee/status, comments and checklist-derived subtasks. Native
empty duplicate fields and primitive __proto__ entries follow the source
collector's skip behavior; whitespace comments remain literal. Unused list/
lane/color metadata and unrelated 50,000-card caps are omitted.

Finished native time entries store minutes. SQLite printf('%!.17g', amount)
retains round-trip double precision as strings; the native collector rejects
nonnumeric/nonfinite storage before caching a completed snapshot. The strict
browser boundary checks the minute array and converts its sum to hours, then
calls unchanged `jiraTimeTrackingExport` for seconds, Math.round and safe-integer
omission. An absent log stays absent, explicit zero stays zero, running entries
are omitted, and negative/unsafe totals follow source omission. Persisted Jira
estimate/time-field mappings, Scrum metadata, reporter/creator and card creation
models remain pending; names are not guessed into estimate semantics.

`JiraExportTest`, `JiraCasesTest` and `JiraTimeCasesTest` compare rich/empty/legacy/
missing-list/time outputs with unchanged formatter/time helper. They cover
precise numeric handoff, half-second rounding, zero/negative/unsafe totals,
finished vs running entries, whitespace comments, checklist done states, typed
fields/parents, archive exclusion, numeric and corrupt/nonfinite time pending
repair, disabled export and assigned-only denial. Renderer tests cover numeric/
prototype/custom-field cases, parent cycles/missing targets, time overflow,
malformed types/paths/format binding, actual JSON ZIP, unchanged unmarked JSON
and 50,001 cards. Both browsers compare ordered Jira downloads to source output.
Complete original UI/API/security parity remains pending.

Asana selected export uses `BoardAsanaExport` through existing locked full-read/
policy/session transfer and private cached-publication checks. Its explicitly
marked JSON entries pass the strict snapshot validator and an isolated unchanged
Asana formatter. It preserves gid/name/notes, source terminal-name completion,
conditional completion and optional start/due dates, assignee, parent gid, section
membership, repeated tags, typed numeric vs string custom fields, checklist
subtasks and stories. Boolean fields become source String(value) text. Missing
and cyclic parent references follow source behavior, without pruning or flattening.
Whitespace comments are retained. Native creator/card-creation models stay pending.

Native empty duplicate custom values/prototype entries follow the source collector
adapter, and unused layout/color/time metadata is not read. No unrelated row cap
is added. `AsanaExportTest`, `AsanaCasesTest` and `AsanaStatesTest` compare 27 actual
native snapshots through rendering with unchanged `formatters.asana`, covering
rich typed/checklist/story/parent data, empty/legacy/missing-list cases, terminal
states/Unicode nonmatches/conditional dates, whitespace comments, irrelevant
corrupt-time/WIP independence, numeric pending repair and policy/assigned-only
denial. Renderer tests cover numeric/prototype types, parent cycles/missing
references, completion/subtasks/stories, malformed descriptors/markers/paths,
actual JSON ZIP, unchanged unmarked JSON and 50,001 cards. Source/packaged browser
downloads compare ordered per-board Asana JSON to source; owner/read-only archive
coverage includes Asana. Full original UI/API/security parity remains pending.

Zenkit selected export uses `BoardZenkitExport` through the existing locked
full-read/policy/session transfer and private cached-publication checks. Strict
marked JSON snapshots feed an isolated unchanged Zenkit formatter: ordered stage
names, item/parent IDs, start/due dates, all repeated assignees, typed fields,
grouped checklist names/items and comments. Native source-collector adapters for
empty/prototype custom fields and numeric wrappers apply; whitespace comments
remain literal. Unused board/list/card color, lane, WIP and time metadata is not
read, and no unrelated row cap is imposed. Native creation metadata remains open.

`ZenkitExportTest`, `ZenkitCasesTest` and `ZenkitStatesTest` compare 27 actual
native snapshots to unchanged `formatters.zenkit`, including rich grouped/typed/
people/parent/date data, empty/legacy/orphan stages, repeated/empty stage titles,
Unicode labels, numeric repair, irrelevant corrupt time/WIP, archive exclusion
and policy/assigned-only denial. Renderer tests verify numeric/prototype maps,
parents/cycles, grouped data, malformed types/paths/markers, actual ZIP contents,
unmarked JSON preservation and 50,001 cards. Both browsers compare ordered Zenkit
downloads to source; owner/read-only archive coverage includes Zenkit.

`external-export-format-coverage.test.cjs` compares the native selected-format
whitelist with the live source EXTERNAL_EXPORT_FORMATS export, excluding the five
native/generic formats. All 40 current source tool entries are represented. This
is an entry coverage audit, while format-specific conformance, native model gaps
and complete original UI/API/security parity remain separate requirements.

The first native external-export HTTP routes are GET
`/api/boards/:id/export/{github,gitea,forgejo}`. `ExternalIssueExport` uses the
existing issue formatter without native browser-session authority. The runtime
scopes/scrubs query credentials and passes only digests and a structured state
across CGI; duplicate/structured field queries become the same all-fields fallback
as source non-string values. `ExternalExportFields` uses the complete source
board allowlist and ECMAScript whitespace. Selected native exports retain their
all-fields default. Direct native JSON bytes preserve empty strings, which the
Gambas JSON decode/re-encode path would drop.

Policy is checked before board lookup/auth. Public boards ignore credentials as
source does. Private boards validate query/bearer precedence and fresh tokens,
then require full-board reads. Under account/token/policy/board locks, the service
rechecks current authority before building and before commit; public visibility
loss, membership narrowing, token revocation and disabled policy prevent a body.
Archived boards remain readable and archived cards stay excluded. Unknown SQL
failures return an opaque error. No new account, membership or generic API scope
is granted for anonymous public export. Source native IDs, API token transport,
absent native admin-only custom-field definitions/anonymization/security log and
other 37 format API renderers remain explicit pending work.

`api-issue-export.test.py` tests actual source/packaged HTTP and retained DB state,
including field combinations, public/private/query/bearer/missing/disabled order,
all 256 raw member-flag sets, global-admin nonmember and assigned-only denial,
archive reads, late membership/token/policy/public mutation rollback and opaque
serializer failures. `issue-export-rest-conformance.test.cjs` compares 58 actual
bodies with unchanged parseExportFields, gateItem and source formatters, pins the
full native field allowlist to source, and compares all 256 role outcomes with
unchanged canExportBoardData/isAssignedOnlyMember. Visibility/membership-to-native
SQL mapping is explicit. Credential host tests exercise actual CGI scrubbing and
precedence for every supported export path; WITH_API=false remains authoritative.
Full original route/model/UI/API/security parity is still pending.

GitLab now shares the external issue API boundary at
`GET /api/boards/:id/export/gitlab`, with explicit formatter dispatch. Its native
formatter accepts optional source field selections; selected UI exports keep the
all-fields default. Description and labels gate as before, card dates gate both
due/close fields, people gate all assignees, and comments gate notes independently
of card dates. Public note authors use the already board/card-scoped entry's
provenance after `BoardAccess.RequireCard`; the workspace author helper's native
session requirement stays unchanged. Repeated assignees, whitespace notes,
opened/closed states and native retired-author display behavior are preserved.
Native creator/creation/Scrum/anonymization/field-security models remain pending.

Issue API fixtures now include note timestamps/whitespace, repeated people,
terminal end dates, an opened state and archived card/note/label canaries.
`issue-export-rest-conformance.test.cjs` runs unchanged source collect with
explicit neutral SQL-document/label-ID/user-name adapters, empty planning and
no-op anonymization, then unchanged formatters. All 99 actual HTTP bodies across
four routes match source, including selected sections and anonymous public
GitLab notes/full output. All 256 raw-role outcomes still match unchanged source
export-access helpers. CGI credential tests include GitLab; WITH_API=false,
no-write, policy-before-lookup, late scope/token/policy/public rollback and opaque
failure cases remain covered. Other 36 format API renderers and complete original
model/UI/API/security parity remain pending.

Trello now shares the external API boundary at
`GET /api/boards/:id/export/trello`. `BoardTrelloExport` accepts optional source
selections; selected UI exports retain their all-fields default. Deselected
card descriptions remain empty strings, dates become null and card label IDs
become empty arrays. Source board name/prefs/lists/label definitions remain
present regardless of those per-card gates. The explicit native label adapter
therefore always derives the palette from active-card names, while independently
gating each card's ID array. Persisted board-level label IDs/colors are pending.
Missing list links omit idList rather than inventing a reference.

The shared API fixtures now capture actual native card/list IDs and ordered lists
for unchanged source collect/formatters. Trello cases compare per-card gates,
palette retention, preferences, nulls/empty arrays, source parent-list metadata,
missing-link omission and public output. The GitLab opened-state fixture now
restores by list ID so an existing Doing list is not renamed accidentally.
Credentials remain CGI-scrubbed and WITH_API=false remains authoritative.
The shared raw-role/no-write/policy-before-lookup/late authority-policy rollback
and opaque failure tests apply. Source neutral documents/user names/label IDs,
empty planning and no-op anonymization remain explicit oracle adapters.
Other 35 format API renderers and complete original model/UI/API/security parity
remain pending.

Deck now shares the external API boundary at
`GET /api/boards/:id/export/deck`. Its native formatter accepts optional source
sections, while selected UI exports retain their all-fields default. Labels stay
present as arrays; description may be empty; deselected date/people/comment fields
are omitted. End dates do not depend on terminal status, and note timestamps do
not depend on selecting card dates. Duplicate stack titles repeat matching cards;
empty-titled stacks match missing links through the existing empty-title adapter.
Native comma-label trimming now uses ECMAScript whitespace consistently.

Public note authors use the scoped entry row after a card access check. Missing
legacy note timestamps are omitted, matching source undefined fields. Workspace
session requirements stay unchanged. API fixtures now verify duplicate stack
metadata, blank-title/missing-link grouping, missing timestamps, public comments/
full output and Unicode label edges. All 152 actual bodies across six routes
match unchanged parseExportFields/collect/gateItem/formatters with explicit SQL/
label/user-name/empty-planning/no-op-anonymization adapters. The shared 256-role,
no-write, policy-before-lookup, credential scrubbing, late scope/token/policy/public
rollback and opaque failure tests remain in place. Native creator/creation export
parity and other models, remaining 34 API renderers and complete original
UI/API/security parity remain pending.

Kanboard now shares the locked export API at
`GET /api/boards/:id/export/kanboard`. The optional source field selection gates
all current native sections independently: description/labels/dates/people,
checklists/comments and subtasks/dependencies. Default selected UI exports retain
all fields. The first native participant maps to owner_username; public notes
resolve the already scoped entry author. Checkitems require a same-board/card
checklist parent and are grouped by parent/item order. Reciprocal task links now
forward the Gambas counter by reference at both call levels and traverse each
card's first parent before dependencies, matching source numbering/order.

API fixtures seed real finished/open checks, orphan/cross-card checkitems,
parent/child and reciprocal/self/missing-target dependency rows. All 214 actual
HTTP bodies across seven routes match unchanged source parseExportFields,
collect, gateItem and formatters, with shared 256-role and all prior security
checks retained. The oracle explicitly maps native lane titles to source lane
IDs, native participants to source assignees and native flat entry models to
checklists/parent/dependencies. Native untyped relationships map to source
relates-to; multiple native parents use the earliest entry. These adapters do not
prove full model fidelity: creation/creator, typed dependencies, parent modeling,
anonymization/security reporting, remaining 33 API renderers and complete
original UI/API/security parity remain open.

Markdown shares the locked external API at
`GET /api/boards/:id/export/markdown`. The service now returns explicit response
metadata: text/markdown UTF-8 for Markdown and the existing application/json
UTF-8 for all seven JSON routes. RestApi writes formatter bytes directly, keeping
no-store/nosniff and shared final policy/identity/token/public-scope checks.
The renderer accepts optional source sections and suppresses continuation text
when description is deselected. Selected UI calls retain all-fields defaults.

The Markdown query normalizes blank SQL title arguments through TextValue and
matches missing list links with COALESCE, preserving source blank-title grouping.
Terminal detection follows source non-Unicode regex case rules by folding ASCII
only. New original-collector/formatter cases cover duplicate/blank headings,
missing links, terminal substrings and Unicode nonmatches, CRLF/blank/whitespace/
literal astral descriptions, empty board names, all archived cards and anonymous
public selections. All 266 actual responses across eight formats match unchanged
source parseExportFields/collect/gateItem/formatters. Initial response bodies and
content types also match unchanged server renderExternalExport with only the
already compared native collection adapter. The shared 256-role and security
checks remain in place. SQL IDs/label names/lane IDs/empty planning/no-op
anonymization remain explicit adapters; remaining 32 API renderers, native field
models, security reporting and complete original UI/API/security parity remain
pending.

The Markdown endpoint itself also runs late member/token/policy/public-visibility
mutation rollback checks, policy-before-lookup with an unavailable board ID
column, and a missing-description-column failure. These verify a denied/error
text request returns the shared opaque error with no partial Markdown or
persisted mutations; the shared GitHub controls remain alongside them.

Leo XML shares the locked API at `GET /api/boards/:id/export/leo`, using the
original application/xml UTF-8 type and formatter bytes. The optional field
selection is reset on every native Build call; descriptions and checklists gate
independently, while UI selected exports retain all-fields defaults. ASCII-only
terminal detection and COALESCE blank-title grouping now follow source behavior.
Deterministic list/card/checklist/checkitem IDs and tnode/body correspondence,
marked cards/items, XML escaping and empty nodes match unchanged formatLeo.

Fixtures exercise real SQL grouped checks, orphan/cross-card checkitems (excluded),
escaped board/card/checklist/item text, CRLF/blank/whitespace/astral bodies,
finished/open and empty checks, duplicate/blank titles, missing links, empty
board names/active-card sets, Unicode terminal nonmatches and anonymous public
selections. All 317 actual responses across nine routes match unchanged source
parseExportFields/collect/gateItem/formatters, with original server response
body/type comparisons for initial successes. The Leo route itself exercises
late member/token/policy/public loss rollback, policy-before-lookup under broken
board schema and opaque missing-description failure. Shared 256-role and
credential-scrubbing tests remain. SQL IDs/label names/lane IDs/entry adapters,
empty planning and no-op anonymization remain explicit; remaining 31 API
renderers, native field models/security reporting and complete original
UI/API/security parity remain pending.

OPML shares the locked API at `GET /api/boards/:id/export/opml`, returning original
text/x-opml UTF-8 bytes. Optional descriptions/checklists are independent and reset
on every Build call; selected UI exports keep all-fields defaults. Attribute
escaping preserves tabs and normalizes CRLF/CR/LF to source newline references.
Completion uses ASCII-only terminal case rules. COALESCE handles missing links,
and the list join filters tombstones so a retained card cannot resolve deleted
metadata as a live list title; it follows source collect's blank-title result.

Fixtures cover parsed attribute whitespace recovery, escaped board/card/checklist/
item text, notes/finished items/empty outlines, duplicate/blank titles, missing
and tombstoned list links, Unicode terminal nonmatches, empty board names/cards
and anonymous selected sections. All 370 actual responses across ten formats
match unchanged source parseExportFields/collect/gateItem/formatters, with original
server body/type comparisons for initial successes. The OPML route itself runs
late member/token/policy/public rollback, policy-before-lookup under broken board
schema and opaque missing-description checks. Shared 256-role/credential tests
remain. SQL IDs/label names/lane IDs/entry adapters, empty planning and no-op
anonymization remain explicit; remaining 30 API renderers, native field models/
security reporting and complete original UI/API/security parity remain open.

The live-list regression audit reproduced a GitHub closed/open mismatch when
cards retained a reference to a tombstoned terminal-named list. All 24 direct
external renderer list joins and BoardExternalSnapshot now apply the list's live
predicate in the LEFT JOIN. Card list IDs stay intact. Org mode also normalizes
blank lookup parameters and groups COALESCE titles; TickTick prefixes internal
map keys so a valid blank source list title cannot raise a Void key error.

Thirty new API cases cover every current route with a live duplicate, blank or
unmatched title: all 400 responses match unchanged source collect/formatters,
with per-case no-write snapshots and the existing 256-role/security checks.
The native archive fixture additionally compares 240 complete descriptor pairs
across 40 formats, two roles and three title contexts. Each pair retains identical
card links/list IDs while removing only the already tombstoned physical row.
Six executions of unchanged collect prove equivalent live metadata and blank
fallback with the retained list ID under explicit neutral cache adapters.
Only the disposable fixture copy of ItemChanges.UtcNow is fixed, before compile,
so fallback creation/export timestamps are stable without dropping output fields.
Native production clocks stay unchanged. Entry/history counts and card links are
checked after the pairs; existing 80 archive snapshots and generic CSV/Excel
archive behavior remain covered. Source custom/native field models, neutral
anonymization/security reporting and complete original UI/API/security parity
remain separate open work, along with 30 API renderers.

Org mode shares the locked API at `GET /api/boards/:id/export/orgmode` and returns
original text/x-org UTF-8 bytes. Optional sections are reset for each Build call:
description/labels/dates/checklists independently control body text, tag-derived
DONE/priority/tags, planning and checklist outlines. UI selected exports retain
all-fields defaults. Terminal detection uses source ASCII case rules; tag edge
underscores are trimmed even when literal in a label, matching original orgTag.

Fixtures cover all general section masks plus label-driven done versus dates-only
TODO state, first priority, underscore-only/edge tags, Unicode/astral/symbol tags,
negative-epoch scheduled stamps, due/closed gates, whitespace heading and checklist
fallbacks and literal heading-like body lines. Empty/duplicate/blank/deleted list
contexts and anonymous selections stay in coverage. All 460 actual responses
across eleven formats match unchanged parseExportFields/collect/gateItem/formatters,
with original server body/type checks for initial successes. Org itself exercises
late member/token/policy/public rollback, policy-before-lookup under broken board
schema and opaque missing-description failure. Shared 256-role/credential checks
remain. Native creation stamps, SQL ID/label/lane/entry adapters, empty planning
models/no-op anonymization and full security reporting remain explicit gaps;
29 API renderers and complete original UI/API/security parity remain open.

todo.txt shares the locked API at `GET /api/boards/:id/export/todotxt`, returning
original text/plain UTF-8 bytes. Optional labels and dates gate independently;
other selected sections have no todo.txt field, matching source. UI selected
exports retain all-fields defaults. Terminal detection folds ASCII only and flat
native labels use ECMAScript trimming. Contexts strip @ before trimming/collapsing
whitespace, preserving source bare @ behavior. Completion stays list-derived;
label `done` remains a project token, unlike Org mode. Native creation stamps
stay absent, so completed tasks do not invent completion/creation date pairs.

Rich fixtures cover first/duplicate/non-letter priorities, open/completed priority
placement, spaced/bare contexts, projects, Unicode labels, negative-epoch threshold
dates, whitespace titles/list tokens, ASCII/non-ASCII terminal names, independent
field masks and empty active-card output. General duplicate/blank/deleted metadata
and anonymous selection checks remain. All 539 actual responses across twelve
formats match unchanged parseExportFields/collect/gateItem/formatters and original
server success body/types. The todo route directly exercises late member/token/
policy/public rollback, policy-before-lookup and opaque missing-label failure;
shared 256-role and credential-scrubbing tests remain. SQL ID/label/lane/entry
adapters, absent native creation, empty planning models/no-op anonymization,
security reporting, remaining 28 API renderers and full original UI/API/security
parity remain open.

Taskwarrior shares the locked API at `GET /api/boards/:id/export/taskwarrior`.
It returns original formatted JSON text, not a decoded/re-encoded document, with
application/json UTF-8 type. Optional description/labels/dates/comments reset per
Build call; selected UI exports retain all-fields defaults. Numeric IDs retain
source deterministic UUIDs, first H/M/L priority/project rules and compact dates.
Multiline project labels follow source regex behavior and become tags. Public
annotations use already scoped entry authors; Unicode-only blank notes are
excluded and missing author/timestamps omit prefix/entry fields independently.

Rich fixtures exposed two existing native text faults: bare Quote calls invoked
the Gambas built-in, emitting invalid JSON control escapes; SQLite text conversion
truncated at NUL. Renamed JsonQuote calls use the actual canonical JSON encoder,
iterating bytes to preserve complete UTF-8/control text. Unicode helper counts
replace NUL with a one-character sentinel only for counting. SQLite-only binary
projections recover complete title/labels/description/list/comment text; other
DB types retain their text path. Source comparisons include NUL-leading notes,
embedded NUL titles/labels/descriptions, control/backslash/quote/astral content,
legacy missing author/dates, negative epochs, independent masks and empty JSON.
All 628 actual responses across thirteen formats match unchanged source collector/
formatters and original server success bodies/types, with shared 256-role and
direct Taskwarrior rollback/policy-before-lookup/opaque failure checks retained.
Native creation, other renderer NUL/text fidelity and other DB conformance,
SQL/label/lane/entry adapters, empty planning/no-op anonymization/security reports,
remaining 27 API renderers and full original UI/API/security parity stay open.

The full native suite exposed string-valued projections as well as Blob values.
ReadText now accepts null, string and Blob results. A dedicated API regression
starts with missing list metadata followed by a live list row, verifying mixed
projection values in both builds.

The shared ExportText module retains full text for export queries without changing
original result columns. SQLite SELECTs gain binary projections and explicit SQL
null flags for text fields; ReadValue accepts null/string/Blob and normalizes
empty strings before SQL binding. Other drivers return unchanged queries and
normal text reads. Projection generation handles current static renderer aliases,
star columns and parenthesized selected expressions, with quoted identifiers.
Unicode counts replace NUL only in the counting copy. MatchText/BindText use an
ASCII hex predicate and safe unused parameter only for SQLite NUL values; normal
binding remains for ordinary text and other drivers. Renderer/snapshot read paths,
including generic CSV/Excel, use this layer. Taskwarrior delegates to it as well.

Six per-format API text mutations cover title/description/labels/comments and board/
list metadata, with full before/after SQL snapshots. All 706 responses across
thirteen formats match unchanged source collector/formatters. The native archive
fixture adds 80 text snapshots across all 40 tool formats and two roles; original
formatters decide which markers are exported, and every suffix after NUL must
survive. This is marker-presence coverage, separately from 240 complete live-list
pairs, 80 archive snapshots and exact API comparisons. Fixed-clock/SQL/native model
adapters remain explicit. The text fixture resets its orphan link after the generic
backup checks (which prime legacy links), then asserts external exports leave it
missing. Generic backup priming is separate follow-up work.

The corpus exposed Focalboard's missing generic custom properties. Native fields
now preserve text, Boolean values, finite numeric input, JavaScript index-key order,
last duplicate values and source prototype exclusion. A private header contains
only validated numeric card/property references. focalboardText validates marker,
header, field/card references, raw values, duplicate cards and finite numbers, then
writes canonical String(Number(raw)) values and removes the private header. Actual
ZIP bytes match source, and unmarked JSONL is unchanged. Two complete native typed
exports match original formatFocalboard under the same fixed clock, including NUL
text, integer-like names, duplicate/prototype fields and exponent/subnormal values.
NUL-invalid numeric fields fail without entry/history writes. Renderer tests also
cover IEEE edge strings and malformed/forged references. Other DBs, backup text/model fidelity,
remaining native field/anonymization/security models, 27 API renderers and complete
original UI/API/security parity remain open.

Native backup legacy card/list reads use `KanbanStore.ReadCardListId`, retaining
fresh card scope checks and deterministic live-list title/lane fallback without
`PutCardList`. Normal `CardListId` and explicit priming retain their write-side
migration behavior. `BackupLinkReadTest` first reproduces the prior source-link
mutation, then guards the source board with an insert-refusing trigger during
owner and readonly board/lane/list/card exports, including archived cards. Each
export is imported into a separate target and checked for complete target links.
Foreign card scope and revoked membership remain denied. Container initialization
is also excluded from the backup read boundary as described below; full native
backup text/model fidelity is still pending.

Native backup container snapshots now avoid `Lanes` entirely. Existing live list
and lane records retain their source IDs and ordering. A legacy card whose list
is missing receives a snapshot-only list matching its lane/status; a missing lane
required by an included list is also reconstructed only inside the snapshot.
These records use deterministic negative IDs, checked against IDs already in the
respective snapshot, so matching orphan cards share one reconstructed list and
import maps the local identity into a normal target database ID. Empty stored
boards export no invented default containers. This reconstructs the container
relationships required for a usable native backup without changing source rows;
it does not persist a migration or revive tombstone records. Invalid legacy
container names fail the export instead of producing a partially initialized
source. Broader legacy field consistency and complete generic text fidelity
remain TODO work.

`BackupContainerReadTest` covers 20 owner/readonly board/card/list state cases for
empty boards, missing lanes, missing lists, archived cards and shared orphans.
Each export repeats identically, imports into an independent target with valid
links, and preserves exact source snapshots while INSERT/UPDATE/DELETE triggers
refuse writes to source content/container/history tables. After removing those
guards, explicit lane initialization still persists normally. Existing scope,
transaction recheck, attachment policy and cached-export guards remain in force.

The selected-export browser fixture no longer relies on native backup initializing
containers. It reads raw per-board counts before export, asserts that native JSON
contains empty lane/list/card arrays, and checks the stored counts again after
all generic exports. Only then does the disposable fixture explicitly initialize
one lane/three lists for unchanged tool-format content comparisons. Both source
and packaged browser runs cover this separation and cached revoke/regrant retry.

Native backup wire text uses shared guarded projections for the already-authorized
context and each scoped card, plus live lists/lanes, metadata, entries and file
names. A card is re-read by board/ID after its ID is obtained from authorized
`CardRows`; existing fresh card checks and final transaction guards still apply.
`Row` uses explicit SQL null flags so NULL text stays null, empty text stays empty,
and non-text values keep their original types. NUL lane/status fallback and lane
order keys use hex matching only in SQLite when needed, retaining normal bound
parameters otherwise. Retired-author display and attachment MIME reads also use
the complete-text path; their authorization and write validators are unchanged.

`BackupTextTest` seeds exact SQL text bytes, including NUL, astral Unicode, quotes,
backslashes, backspace/form-feed/newline and visible suffixes. Its 32 snapshots
cover owner/readonly board/lane/list/card contexts with linked/missing source
relationships and NULL/empty values. `backup-text-conformance.test.cjs` parses the
actual emitted JSON with a standard decoder and checks all seeded text fields,
source list IDs and exact binary attachment bytes. Missing source links stay
missing. Tests against the prior committed exporter reproduce truncated titles.
This oracle deliberately avoids the installed Gambas `JSON.Decode`, which was
independently observed removing escaped NUL while `JSON.Encode` preserves it.
The backup boundary now uses the corrected codec and storage path described below.
Other native paths and legacy field-model consistency remain explicit TODO
requirements, not implied by the wire export checks. Legacy MIME/metadata fixture bytes test stored-value export;
existing import validation of those fields remains a separate requirement.

The isolated native decoder probe additionally verifies both default and
`UseNull=True`: object properties containing empty strings or null are absent
(`Exist=False`), escaped UTF-16 surrogate-pair emoji is dropped while direct UTF-8
emoji survives, NUL escapes are removed from values and keys, and literal escaped
backslash-u0000 text is retained. These cases are covered by the corrected native backup codec below; separate
SQLite storage regressions below also cover actual import round trips. The wire exporter test uses standard JSON decoding so
these native defects cannot mask lost or altered exported bytes.

The isolated SQLite storage probe separately verifies that both ordinary
`Result.Create`/`Update` text writes and ordinary bound text arguments reject an
embedded NUL. `CAST(Connection.FormatBlob(value) AS TEXT)` stores the complete
NUL/Unicode byte sequence with SQLite type `text`. The native backup write path
below now uses that verified primitive while preserving its model validation and
transaction boundaries; other native writers still require audit.

Native backup `JsonText.Decode` uses a strict byte-based `JsonReader`, retaining
all JSON string escapes, explicit empty/null fields and exact binary64 values.
Valid surrogate pairs become UTF-8; lone UTF-16 units are held as WTF-8 internally
and escaped on output, preserving their JSON meaning without emitting invalid
UTF-8. Ordinary strings are validated as UTF-8, and control characters must be
escaped. Arrays/literals/numbers follow strict JSON grammar. Decimal numbers use
the existing correctly rounded `ExportNumber` conversion, preserve signed zero
and subnormals, and produce binary64 infinities on overflow as JSON.parse does.
Long decimal inputs retain a 4096-significant-digit prefix and a sticky tail;
that exceeds the exact decimal length of any binary64 midpoint while bounding
conversion work. `JsonText.Encode` serializes finite floats as exact decimal
rationals, so the stock encoder's shortened precision cannot alter a value;
nonfinite numbers encode as null, as JSON.stringify does.

`JsonObject` keeps ordinary and NUL-containing keys in native Collection storage.
Only the empty key needs a private slot. This matters because a mixed native/
derived Collection getter call site can cache the base `_get` implementation;
encoding every key internally broke policy normalization after a plain collection
had warmed that call site. Existing ordinary-key consumers now remain compatible.
The codec explicitly uses `JsonObject.Value` to access its empty-key slot. Keys
retain duplicate first position, with JavaScript array-index keys sorted first;
large index-key sets use native numeric sorting. Explicit Add preserves empty and
null values, while copy/insert/remove/clear/count and readonly guards have native
compatibility regressions. Use `JsonText.Encode` for these decoded objects to
include the empty slot and preserve lone units/numeric precision.

The native backup boundary alone adopts this codec in this step. `ReadData`
requires a collection root with string format weba-2 and six actual arrays before
any import effects. Input is limited to 20 MiB and nesting to 128, with generic
byte-position failures that do not echo document contents. The standard-parser
oracle compares 218 decoded trees and all numeric IEEE bits, including escaped
and direct Unicode, lone units, NULL/empty values/keys, duplicate/index/prototype
names, 10,000 reverse-order numeric keys, long decimal tails, subnormals and
infinities. It rejects 77 malformed grammar/UTF-8/depth/size/backup-shape cases.
Warm base-collection calls exercise the inherited getter boundary; unchanged
all-40-view policy transfer tests verify actual defaults/order/readonly import,
no preferences or authority transfer, and transactional source/destination races.
Native backup SQLite storage round trips are covered below. Other request
decoders, remaining native writers/readers and model consistency remain explicit
next requirements.

Native backup SQLite writes use `DatabaseText.Save` inside the existing model's
transaction and authorization flow. The helper requires an editable result,
inspects only the caller's explicit modified fields, and uses native Update for
ordinary unchanged-driver cases. SQLite empty/NUL strings or floating values use
an explicit INSERT/primary-key UPDATE: empty strings remain text, NULL remains
NULL, NUL strings use CAST(Connection.FormatBlob(value) AS TEXT), real values use
exact finite decimal serialization, BLOB fields retain binary formatting, and
other scalar/date values use the driver formatter. No transaction is committed
by the helper, and an update that matches no row fails. New insert results are
discarded and callers obtain their generated ID from LastInsertId. Untouched
columns never pass through a lossy result read.

The backup path integrates these writes in board/card/container, entry, file,
display-author, metadata and activity/history operations. Existing model checks
still run, including assignment/provenance, parent scope, hidden lanes, byte/MIME
limits, identity/policy and final transaction guards. Native basenames containing
NUL avoid File.Name's C-string truncation; ordinary basename behavior and REST
control rejection are retained. Length checks include text after NUL. Explicit
nullable source content is restored only after its model validation. Numeric
custom fields and WIP controls reject malformed NUL values rather than relying
on the old SQL failure to refuse them. Entry restoration preserves source order,
with a deferred pass only for children whose checklist appears later.

A driver probe proves SQLite stored 100000.00000000001 correctly while the stock
result getter returned 100000. Guarded projections therefore add printf('%!.26g',
expression) and a null flag for real fields; ReadNumber uses the exact converter.
SQLite documents its alternate-form-2 precision in its
[printf documentation](https://sqlite.org/printf.html). Original result columns
remain available; native backup Row explicitly reads the precise projection.

`DatabaseTextTest` verifies actual SQLite equality, precise projected reads,
2.675/subnormal/small-normal/max-double boundaries, SQL text/NULL/BLOB types,
quoted/NUL/Unicode text, exact payload bytes, untouched-column partial updates,
caller rollback, readonly results and nonfinite refusal. `BackupStorageTest`
compares 24 owner/readonly board/lane/list/card imports and re-exports, plus a
successful retry, under a standard JSON oracle. Only fresh IDs and scoped import
into a new board with its own default policy are adapted; all payload text,
nullable fields, entry order/hierarchy, provenance, exact real, filenames and
binary bytes remain compared. Source rows are snapshotted by type and complete
hex bytes; empty tables initialized for a new target are not source row changes.
Eleven malformed/length/header/numeric/SQL/late-owner cases compare every persisted
application row before and after refusal. Other native reader/writer paths,
request decoder adoption, legacy field-model consistency and full original
UI/API/security parity remain explicit TODO work.

`KanbanStore.Lanes` now uses complete projected card lane text before calling the
legacy initializer, including retained archived cards. A shared prefix before NUL
cannot become a separate truncated lane with three default lists. Lane results
also carry complete text projections for callers using ExportText.ReadValue;
ordinary result columns remain available. This does not claim every renderer now
reads those projections. `LaneTextReadTest` reproduces the prior duplicate and
checks two shared-prefix NUL/Unicode names, owner/readonly repeated calls, stable
container/link/change/history/activity counts, foreign denial and an actual
missing legacy name initialized exactly once. Existing Default fallback and live
card filtering remain in place; broader reader/rendering consistency is TODO.

Lane complete-text verification: `build.sh test` passes, including the focused
native regression and 70 Python tests. Both complete `tests/run-http.py --live`
and `--live --archive` runs pass, through selected exports and list deletion.

`KanbanStore.Lists` and `GetList` now use ExportText.SelectRows, MatchText and
BindText for complete lane/title comparisons and explicit complete-text readers.
The SQLite driver cannot safely interpolate an embedded NUL into its ordinary
text predicate; the baseline ListTextReadTest reproduces the SQL parse failure.
The regression checks NUL/Unicode/apostrophe names, list order and first duplicate
selection, blank legacy titles, ID lookup, wrong-lane/deleted/foreign refusal,
owner and readonly access and unchanged history. Existing authorization and live
list predicates remain. Form rendering still needs explicit projection reads and
identity handling; this change does not claim those consumers are complete.

List-reader validation passes the complete host suite, including 70 Python
tests and source/packaged API/security comparisons, followed by source/packaged
list-deletion and all-format selected-export/cached-revocation browser runs.
