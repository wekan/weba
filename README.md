# WeKan ®

This uses Gambas for WebUI app with SQLite database.

The current implementation has native Gambas controls for boards, cards, search,
archives, profile/password settings and administrator user management. Lists,
swimlanes, tables, a month calendar, due-date milestones and status charts are
rendered with local HTML/JavaScript/CSS inside a Gambas WebContainer. These reports
read the same persisted cards. There are no external browser-library or CDN dependencies.

This is not yet full parity with the current Meteor WeKan application. See
[TODO.md](TODO.md) for active work, verification and the remaining pages/components.
The Gantt page currently shows due-date milestones, not task durations/dependencies;
charts show current counts, not historical forecasts.

## About WeKan ® for Gambas

Developed by [WeKan ®](https://wekan.fi).

Project-specific source/toolchain/database notes are in the
[development guide](docs/Development.md).

## About Gambas

Gambas has IDE similar to VB6. Gambas can create GUI, WebUI and CLI apps.

[Gambas website](http://gambas.sourceforge.net)

[Daily PPA](https://launchpad.net/~gambas-team/+archive/ubuntu/gambas-daily)

[Stable PPA](https://launchpad.net/~gambas-team/+archive/ubuntu/gambas3)

[Gambas source code](https://gitlab.com/gambas/gambas)

[Gambas bugtracker](https://gambaswiki.org/bugtracker)

Note: Gambas seems to have very advanced RAD GUI Menu editor. It is possible to multi-select many
menu items at once and move them right to be submenu, or move to left.

## Install on Windows

1) At Win11 WSL2 now supports installing GUI apps:

https://docs.microsoft.com/en-us/windows/wsl/tutorials/gui-apps

2) Install Gambas daily PPA by adding it from:

https://launchpad.net/~gambas-team/+archive/ubuntu/gambas-daily

3) Install Gambas with:

```
sudo apt install gambas3
```

4) Start with:

```
gambas3
```

5) And it opens Gambas GUI.

6) Related: SystemD on WSL2

https://devblogs.microsoft.com/commandline/systemd-support-is-now-available-in-wsl/

## Install on Linux

1. Run `./install-deps.sh`
2. In Gambas, click Open Project, and select directory WeKan.
3. Click play button that looks like triangle to right. This starts webserver and opens webbrowser.
4. Click **Register**, enter a username and a nonempty password, repeat the
   password, then click **Create account**. **Show password / Hide password**
   toggles visibility on both login and registration forms. The first successfully registered account is **Admin**; subsequent
   registrations are **Normal**. Registration also signs the user in. For later
   visits use **Login**. No default accounts or passwords are shipped.
5. The app creates `WeKan/database.db` and its schema on first use. Keep a backup
   of this runtime file; it is ignored by git. An existing installation retains
   its accounts: removing the bundled demo database does not migrate deployed data.
   Short passwords are accepted by default. **Admin panel → Password Length**
   lets an administrator enable a minimum of 1–256 characters. The configured
   minimum applies to registration and newly chosen passwords (creation/change/
   reset) only while enforcement is enabled; existing credentials remain valid.
6. Create a board, select it in the tree and click **New card**. Edit a card by
   selecting it in the tree. Lists start with `Todo`, `Doing` and `Done`; custom lists are supported. Dates use
   `YYYY-MM-DD`. The reports support all owned boards or the selected board.

## Database portability

SQLite is the default and the tested backend. Schema creation uses Gambas field
and primary-key APIs. Data access uses `Find`, `Create`, `Edit`, `LastInsertId`
and parameterized `Exec`, without SQLite-specific SQL syntax or date functions.
Other writable Gambas database drivers still need conformance testing; enable
that driver's component in the project before selecting it.

Connection environment overrides: `WEBA_DB_TYPE`, `WEBA_DB_HOST`, `WEBA_DB_NAME`,
`WEBA_DB_USER`, `WEBA_DB_PASSWORD`. Server databases must already exist and grant
schema-creation permissions. Usernames are primary keys. A transactional unique
bootstrap claim prevents concurrent registrations from creating two first admins;
a losing concurrent request may need to retry. Database credentials are not logged.

## Local toolchain and checks

In the parent WeKan checkout the user-provided Gambas files are in
`.tools/bin/gambas3`: `bin/` contains IDE archives, `lib/gambas3/` components,
`usr/share/gambas3/info/` class metadata and `src/gambas/` upstream source. The
initial copy did not contain `gbc3` or `gbx3` in `bin/`; verify the files and CPU
architecture before using it. IDE archives require a Gambas interpreter.

With a complete Gambas installation, from this repository:

```sh
export TMPDIR="$(pwd)/.tools/tmp"
mkdir -p "$TMPDIR"
gbc3 -j 1 -a WeKan
./tests/run-store.sh
python3 tests/run-http.py
NODE_PATH="$(pwd)/../../node_modules" node tests/reports.test.cjs
```

`GBC` and `GBX` override the compiler and runner executables for the test runners.
A relocated compiler can use `gbc3 -r <prefix>` through a local wrapper. A relocated
runner may require `GB_PATH` and `LD_LIBRARY_PATH`. The initial ARM64 checks used
locally extracted Debian Gambas 3.20.2 packages under the parent checkout's
`.tools/tmp/weba/gambas`; no system packages were installed.

Store/authentication tests create fresh temporary databases, covering registration
roles, CRUD, archives, validation, password changes and forbidden operations. The
HTTP runner copies the sources into a temporary project and runs the real Gambas
CGI/session protocol on localhost, preserving local runtime paths that the embedded
HTTP server can discard. It covers registration/login, board/card creation, report
resources, view switching, profile/admin pages and logout. DOM tests require `jsdom`
and cover report rendering, date navigation and untrusted text. These checks do not
replace a real browser visual/accessibility test or cross-driver conformance run.

## Build menu and release installers

Run `./build.sh` for the menu, or use `build`, `run`, `test`, `package`,
`release-all`, `release-all-missing`, `copy-gambas`, `targets` and `doctor`.
`run` builds a single `.gambas` archive and serves it on localhost:8080 with
`runtime/server.py`. If 8080 is occupied, the OS assigns a free port; use the
URL printed at startup. `./build.sh run --port 0` always chooses a free port.
An explicit nonzero `--port` remains fixed (useful for container port mappings).
Runtime data defaults to `$XDG_DATA_HOME/weba` (or
`~/.local/share/weba`) outside the installed program directory. Python 3 and
the Gambas runtime/components are required. Development tests also need Node.js
and jsdom (`nodejs` and `node-jsdom` on Debian).

**Copy Gambas to Flatpak Sandbox** reads the host's `/usr/bin`, `/usr/lib/gambas3`,
`/usr/share/gambas3`, `/usr/local` equivalents, Gambas desktop metadata, icons
and man pages. It also includes `gbc3`, `gbx3`, `gba3` and `gbr3`, which are not
found by searching only for filenames containing `gambas`. Inside Flatpak the
helper runs with `flatpak-spawn --host`; launch this action on the host if that
service is unavailable. It writes the parent checkout's `.tools/bin/gambas`
(or this clone's `.tools/bin/gambas` when standalone), preserving a conventional
`usr/` tree and creating `bin/` wrappers with relocated compiler/component paths.
The older manually copied `gambas3` directory remains a fallback. Native library
dependencies are copied locally without replacing the sandbox libc/loader.
Copying does not guarantee host/Flatpak libc compatibility; run `./build.sh doctor`.
`GAMBAS_COPY_DEST` changes the destination and `GAMBAS_SOURCE_ROOT` supports
fixture/alternate installation roots. No sudo installation is performed.

Release targets are defined once in [releases/targets.json](releases/targets.json):

| Target | Release files |
| --- | --- |
| Linux amd64, arm64, armhf, armel, i386, ppc64el, riscv64, s390x | `.deb` and `.tar.gz`, built/tested on that CPU through Debian/QEMU |
| Windows amd64, arm64 | WSL installer `.zip`, requires Debian 13+ in WSL |
| macOS amd64, arm64 | Docker Desktop launcher `.zip` with the matching Linux package |
| Source | `.tar.gz` for building on other systems with a compatible Gambas runtime |

These are runtime-dependent packages. WSL/Docker launchers are not native
Windows/macOS Gambas binaries. Native BSD/macOS and additional architectures
need a verified Gambas Web UI/runtime build before being added to the matrix.
The eight Linux platforms match the Debian trixie image architectures; see the
[official Debian image definitions](https://github.com/docker-library/official-images/blob/master/library/debian).
CPU/OS jobs that fail tests fail visibly and do not publish unfinished artifacts.
The Windows and macOS launchers have not yet been exercised on those systems.

Human release procedure:

1. Commit the desired version on `main`, review the changes and tests, and push
   it yourself. Create and push an existing `vMAJOR.MINOR.PATCH` tag containing
   these workflows; the scripts never create or push refs.
2. Run `./build.sh release-all v1.1.0` (example tag) or select **Release All**.
   It dispatches `release-all.yml` in `wekan/weba` through the GitHub CLI. The
   workflow checks out the tag, tests/packages each target independently and
   attaches each completed package with its SHA-256 file as soon as it finishes.
   The AI git boundary means a human must execute this publishing action.
3. Run `./build.sh release-all-missing v1.1.0` to complete an interrupted release.
   A target is complete only when all its package/checksum pairs exist. Existing
   complete pairs are preserved; an orphaned checksum is calculated from the
   already published package bytes. Source and other CPU jobs proceed independently.

The local CLI requires a clean checkout, an existing remote tag and a working
`gh` login with workflow-dispatch permission. The manually invoked workflows use
`GITHUB_TOKEN` with `contents: write` to create releases and attach assets. They
share a per-version concurrency group and never cancel an in-progress release.
No workflow has been dispatched as part of preparing this implementation.

## HTTP boundaries and REST API

Launch through `./build.sh run` (or the installed runtime host) to enforce the
HTTP origin/authority checks, blocked development routes and framing protection.
The Gambas IDE's embedded development server bypasses this Python host and does
not establish the same deployment boundary. Native commands use POST `/x` with
`X-WeBa-Request: 1`; the body contains the native form command. Credentials and
commands no longer appear in HTTP query strings. Native uploads/callbacks use
the same request-header/origin check. Large text updates use private mode-0600
request files that are removed after the request, including timeout/failure.

For a named reverse proxy or a different external port, configure the exact
public root origin, for example `WEBA_PUBLIC_URL=https://boards.example.org`.
Forwarded host/scheme/IP headers are not trusted implicitly. Direct local runs
use the bound port and localhost/IP authority. Request access logs and the old
login request/query logfile sink are disabled; the runtime denies Gambas `~`
development routes before executing CGI.

The first implemented REST contracts use JSON request/response bodies:

| Method/path | Behavior |
| --- | --- |
| `POST /users/login` | Accept username/password strings; return `id`, `token`, `tokenExpires` |
| `POST /users/logout` | Revoke the presented Bearer token; optional boolean `all` revokes all the user's tokens |
| `DELETE /api/users/:userId` | Site administrator only; return the deleted `{_id}` after commit, or 404 for a missing user |
| `GET /api/users/:username/boards` | List active boards owned by or shared with the authenticated user |
| `GET /api/boards/:id` | Read implemented board metadata/member flags with whole-board REST permissions; denied 403, missing 404 |
| `GET /api/boards/:id/lists` | Active list IDs/titles with independent `modifiedAt` and `cardsModifiedAt` UTC times |
| `GET /api/boards/:id/swimlanes` | Active swimlane IDs/titles |
| `GET /api/boards/:id/cards_count` | Return `board_cards_count` for nonarchived cards |
| `GET /api/boards/:id/lists/:listId/cards` | Ordered active cards with text, swimlane, assignees, sort and UTC dates |
| `GET /api/boards/:id/lists/:listId/cards_count` | Return `list_cards_count` for nonarchived cards |
| `GET /api/cards/:cardId` | Implemented card fields/checklists, including archived cards, with whole-board REST permission |
| `GET /api/boards/:id/lists/:listId/cards/:cardId` | Same implemented projection for an active card matching the board/list |
| `POST /api/boards/:id/members/:userId/add` | Add an existing account with `action: "add"` and optional role/flags; an active member is unchanged |
| `POST /api/boards/:id/members/:userId` | Change an active or inactive member's role/flags without changing activation |
| `POST /api/boards/:id/members/:userId/remove` | Remove with `action: "remove"`; the final administrator remains active |
| `POST` / `DELETE /api/boards/:id/lists/:listId/cards/:cardId/members/:userId` | Add/remove one card member, preserving other members and the separate assignees |
| `POST` / `DELETE /api/boards/:id/lists/:listId/cards/:cardId/assignees/:userId` | Add/remove one assignee, preserving other assignees and the separate members |
| `POST /api/boards/:id/lists/:listId/cards/:cardId/archive` | Archive an active matching card and its same-board native subtask graph; return ID, state and persisted UTC archivedAt |
| `POST /api/boards/:id/lists/:listId/cards/:cardId/unarchive` | Restore an archived matching card and its same-board native subtask graph; retain prior archivedAt |
| `PUT /api/boards/:id/lists/:listId/cards/:cardId` | Replace provided people, description and four UTC date fields; other card fields are pending |

Whole-board REST reads follow WeKan's `Authentication.checkBoardAccess` and
`memberReadsWholeBoard`: active board administrators, Normal and Read Only may
read; No Comments, Comment Only, Worker and the assigned-only flags are refused.
Combined exclusion flags still deny a board administrator. A global site
administrator may read independently of membership, as in the source. Missing
boards return 404; refused reads return a plain 403 without internal errors.
The temporary REST authority resets on success, SQL failure and retry; native
board permissions and membership remain unchanged.

List/card results filter their own archived state. Card lists preserve exact text,
including empty strings, ordered assignees/duplicates, native integer ordering and
stored UTC date precision. A nonexistent/foreign list produces an empty card list
or zero count, matching the source selector. Complete board/card documents and
fractional sort remain pending.

Single-card GETs share the whole-board read permission check. The scoped route
authorizes the board before interpreting list/card IDs or looking for the card,
so an excluded role gets 403 even for malformed/missing targets. Authorized callers
get JSON 404 for a mismatched/missing/archived scoped card. The global route looks
up the card's board and can return archived cards, as in WeKan #5546. Its temporary
global-administrator scope also resets after SQL errors and retries.

The current projection includes IDs, title/description, swimlane, archived state,
integer sort, ordered members/assignees, four UTC dates, recorded modifiedAt and
checklists/items. Empty strings and arrays are retained. Checklists use native
creation/ID order, canonical UTC creation dates and items with `_id`, title,
isFinished and nullable dueAt. Item queries also enforce card/board boundaries.
Unrecorded checklist/item deadlines are null; editing/persisting them is pending.
Remaining card attributes, author/creation metadata, board-defined label IDs,
custom fields/admin-only behavior and complete WeKan document parity are also
pending. Unsupported fields are not represented as if implemented.

Archive/restore routes require the general card REST write boundary, including
all three raw assigned-only flags even for combined board-admin rows. Explicit
site administration remains the source override. Check board authorization before
interpreting list/card identifiers, then lock and recheck inside the transaction.
Missing, foreign-list or wrong-state cards return JSON 404 `Card not found` without
business writes. A repeated successful operation therefore returns 404.

Archive writes a UTC millisecond timestamp shared by the native subtask graph;
restore keeps that timestamp. Single-card GET includes recorded `archivedAt`, even
on a restored active card. An old card without archive metadata has no invented
timestamp. Moves and JSON exchange preserve it; a fresh copy starts without it,
and permanent card/board deletion removes it. Native child traversal deduplicates
diamond/cyclic references, excludes foreign-board edges, checks visible descendants
and commits flags, times, history and change clocks together. Full WeKan parent/
linked-card/cross-board hierarchy, custom roles and list exceptions remain pending.

The source/archive HTTP tests verify authorization order, permitted/refused roles,
exact scope/state errors, persisted archive time and retained restore history,
repeat no-write behavior and complete rollback after timestamp, clock or descendant
failure. Four additional real failed-COMMIT/retry phases cover REST/native archive
and restore on the same connection, bringing card-update phases to sixteen. The
HTTP-only command runs two original `rest-card-archive.e2e.js` callbacks unchanged
with actual Playwright assertions and an explicit SQLite fixture adapter.
`test-live` runs all three, including the original open-board UI callback, on a
real Playwright page and Gambas DOM. No reload, locator remapping or synthetic
page is used. Original spec 17 remains 10/30 independently.

Open boards use a one-second Gambas WebTimer and private server-side state for
visible cards/assignees, list links/order, empty lists/swimlanes, colors/shared
settings, current-user preferences and role capabilities. The state is read-only
and never sent as a wire token; hidden card changes do not alter a restricted
member's card state. Capture it before rendering so a mutation racing the render
is observed on a subsequent tick. A changed state refreshes the native board;
unchanged ticks preserve card DOM and permitted unsaved editor text. Archive,
assignment loss or board revocation closes stale card panels and clears fields.
Archiving the current board also returns navigation to the board list.

The live check also verifies external description updates while a native title
draft is open, stable DOM across unchanged ticks, assignment loss closing editor/
people panels and direct board revocation clearing an open editor without
navigation. Source and packaged CGI are both exercised:

```sh
WEBA_BROWSER_URL=http://127.0.0.1:9231 ./build.sh test-live
```

This requires a running local Chromium CDP endpoint and the parent WeKan checkout
(or WEKAN_SOURCE) with its Playwright dependencies. Each run uses an isolated
project/database/browser context. The ordinary `./build.sh test` remains usable
without a browser endpoint.

Packaged native details tests also perform real REST archive/restore/repeat
requests, read both GETs and wait for the already open board to update. Run that
focused regression with `WITH_API=true WEBA_DETAILS_ONLY=1
WEBA_BROWSER_URL=http://127.0.0.1:9231 python3 tests/run-http.py --browser --archive`.
Native member/assignee and account-deletion browser regressions also pass with
the timer active.

Native card editors keep their opening field values privately on the server.
Saving an existing card compares the submitted title, description, lane/status,
primary assignee, labels and due day with those opening values. Fields that still
match keep the current database value; differing values are applied after board/
card locking and permission rechecks. This follows WeKan's independent title and
description setters: a title edit preserves another user's description edit.
An explicitly changed same field takes the latest submitted value, including an
empty clear. Lane, status and list ID identify one destination; an unedited old
destination cannot undo a later move.

Unedited current assignees retain their multiple/raw ordered people data, and an
unedited current day retains its exact API timestamp and other dates. A menu move/
rename or assignee picker advances just the fields it already committed, keeping
other drafts independent. After successful save, the editor loads the committed
values as its new baseline; failure retains the draft for retry. A stale or
mismatched card baseline cannot bypass read/write scope or edit an archived card.
Other internal full-save callers keep their existing replacement contract.

Native tests exercise two stale editors changing different fields, explicit
same-field last writes/clears, external moves/people/precise dates, a trigger
changing data at the lock, mismatched baselines and archive/role denial. Two
additional real failed-COMMIT/retry phases cover draft description update/clear,
bringing card-update phases to eighteen. `test-live` reproduces the former data
loss and verifies title save/reopen preserves the external description through
both source and packaged native UI. Member/date/details browser regressions also
pass. Full source inline editing and unsaved-draft UI remain broader unfinished
work.

The existing native detail pane also refreshes comments, checklists/items,
subtasks/dependencies, custom fields, tracked-time records and attachment lists.
Its private snapshot reads authorized entries and explicit file metadata columns,
leaving binary content for the existing authorized download/copy paths. Foreign
or orphan native relationship targets are excluded for every role; assigned-only
readers also exclude targets they cannot read. Dependency/subtask rows and their
selected title field resolve the current target card through guarded reads, so a
target rename appears without closing the pane. Generated relationship titles
are read-only; rename the target through its card editor. A new subtask still
accepts the title used to create its card. Reads keep stored link data and audit
history unchanged.

Native tests cover both relationship kinds, current rows/selection, no read-side
cache/history writes and assignment denial/reauthorization. Two-user source and
packaged test-live verifies successive target renames, selected title values,
removal of a now-unreadable target while the source card remains readable, and
reappearance after permission restoration. Full source cross-board hierarchy,
dependency metadata/navigation remain separate work.

When another user changes data, the pane rebuilds rows and refreshes clean selected
fields while retaining dirty text, numbers, checkbox/type and parent choices.
Deleted selected entries/files clear the editor or download selection. A deleted
checklist parent leaves a pending item's selection empty; Save requires an
explicit valid checklist, preventing silent retargeting. Comment authorship and
current role restrictions are reapplied after each rebuild and checked again by
the server on save. Nullable timer columns normalize to safe native defaults.

Entry saves use their private baseline to merge changed fields over the locked,
reauthorized entry. Other independent updates survive, while changed fields retain
explicit last-write behavior. Custom-field type/value changes are grouped; stale
value edits across an external type change are refused until reopened. Full-save
and copy callers retain their existing contract. Snapshot comparison uses data
captured before UI changes, and its state advances only after a successful rebuild.

`test-live` now also runs a separate two-user native detail test on source and
packaged applications. It verifies external rows/clean fields, preserved drafts,
independent saves, forged comment-author denial, deleted entries/parents, real
binary upload and metadata/removal, custom-type conflicts, role/scope loss and
absence of JavaScript errors. These extra native checks add no unchanged original
callbacks. Native tests cover stable/scoped snapshots, foreign/assigned canaries,
legacy timer nulls, binary-free metadata and entry draft guards. Two additional
entry-draft failed-COMMIT/retry phases bring card-update phases to twenty; full
local tests and existing details/member/account-deletion browser regressions pass.

Native card member/assignee panes now refresh from authorized current snapshots.
Valid selected rows and candidate choices survive external edits; missing choices
clear without selecting a replacement. Duplicate imported names remain stored but
appear once in the pane. Read-only and revoked scopes update controls or close and
clear the pane. Board member panes also refresh when opened from the home page;
clean selected roles advance, invitation drafts survive, and removed selected
members clear the role editor. Server mutation guards remain authoritative.

`PeopleLiveTest` covers private deterministic snapshots, independent ordered fields,
active candidates and read-only/assignment/revocation boundaries. The two-user
`people-live.browser.cjs` test is included in `test-live`; it checks external changes,
selection/draft behavior, hidden-button forgery and card/board access loss.
These native tests do not increase the original source callback count.

All Boards, Starred and Archive overview pages now detect external changes to
visible board titles/colors, personal stars and scoped navigation card titles.
Membership grants/revocations and board archive/restore update the grid and tree
without navigation. The private overview snapshot excludes other users' stars,
unreadable cards and card bodies. Unchanged ticks preserve existing tile nodes.
The snapshot is captured before rebuilding navigation and remembered after that
refresh succeeds, so an intervening change remains detectable on the next tick.

`OverviewLiveTest` covers deterministic read-only scoped state and hidden-change
isolation. The two-user `overview-live.browser.cjs`, included in test-live, uses
native menus and REST membership changes. These are additional native tests;
original test 39 sorting/search/server-pagination requirements remain incomplete.

`BoardCatalog` now supplies a native service for current-user board paging and
sort preferences. It returns IDs/counts with stable title/ID ordering, literal
UTF-8 case-insensitive name search, a 25-result default and a 200-result ceiling.
Search spans personal workspace categories and Remaining/Starred. Without search,
Remaining excludes assigned boards and each workspace includes its direct board
assignments; template menus remain unimplemented. Account deletion/recreation clears saved sort
preferences. Page evaluation enumerates authorized titles on the server; it does
not yet optimize counting/slicing into driver-specific SQL queries.

Native tests cover disjoint pages, 205-board limits, Unicode/literal search,
identity/invalid-option boundaries and preference isolation/cleanup. An explicit
SQL-to-document fixture adapter compares 75 results with the original
getAllBoardsPage method body and actual source visibility/facet helpers. Meteor
parameter checks, network authentication, UI callbacks, workspace tree gestures
and full organization/team/template facet semantics are not established by that
comparison. This service has no new public
HTTP endpoint. Native sort/search/paging controls are now wired for these modes;
Custom ordering is described below. Raw JSON callers must preserve
explicit null keys before validation.

The header Sort button opens native saved title-order choices. All Boards,
Starred and Archive use board-name search in the right sidebar; the separate
card search remains available within card views. Sorted modes show 25 boards
per page, reset after search/sort changes and clamp after external removals.
Custom shows all matching boards without pagination, using the current user's
saved positions with a title fallback. Active Custom grids support mouse surface
or handle drag, touch handle drag and arrow-key moves. Readonly members can
organize their personal view; shared board data is unchanged. Filtered moves
merge with prior indices, and other users' positions remain separate. Sorted
and archive grids reject reordering. Cross-session preference/order changes
refresh the choice and grid. Update page labels/buttons before HTML
rendering so the final-page Next button disables reliably.

`catalog.browser.cjs` exercises real native controls, SQL preferences, 25/5 pages,
Unicode/private search, reload/isolation, external preferences and archive-driven
clamping, mobile interaction and Finnish labels on source/packaged applications.
Matching original WeKan labels, including Custom (drag order), are imported for
237 languages; Clear search remains unmatched translation follow-up. These new native tests
do not count as unchanged original spec 39 callbacks.

`BoardOrderTest` covers per-user readonly access, filtered rank merge, invalid/
foreign/revoked/archive/mode rejection, injected write rollback/retry and account/
permanent-board cleanup. `board-order.browser.cjs` uses real keyboard/mouse and
Chromium trusted touch input, checks ordinary touch no-write, reload/isolation,
forged requests and external order refresh, and compares stored mappings with
original WeKan reorder helpers and the user-model merge method. Repeated keyboard
moves retain focus when the expected new order arrives, without stealing focus
from another active field. These checks supplement the original callback counts;
multiselection, multi-board workspace drops and complete original UI/API/security suites
remain separate work.

The native Sort, View and Account header popups exclude one another. Home,
Remaining, Starred and Archive navigation closes them, and Sort uses the shared
Escape/trigger positioning behavior. Saved sort and board-search text survive
these menu transitions. Shared kanban styling is loaded in the stable bootstrap,
so refreshing the Visual container does not temporarily invalidate popup sizing.
Stylesheet/font completion triggers placement again when needed. Desktop/mobile
menu tests, delayed-width/teardown checks and existing layout/live tests cover
this behavior; full original-suite parity remains incomplete.

Polling cost grows with visible cards. Signed-in views still emit native heartbeat
requests; visible people/detail panes are checked even without an active board.
Efficient idle/background suspension, navigation updates while another board or
multiboard report is open, full source inline-edit/unsaved-draft UX and complete
source reactivity remain pending. The three archive callbacks establish that
file's contract; complete original UI/API/security suites still require work.

Each list exposes two independent #5251 timestamps: `modifiedAt` tracks the list
itself (creation, title, order, shared settings or archive), while
`cardsModifiedAt` is the newest known change time among its current cards,
including archived cards. Editing/adding/archiving a card changes the second
value without touching the list document's time. Empty lists and legacy rows
without a recorded time return null. Reading never invents a current timestamp;
when the last timed card leaves a list, its card-change answer becomes null.

Clocks use portable Long millisecond fields in `kb_item_changes`, with UTC dates
on the wire. Copy/import creates fresh destination clocks while preserving the
source clocks; moves transfer scope, and permanent removal cleans clock rows.
Account reference cleanup and removed relationships update affected surviving
cards. Personal star/watch preferences do not modify the list document's clock.
Content, file, timer, archive and shared-setting writes commit their clocks with
their data/history changes, with permission checks repeated under locks.

User deletion requires a site administrator; a board administrator alone is
refused. It removes account/session/token and current/historical privilege
references together, retaining board/card content, files, history and display-only
author attribution. A database failure rolls back and returns a sanitized 500;
the response never reports a deletion merely because the ID was supplied.
As in the original REST route, site administrators may delete their own account;
that Bearer token is then invalid. Native administration keeps its self-delete
guard. Stable opaque IDs, concurrent site-administrator lifecycle policies and
complete account administration remain tracked in `TODO.md`.

Member mutations require a board administrator or a site administrator.
A site administrator can explicitly recover a known orphan-board ID by adding
an administrator through this endpoint; it does not silently create membership.
Global-administrator REST reads are authorized independently as described above. Add/remove replies contain only board `_id`/`title`
rows, never account documents. Unknown accounts produce an empty successful
add/remove response. Role updates return an affected-record count.

Use a named role such as `{"role":"admin"}`, `{"role":"readonly"}` or
`{"role":"normalAssignedOnly"}`, or the legacy boolean/string flags such as
`{"isReadOnly":true}`. A named role wins over supplied flags. The complete
aliases and ordered flag precedence are in
[api-member-roles.json](WeKan/.public/api-member-roles.json), refreshed together
with capabilities by `node tools/import-wekan-roles.cjs /path/to/wekan`.
Simultaneous flags are retained; the source precedence decides capabilities.
Self role changes preserve the existing board-admin bit. An administrator may
replace another legacy owner's implicit role when another administrator remains;
personal preferences are preserved. Native role changes clear stale API flags.

Removing a member keeps an API roster row with `isActive: false`, clears
`isAdmin` and retains the other flags. Inactive rows grant no board access and
do not count toward the final-administrator guard, even if their flags are later
changed to admin. Updating an inactive role (including a submitted `isActive`
field) does not reactivate it. Explicit add reactivates the account and replaces
its old role/flags. Personal preferences survive removal. The native member
picker lists active members; entering the username explicitly can re-invite a
removed account. Account/board deletion removes retained membership rows, and
new accounts cannot inherit historical same-name membership references.

Card-person merge requests need Bearer authentication but no JSON body. They
return `{_id, members: [...], assignees: [...]}`. Adds deduplicate and append in
stored order, and require an active board member; inactive, missing and unrelated
accounts are refused with 400. Removal can clear stale IDs without revalidating
the other people. Empty people fields return arrays. Card members do not grant
board access or assigned-only card visibility; assignees remain the separate
assignment field. Members and people order survive copy, cross-board move and
weba JSON exchange, with account/card/board deletion cleaning their references.

These REST writes require the source canonical write capability and full-card
scope, or a site administrator acting through the explicit scoped mutation.
Each raw `isNormalAssignedOnly`, `isCommentAssignedOnly` and
`isReadAssignedOnly` flag independently refuses general REST writes, including
when role precedence selects Board Admin. Check this before mutation and again
after locking the user/board/card rows. A canonical Worker has separate native
self-assignment operations. Non-scope combinations such as Admin + Worker or
Admin + No Comments follow the source canonical write capability; whole-board
reads have their own source-defined exclusions. A foreign list/card combination or archived
card returns 404. A site-admin mutation clears its temporary scope afterward;
independent REST read checks still apply. Changes, order and audit history commit together; failures
return a sanitized 500 and roll back.

Card PUT implements `members`, `assignees`, `description` and the four date fields below, returning
`{_id}` after commit. Omitted fields remain unchanged. A string becomes one ID;
arrays keep nonempty string IDs; explicit `null`, an empty string, non-array
objects, numbers and booleans clear to `[]`. Unknown/inactive board members are
filtered out. Order and existing duplicate IDs are preserved, as in WeKan's
replacement API, while normalized relations continue to enforce permissions.
Merge additions avoid introducing a new duplicate and removals clear every
occurrence. Copies, moves, JSON exchange and account cleanup preserve or remove
the sequence consistently; existing data retains its legacy read fallback.

The legacy PUT accepts archived-card people/date payloads and returns the ID without
changing them, matching the current WeKan route; merge routes instead return
404 for archived cards. An empty PUT object returns 404 with `{message:"Error"}`.
Unsupported card fields currently return an explicit 400, including when mixed
with supported fields, so an unimplemented update cannot appear successful.
Other card PUT fields, creation/bulk endpoints and full API data parity remain
pending.

`description` accepts any string, including empty text; JSON null clears it.
Other types return 400 before any people/date changes. An omitted description
stays unchanged. Text retains whitespace, Unicode and literal HTML. Valid
JSON-escaped UTF-16 pairs are forwarded as UTF-8 before Gambas 3.20 decoding,
which otherwise loses supplementary characters such as emoji. The native editor
reopens the API description as text. Lone-surrogate behavior remains unverified.

Date fields `receivedAt`, `startAt`, `dueAt` and `endAt` store integer UTC
milliseconds independently of the legacy day editor. Supported inputs include
numeric epochs, integer epoch strings, ISO dates and explicit UTC/offset times.
Empty strings, JSON null and the string `"null"` clear a date; invalid dates are
skipped. A request with no valid supported change returns the legacy 404.
People and dates in one request commit together. The runtime canonicalizes
numeric date JSON before Gambas decoding to avoid millisecond rounding at large
epochs, while preserving the original request-size limit.

An unchanged native due day preserves the exact API instant. Changing that day
sets dueAt to UTC midnight; clearing it removes dueAt and preserves other dates.
Copy/move/JSON exchange retain all four instants. Local-time/unqualified and
freeform V8 date parsing, complete native date/time/time-zone controls and
expanded-year day editing remain pending; the current day field is a UTC
projection, not a complete WeKan date editor.

Native card creation or changing the scalar Assignee field requires an active
member of that board. The server rechecks this inside the save transaction after
locking the target user, board and card. Unknown users, unrelated accounts and
removed members are rejected without creating a card/lane or changing history.
An unchanged historical assignee can remain when editing other fields, and the
field can be cleared. Authorized copy/import paths restore historical values,
including legacy exports with only the scalar assignee. New-card roster picking,
avatars and complete WeKan assignee workflow parity remain pending. Store tests cover denial,
reactivation and stale copy/import; packaged Chromium checks a forged native edit
and confirms the saved assignment remains unchanged.

For a saved card, choose the Assignee button below the scalar field or Assignee
in the card menu. The Gambas tree shows current assignees once per person; the
picker offers active board members who are not assigned yet. Add applies
immediately; selecting a row and removing it also removes all duplicate stored
occurrences. Removed board members can still be removed from the card. These
changes do not change card members. The scalar field follows the primary assignee
so a later Save does not reintroduce a removed primary.

Readers can inspect assignments; general assignment edits require write access
to that visible card, rechecked under user/board/card locks. Workers retain the
separate Assign myself action. When an assigned-only writer removes their own
last assignment, the picker and card details close and the card disappears from
their view. The same popup supports mobile viewports, X and existing translations.
Packaged Chromium tests verify multiple assignments, save/reopen, reader forgery,
assigned-only self-removal and mobile menu placement. These checks do not replace
the complete original WeKan UI suite.

To edit card members in the native UI, open a saved card and choose Members
(before Assignee), or use Members in the card menu. The Gambas tree shows
current members in stored order; the picker offers only active board members
not already on the card. Add applies immediately. Select a current member in
the tree to remove it, including an inactive/stale member. Readers can inspect
the tree but cannot modify it; direct forged events are also refused on the
server. Assigned writers may modify members only on cards they can read.
Workers retain their separate self-assignment controls. Their unassign action
removes every occurrence of their ID. The member tree offers one selectable row
per person even when replacement data contains duplicates; removing that row
clears every occurrence. Card membership does not alter assignees. The dialog uses the shared anchored popup, Font Awesome
icons, X/Escape closing and viewport limits.

Current API account IDs are usernames, including the `:userId` above. Stable
opaque IDs, complete source roster metadata and complete WeKan
identity/data parity remain pending. Native recovery/ownership administration
controls are also still pending; the recovery path above is REST only.

Set `WITH_API=true` to enable data routes. Authentication endpoints remain
available independently, matching WeKan's API gate. Authenticate data/logout
requests with `Authorization: Bearer <token>`; native browser cookies never
substitute for a Bearer credential. Tokens contain 256 bits of random entropy,
expire after 90 days and are stored only as SHA-256 digests. Password changes,
administrator resets and user deletion revoke associated tokens. Responses are
`no-store`. Five unsuccessful/admitted logins within a 60-second peer window
lead to 429 with `Retry-After`; success resets the window. Peer identities come
from the actual socket, and the in-memory table is bounded.

Email/LDAP/2FA authentication, registration policy, configurable expiry, custom
roles/list exceptions and the remaining REST endpoints are still pending. These initial
contracts do not mean that WeKan's complete REST/UI/security suites pass.

`./build.sh test` runs isolated source/archive native and REST tests. To run
only the REST integration tests with a configured toolchain:

```sh
python3 tests/run-http.py --api
python3 tests/run-http.py --api --archive
python3 tests/run-http.py --members
python3 tests/run-http.py --members --archive
```

The API fixture creates accounts only inside a disposable project/database and
checks cookie isolation, stored token digests, foreign-board denial, logout/all,
expiry, reset revocation, disabled API paths and login throttling. Membership
checks add role/flag correctness, negative permissions, minimal responses,
legacy-owner migration, scoped authority, inactive rows without access and
explicit reactivation. Independent SQLite readers force real failed-COMMIT
rollback/retry for active role changes, removal, inactive role changes and
reactivation, checking roles, flags and audit history after each failure. Card
people tests independently force COMMIT failure for add/remove in both fields,
then retry on the same Gambas connection and verify that scoped authority did
not survive. The same independent snapshots also force native editor add/remove
COMMIT failures and successful same-process retries. Two more phases force a
combined PUT replacement and clear to fail COMMIT, then verify exact sequences,
normalized relations and successful same-connection retries. Two additional
combined people/date/description replacement and clear phases bring card-update COMMIT
coverage to ten phases. Native assignee editor add/remove COMMIT failures and
same-connection retries bring the total to twelve phases. A separate HTTP
failure in the second field verifies that the first field and audit history also
roll back. Native store tests cover ordering, copy/move/JSON, invalid-import
rollback, assigned-only denial and deletion cleanup.

User-deletion tests inspect independent SQLite snapshots after denied requests
and a real database failure partway through cleanup, then verify successful
cleanup, retained content and credential revocation. The native deletion UI is
also checked with the packaged Chromium workflow (`WEBA_DELETION_ONLY=1`).

When the parent WeKan checkout is available, `--members` executes four original
`#5998` spec 17 callbacks unchanged (three board-member, one card-member), plus
the original `#3697` people-clear and `#5846` due-date callbacks and unchanged
HashBleed, ErrorBleed and AssignedBleed security callbacks. `--api` executes its
user-deletion callback
unchanged. Both use actual Playwright assertions and explicit SQLite fixture
adapters. User fixtures are created through the real Gambas account store;
post-delete checks read SQLite independently of the HTTP response. Each adapter
reports which callbacks it did not execute. Together they cover ten of the
file's 30 callbacks; the other 20 and the complete original UI/API/security
suites have not passed against weba. The reference checkout's
`tests/playwright/package.json` dependencies must be installed. A standalone
weba checkout can select the reference with `WEKAN_SOURCE=/absolute/path/to/wekan`.
Without a reference checkout, the original-callback check reports an explicit
skip; weba's independent contract/rollback checks still run.

REST read tests compare real responses with independent SQLite results for role
and combined flags, inactive members, global administration, archives, negative/
zero ordering, text, dates and missing targets. A same-process injected SQL failure
verifies sanitized errors and authority reset before retry. Packaged Chromium
reads the actual PUT results through GET before reopening the native editor.

REST write-scope regression tests reproduce the former combined admin/assigned
flag PUT bypass, then verify text/date/people PUT and member/assignee merge/pull
return 403 without data/history/clock writes for every raw assigned-only flag.
A trigger injects each flag at the first board write to verify the later check
and full rollback. All 256 active built-in boolean role-flag combinations are
compared with the actual source `memberRoleOf`, `roleCan` and
`isAssignedOnlyMember`, including independent persisted description reads. This
runs through both source and packaged CGI paths.

Native card visibility also uses all three raw assigned-only flags independently
of canonical role precedence. A member with isAdmin plus any assigned-only flag
retains the administrator's other capabilities while seeing only assigned cards.
Card membership by itself does not count as assignment. This narrowing applies to
card queries, direct details/comments/files/relationships, exports, history and
card mutations. Clearing flags restores ordinary administrator visibility. An
inactive row grants no access, and global site administration is not a native
scope override; its explicit temporary REST override remains separate.

`tests/native-scope-conformance.test.cjs` runs 256 active built-in flag combinations
through actual native card queries/capability checks and compares results with
WeKan's original `memberRoleOf`, `roleCan`, `isAssignedOnlyMember` and
`assignedOnlyAllowsCard`. It creates a disposable project and explicitly isolated
SQLite database. The focused native regression also checks hidden relationships,
attachments, exports/history, denied edits/archive, permitted assigned-card edits,
native site administration, inactive rows and clearing restrictions. Packaged
two-user Chromium checks all three combined-admin flags, native response packets
and forged hidden-card context commands. These are helper/native regression
comparisons, not additional unchanged original callbacks. Custom roles, per-list
exceptions and complete original UI/API/security coverage still require work.

Single-card tests compare both actual GET responses against the original
`cardWithChecklists` serializer for implemented fields, using independent SQLite
inputs. They cover archived/global-vs-scoped behavior, all built-in roles plus
combined/inactive flags, scoped malformed-ID privacy, cookie/API gates, foreign
checklist canaries, exact empty/Unicode text, full UTC date boundaries, creation/
change dates and unchanged card/history/clock snapshots. SQL-failure/retry checks
verify authority cleanup. Packaged Chromium reads native checklist/checkbox edits
through both GETs, then verifies native archiving preserves the global read and
makes the scoped read return 404 (`WITH_API=true WEBA_DETAILS_ONLY=1`). These
helper/contract checks do not add another original spec 17 callback or prove full
schema/deadline/original-suite parity.

List-change tests compare actual HTTP results and independent SQLite inputs with
WeKan's unchanged `newestCardChangeByList`, including an archived dated card and
untimed legacy cards. Store tests cover separate clocks, copy/rename/move/import/
settings, account cleanup, relationship cascades and nulls. The real Gambas clock
is checked against UTC in four time zones (UTC, Helsinki, New York, Kathmandu),
including the older Gambas 3.20 date encoding. Eight injected native clock-write
failures verify full rollback of comments, detail deletion, timer start/stop,
file add/delete, archive and list settings. The twelve real card-update COMMIT
failure/retry phases also snapshot the clock table. Packaged Chromium verifies
actual list times plus member/assignee/editor/content/timer/file workflows.

Date conformance executes 44 supported UTC/offset/epoch cases against the actual
reference date helpers. Description HTTP tests cover both escaped JSON and
direct UTF-8, null/empty clears, invalid types, omitted fields, role/list/archive
boundaries and combined rollback/retry. Packaged Chromium tests (`WITH_API=true` and
`WEBA_MEMBERS_ONLY=1`) verify actual PUT, native Unicode description reopening, unchanged/change/clear and
exported millisecond precision without clearing the other dates.

## Native component layout

The signed-in shell follows the current WeKan control order using Gambas controls:
Home, navigation collapse, page title/logo, available page actions, view menu,
account menu and page-sidebar toggle. Board/archive navigation is on the left,
board tiles or the selected report occupy the center, and page actions open in
an optional right sidebar. Card fields appear in a closable panel only when
creating/selecting a card. Profile and password-policy forms occupy the content
area; the administrator's available sections use the left navigation.

Only implemented functions are offered; matching the component placement does
not imply all WeKan features have been ported. The current layout was compared
against the running WeKan UI and checked in Chromium at 1440×1000 and 390×844.
The browser test checks geometry, native menus, board/card creation, calendar,
admin navigation, panel toggles and the native keyboard-focus outline.

For an isolated real-browser test, provide a Chromium CDP endpoint and Puppeteer
available to Node (for example the enclosing development checkout's dependencies):

```sh
WEBA_BROWSER_URL=http://127.0.0.1:9231 python3 tests/run-http.py --browser --archive
```

The runner copies sources into a temporary project, creates a fresh test database
and closes its test server afterward. `WEBA_SCREENSHOT_DIR` optionally saves
screenshots to an existing task-owned temporary directory. It does not use your
normal browser profile or application database. Chromium must be started with
its own disposable profile and remote-debugging port before running this check.

## Native board and card actions

Board tiles and swimlane/list/card headers open native Gambas context menus.
Rename/copy, colors, stars, WIP limits, same-board moves, archives/restoration,
scoped history and JSON export persist through owner-checked database operations.
Card/list/swimlane menus also move items between owned active boards. Relationships
must stay within one board: a move that splits a subtask/dependency group is rejected.
Archived items can be permanently removed by typing their exact title; container
removal includes its cards, file bytes and dependent records.

The card editor and menu provide comments, checklists/items, real subtask cards,
dependencies, card-level text/number/date/checkbox fields, time entries/timers and
native attachment upload/download (10 MiB each). Copying containers/cards preserves
rich records and remaps internal links. Running timers are excluded from copies.
Watch preferences are saved, but notification delivery is still pending.

The page sidebar's **Import weba JSON** file control imports a `weba-2` export into
a new board after confirming its title. JSON exchange includes empty layouts,
order, archive state, metadata, rich records and base64 file content; identifiers
are remapped transactionally. Import JSON is limited to 20 MiB. Imported running
time entries become stopped records. This format does not yet accept Meteor
WeKan export files or transfer activity history/member accounts.

Focused isolated browser checks use the same runner as the layout test:

```sh
WEBA_MENUS_ONLY=1 WEBA_BROWSER_URL=http://127.0.0.1:9231 python3 tests/run-http.py --browser
WEBA_DETAILS_ONLY=1 WEBA_BROWSER_URL=http://127.0.0.1:9231 python3 tests/run-http.py --browser
WITH_API=true WEBA_MEMBERS_ONLY=1 WEBA_BROWSER_URL=http://127.0.0.1:9231 python3 tests/run-http.py --browser --archive
WEBA_TRANSFER_ONLY=1 WEBA_BROWSER_URL=http://127.0.0.1:9231 python3 tests/run-http.py --browser --archive
WEBA_EXCHANGE_ONLY=1 WEBA_BROWSER_URL=http://127.0.0.1:9231 python3 tests/run-http.py --browser --archive
```

Shared membership/roles, public boards, rich text, board-level field definitions,
notification delivery, full administrator menus, automation and integrations
remain tracked in `TODO.md`. SQLite on Linux ARM64 and Chromium are tested;
other Gambas database drivers and browsers still require conformance checks.

Color dialogs offer WeKan's preset colors as native Gambas buttons, a browser
color-wheel picker and a synchronized `#RRGGBB` field. Lists/swimlanes use the
25-color item palette; cards omit white as WeKan does. Boards offer 25 theme
color samples. Gradient/special board themes currently apply a solid base/first
color stop; their complete theme styling remains future work. Refresh the
source snapshot with `python3 tools/import-wekan-colors.py /path/to/wekan`.
The isolated color workflow is checked with `WEBA_COLORS_ONLY=1` and the browser
runner above, covering persisted values, invalid hex input and mobile placement.

## Interface translations

The login page and signed-in account menu have a language selector. The selected
language is saved in this browser; a new browser starts with its preferred language
when available. The imported WeKan catalog currently provides 125 matching interface
keys for 237 languages, including their native language names and RTL metadata.
Only the selected catalog is fetched, from local application assets. No external
translation service is used. Labels and report/calendar headings are translated;
user data and stored workflow statuses are preserved. Weba-specific messages with
no matching WeKan key remain English (`WeKan/.public/i18n/manifest.json`).

Refresh the imported subset from an actual WeKan source checkout:

```sh
python3 tools/import-wekan-translations.py /path/to/wekan
```

The importer copies existing translation values verbatim without changing WeKan
files. It writes the language metadata, selected catalogs and a source fingerprint.
Review alias mappings when adding interface text. Translation data originates in
[WeKan](https://github.com/wekan/wekan), copyright Lauri Ojansivu, under the MIT
license included with this repository.

`node tests/i18n.test.cjs` checks catalogs, persistent selection, RTL, AJAX updates,
English fallback and protection of user content. The isolated browser translation
check can also run with `WEBA_I18N_ONLY=1 WEBA_BROWSER_URL=http://127.0.0.1:9231`
and `python3 tests/run-http.py --browser --archive` against a local Chromium CDP
instance, using the same Gambas environment as the other HTTP tests.

## Swimlane controls

Opening a board selects Swimlanes. Each swimlane has collapse/menu/add-swimlane
controls at the right of its header. Each list has collapse at its top-left and
add-card/menu/add-list at its top-right, plus an Add card action below its cards,
following the current WeKan component templates. The list composer opens directly
after the chosen list. Empty swimlanes and custom lists are saved in the database;
legacy card swimlanes are retained when the layout tables are initialized.

Card buttons open the native Gambas editor with the correct swimlane/list, and
card tiles open their existing details. Custom list names are limited to 32
characters to fit the existing portable card schema. This does not yet implement
all WeKan list/swimlane menu actions or creating a new card at the top through
the header button. Existing cards can be reordered by dragging. `WEBA_SWIMLANES_ONLY=1` selects the dedicated Chromium layout/action test
with `tests/run-http.py --browser` (also supports `--archive`).

## Icons and popups

Interface icons use the same locally bundled Font Awesome 6 assets and legacy
aliases as WeKan (including regular/brand icons and its `fa-times-thin` close
alias). No icon CDN is required. Card details open near their initiating action;
position and maximum size track the visible viewport, including mobile landscape
and viewport changes when the on-screen keyboard opens. Long content scrolls
inside the window. Popups have a top-right X and Escape dismissal; closing card
details returns focus to the initiating control when that control still exists.

`node tests/popup.test.cjs` checks placement at viewport edges and reduced visual
viewports. `WEBA_POPUPS_ONLY=1` selects browser checks for anchored card editing,
reachable close buttons, view/account/structure menus and portrait/landscape
behavior in the isolated `tests/run-http.py --browser` harness.

## Touch drag and drop

Use the Font Awesome arrow handle on a card, list or swimlane to drag it, as in
WeKan's touch mode. Touch targets expand to at least 44 pixels; card handles sit
on the trailing edge below the title area. Movement starts after 7 pixels. Touching elsewhere keeps
normal browser scrolling and tapping a card still opens its details. On a mouse,
a card can also be dragged from its surface. Focus a handle and use arrow keys
for keyboard moves. Drag near a scrollable edge to auto-scroll; Escape, touch
cancellation or a second finger cancels without saving.

Cards can be reordered and moved between lists/swimlanes within the current
board. Lists can be reordered or moved to another swimlane with their cards;
touch/small-screen moves ask for confirmation. Swimlanes can be reordered. Moves
are owner-checked, rejected for archived boards/cards, saved transactionally and
retained when reopening the board. Existing data receives a separate `kb_order`
metadata table; card descriptions, labels, dates and ownership are preserved.
Cards retain a stable list ID, so moving a list into a swimlane that already has
a list with the same title keeps the two lists and their cards separate. Existing
name-based assignments are retained when identity metadata is initialized.
Cross-board drag moves remain future work.

`node tests/drag.test.cjs` checks gesture selection, threshold, cancellation,
UTF-8 transport and keyboard input. `tests/DragStoreTest.module` runs in the
isolated store harness. `WEBA_DRAG_ONLY=1` selects the Chromium CDP touch/mouse
checks in `tests/run-http.py --browser` (also `--archive`). Actual physical touch
hardware and non-Chromium browsers have not been tested.


### Personal workspace service

`BoardSpaces` provides current-user nested workspace creation, literal Unicode
names/icons, sibling ordering/reparenting, subtree deletion and personal board
assignments. Duplicate names are allowed; committed IDs are never reused.
Readonly members may organize boards they can read. Assignment rechecks board
access after locking; clearing an obsolete personal assignment needs no current
board access. A site administrator cannot edit another user's workspace tree.

Deleting a subtree clears its assignments so boards return to Remaining.
Account deletion/recreation clears private nodes/assignments; permanent board
deletion clears assignments for every user. These operations do not write shared
board history or activity. Native tests exercise rollback/retry, late parent and
membership changes, isolation and cleanup on SQLite/Linux ARM64. Schema and
queries use portable Gambas APIs; other drivers still require verification.

The native workspace rows/forms and board assignment controls described below
now use this service. The workspace tree gestures below also use its locked
operations. Complete original UI callbacks remain open; no new public workspace
API is exposed by the service.


### Native workspace controls

The left navigation shows personal workspaces as nested native Gambas button
rows, with a WeKan `fa-bars` menu beside each row. The plus button creates a root
workspace. A workspace menu edits its name/literal icon, creates a child or
deletes the subtree after the confirmation checkbox is selected. Blank names
keep the editor open. Icons are displayed as literal text for now; Markdown
rendering remains pending.

A board's menu offers **Workspaces**, including a Remaining destination and
workspace paths. This is a personal placement operation, so readonly members
can use it for boards they can read. It does not change board ownership or other
users' placement. Nonempty board search still spans categories.

Live polling refreshes the private tree/assignments and the current overview
when they change. Keep a dirty workspace editor intact during external renames;
close it if its node/parent disappears. Losing board access clears/closes its
placement panel, and a stale Save event cannot change assignments.

`tests/workspaces.browser.cjs` runs real native controls against disposable
SQLite fixtures. It covers nested CRUD, literal Unicode/icon persistence,
readonly placement/unassignment, category/search changes, reload/user isolation,
external placement/name/deletion changes, dirty drafts, revoked Save denial,
Finnish/Latin captions and mobile popup/Escape. `./build.sh test-live` includes
it for source and packaged apps. Run it separately with the documented Gambas
and Chromium environment using `python3 tests/run-http.py --workspaces`, adding
`--archive` for the package.

Multi-board drops, complete form semantics and original All Boards callbacks
remain open. Single-board drops are described below. Native Latin
checks are separate from running the original callback unchanged. Imported
workspace, collapse and archive-confirmation labels now bring the local selection
to 125 keys in 237 catalogs;
user workspace names and destination paths are never translated.


### Workspace folding and counts

A native caret appears before workspace names that have children; leaf rows keep
the same space reserved. Click it or use Enter/Space to fold/unfold children.
The caret retains keyboard focus after the native rows refresh, announces the
translated action plus the literal workspace name and exposes `aria-expanded`.
Folding a parent preserves a selected child's board view.

Fold state belongs to the current user, survives reload and updates across live
private changes. Only folded IDs are stored; expanding deletes the row. Writes
lock/recheck the account and workspace, and subtree/account deletion removes the
state. This does not change shared board history, tree placement or assignments.

The count after each menu is the number of directly assigned readable active
boards, independent of current search and child assignments. Internal helper
board titles (`^Subtasks^`) are excluded using the source helper's line-terminator
rules. Archiving or losing access removes the board from the count; restoration
or a personal assignment updates it. These are signed-in native SQL board counts;
organization/team/template schema and complete original wire/UI parity remain
separate requirements.

`BoardSpacePresentationTest` verifies storage, isolation, fresh ownership guards,
SQL failure rollback/retry, archive/revocation behavior and lifecycle cleanup.
`board-space-counts-conformance.test.cjs` compares 25 actual native count results
against the unchanged original helper function, including Unicode and legacy line
terminators. The workspace browser test covers persisted mouse/keyboard folding,
hidden selection, live counts and named translated aria labels on source and
packaged apps. Other drivers and complete original callbacks remain unverified.


### Native workspace ordering

Drag a workspace name with the mouse, or use its native `fa-arrows` handle with
mouse/touch. The top quarter of a target row inserts before it, the bottom
quarter inserts after it and the middle half appends inside it. The row shows
the intended slot. Ordinary touch on a name keeps scrolling; menus/carets do not
start a sort. Cancel, Escape, outside drops and detached origins do not save.

The handle also accepts Up/Down for sibling order and logical Right/Left for
indent/outdent (reversed in RTL). Focus follows the moved row after the matching
native update. A folded target stays folded; if the moved row becomes hidden,
keyboard focus returns to that target's handle. A later gesture or another
keyboard drag kind clears the previous focus request. Workspace ordering is
available in All Boards categories, including Archive, and does not archive a
board or change assignments/fold state. Single board-to-menu drops are described
below; multi-board drops remain separate work.

`BoardSpaces.Drop` resolves the target parent and next sibling inside the user
transaction. It rejects foreign/self/descendant moves and skips unchanged rank
updates. Native tests cover partial failure rollback/retry, late foreign parents
and stale/deleted/session guards. A 196-case comparator checks actual SQL trees
against the original `workspacesTree.moveWorkspace` helper.

`workspace-order.browser.cjs` uses real mouse, keyboard and trusted CDP touch,
checks both SQL and the visible native tree and compares outcomes with that
original helper. It covers nested/root moves, repeated focus, folded targets,
scroll/cancel/reload/isolation, Archive and forged cycle/foreign/profile commands.
It runs in test-live for source/packages; run separately with the documented
toolchain/CDP environment using `python3 tests/run-http.py --workspace-order`,
adding `--archive` for the package. This does not run all original workspace
UI callbacks unchanged or implement their full desktop-handle preferences,
multiselection, multi-board drop targets or Markdown icons.


### Single-board drop targets

Drag a board to a workspace to set your personal placement, or to Remaining to
remove that placement. Starred adds a missing personal star without moving the
board or removing an existing star. This add-star gesture accepts a board from
Remaining or a workspace. Existing stars and other users' placements/stars stay
independent. Active-board personal organization needs read access.

Archive asks for confirmation and requires board management permission. Drag an
archived board to Remaining or a workspace to restore it; this also requires
management permission and commits the archive/activity and personal placement
changes together. A failed placement cannot leave the board partly restored.
Global Archive includes assigned archived boards so these targets stay reachable.

Native board handles are available in sorted and Archive modes for placement;
only Custom supports grid/keyboard reordering. Sorted handles use the Move
caption. Mouse surfaces and touch handles use the shared gesture engine, while
ordinary touch remains scrolling. The server rechecks the current visible page,
read/manage rights, archive state and owned target; reserved fields and foreign/
private/stale commands cannot bypass those checks.

`BoardDropTest` injects placement/unassignment/activity failures and late access,
role, workspace-owner and archive-state changes. A separate 156-case comparator
executes unchanged original workspace/menu/archive callback bodies with explicit
DOM/dataTransfer/Meteor adapters and compares their supported single/multi/mixed
outcomes with native SQL results. It does not exercise the whole original UI
fixture or authorization/rollback behavior, which have separate native tests.

The real two-user `board-drops.browser.cjs` checks sorted mouse/trusted CDP touch,
confirmation/cancel, readonly denial, assigned Archive visibility, restoration,
independent SQL placements/stars, reload and forged private/foreign/reserved
commands. It runs in source/packaged test-live; use
`python3 tests/run-http.py --board-drops` (add `--archive` for the package) with
the documented local toolchain/CDP environment. Multi-board selection UI/transport, Home/group
targets, complete original UI/API/security suites and other drivers remain open.


### Native board batch service

`BoardSpaces.DropBoards` now provides the transaction behind future native
selection controls. It accepts a typed unique ID list and the existing supported
drop target/source context. It is not yet connected to selection checkboxes,
sidebar batch controls, multi-drag transport or a new public HTTP route.

Retained selections may contain both active and archived boards. Workspace/
Remaining drops restore only archived members; those restorations require
management permission, while active personal placement requires read access.
Add-only Starred leaves archive state unchanged. Archive skips an already
archived member after checking management authority. Context restrictions still
apply, including no add-star drop from the Archive origin.

The service preserves caller order, acquires board locks in ascending numeric
ID order and snapshots archive state. It validates all boards before effects,
each effect and final identity/target/scope/state before committing. Archive,
activity and personal changes share the transaction; losing one board or target
rolls back the entire set. Empty, duplicate, nonpositive, foreign and stale
inputs are rejected.

The native test traces actual lock update order and injects second-write,
late-lock, per-effect and final-effect failures, including loss of restore
management after the last activity. Independent SQL snapshots check all affected
board/assignment/star/activity/member/workspace fields. A successful mixed-role
case keeps an active member readonly while authorizing restoration of another.
The original callback comparator now checks 156 single/multi/mixed final states;
permission and atomic-failure coverage are separate native evidence. Existing
single-board source/package browser regressions also pass. These results do not
prove a multi-selection UI or unchanged full original suites.


### Native board selection

The header Multi-Selection control enables native per-form selection and opens
its sidebar. Checkboxes select individual visible boards; Select all adds the
current page and Select none clears the retained set. Selection survives search,
page and category navigation within that form. Turning the mode off or reloading
clears it. Search can open its sidebar while selection remains active.

Dragging a selected board to a supported workspace/menu target moves the retained
set, including selected boards outside the current filter/page. The ghost shows
the selected count. An unselected board still uses the single-board path. Grouped
boards do not reorder the Custom grid. The browser sends one visible selected
origin and the revision captured at gesture start; the server supplies the ID
list from private state. Stale revisions, private/off-page origins, disabled
mode and single-drop attempts on selected origins are rejected. DropBoards
rechecks every retained board's current access and commits the set atomically.
Remaining and Archive clear selection after success; workspace and Starred retain
it. Board batch sidebar actions, Home/group targets and original UI callbacks
remain separate work; no new public HTTP endpoint is introduced.

BoardSelectionTest exercises native principal/session/form isolation, visible-only
selection, retained ordering and revisions. The gesture test checks captured
revisions, ghost count, cancellation and group reorder exclusion. The real
board-selection.browser.cjs test checks native controls, filtered and 25+5-page
selection, mouse and trusted mobile touch, private/stale/single-drop bypass
denial, off-page access revocation with no partial placement, clear/disable and
reload/form isolation. It runs in test-live for source and packaged apps, or with
`python3 tests/run-http.py --board-selection` (add `--archive`). This coverage
does not establish that all unchanged original WeKan suites pass.


### Selected board stars

The selection sidebar offers Star the selected boards, or Unstar the selected
boards when every retained board is starred. A mixed selection adds only missing
stars. This is independent of placement and other users' preferences, works for
readonly board members and retains the selected set. Archive hides the action;
forged Archive or inactive-mode events are rejected on the server.

The server takes IDs from private selection state, locks the account and sorted
board IDs, decides the action against current stars and rechecks all read access
before commit. Failure on a later write or loss of access after the final write
rolls back the entire set. Native tests inject these failures and verify retry,
personal isolation and that existing stars are not redundantly written. The
source/package selection browser test checks a 30-board retained set, mixed and
all-starred captions, revoked off-page denial and forged control events. This
covers the star action; other selection sidebar actions remain in TODO.md.


### Selected board archive confirmation

Move Board to Archive in the selection sidebar opens a native confirmation
checkbox with Archive and Cancel. Confirmation captures a server-private
selection revision; changing selection, disabling the mode or entering Archive
cancels it. A forged or stale Confirm cannot archive another selection.

Confirm passes the retained server-owned IDs to the atomic batch service. Every
board requires management access; a readonly board rejects the whole set.
Cancellation and unchecked confirmation write nothing. Successful archiving
clears selection and closes confirmation; failure preserves the selection for
correction or retry. Current Archive hides this action and rejects forged events.

selection-archive.browser.cjs checks two users against actual native controls and
independent SQL state: confirmation/cancel, readonly batch denial, revision
invalidation, exact selected owner archive, clear/reload and forged Archive
commands. test-live includes it for source and packaged apps; run separately with
`python3 tests/run-http.py --selection-archive` (add `--archive`). Native batch
service tests separately cover rollback and late authorization. Full original
sidebar callbacks and remaining batch actions stay in TODO.md.


### Explicit nullable export fields

Native weba JSON exports retain every row field selected by the serializer,
including nullable description, assignee, labels, due-day and checklist text.
False booleans and zero numbers remain explicit. The previous indexed Collection
assignment omitted null-valued fields; Collection.Add preserves those keys.
ExportFieldsTest checks the raw JSON rather than decoding it through the same
Gambas collection behavior. It fails before this change and passes afterward.

The current SQLite driver exposes empty SQL text as null-like values, so this
change preserves explicit keys but does not recover an empty/null distinction
the driver has already lost. Other original JSON wire contracts and selected
multi-format exports remain pending.
