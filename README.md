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
`X-WeBa-Request: 1`; the body contains the native form command. Native login
credentials and form commands stay in request bodies. Native uploads/callbacks use
the same request-header/origin check. Large text updates use private mode-0600
request files that are removed after the request, including timeout/failure.

Each ordinary HTML navigation gets its own native GUI process. The rendered
`weba-page` meta value routes native requests through `X-WeBa-Page`; it is an
opaque document namespace, not a login credential. The host binds that namespace
to the incoming shared UI cookie and selects only its registered native process.
Raw single-document clients can supply the same header when fetching a snapshot;
ordinary browser navigations create a fresh form. Closing a document releases only
its GUI process through the protected `/_weba/page-close` endpoint. The internal
Gambas logout path remains inaccessible to external requests.

Shared login uses a separate random `WEBA_UI_AUTH` HttpOnly, SameSite=Lax cookie
(`Secure` with an HTTPS public origin). Only its digest, account generation and
idle expiry are stored in `native_ui_sessions`. It is separate from REST bearer
tokens. Native callback/upload paths check this credential before dispatch;
stale document tokens cannot authorize another browser. Logout revokes the shared
credential so peer tabs return to login. A successful own-password change rotates
the retained cookie's generation within the password transaction; other browser
credentials are revoked by the account epoch. Active requests keep sibling GUI
processes alive with clean passive pulses that perform no form actions and do not
renew authentication expiry. Expired peer namespaces are retired when Gambas
requests a reload. Native HTML and command replies use `no-store`.
The real cookie, API token and credentials never enter board URLs or the page
routing token. Use the runtime host for these boundaries; embedded IDE serving
does not provide this document/authentication protocol.

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
| `GET /api/boards/:id/attachments/:attachmentId/export` | Source-shaped single-file JSON with private full-board exporter permission, live-only bytes and export policy |

Board/card/list REST projections follow WeKan's `Authentication.checkBoardAccess` and
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

`wekan-catalog-server.browser.cjs` runs three unchanged original spec 39 server
callbacks plus its unchanged sort/search UI callbacks and hooks. It uses real
`BoardCatalog.Page` results and native UI controls, seeds and cleans
native boards, revalidates an actual API token before each call and explicitly
maps its verified identity to a native fixture session through a test-only RPC
binding. This covers page disjointness, search totals and private-board exclusion.
A revoked-token check proves rejection before native service invocation even
while the native UI remains signed in.
Each original callback gets fresh native normal accounts, created and deleted
through native admin services, preserving the original fixture isolation from
earlier suites and their boards/preferences.
Numeric-ID, fixture DB and transport/session adapters do not establish production
DDP/routing parity. The persisted user-profile sort assertion explicitly maps to
an independent read of `kb_board_preferences`; it does not implement the source
profile/publication model. All six callbacks have adapter-backed execution: five
here and the Latin callback separately below. `--catalog` and `test-live` include
this runner; `python3 tests/run-http.py --original-catalog [--archive]` runs it alone.
The production overview is a semantic list (`ul`/`li.js-board`) with escaped
`.board-list-item-name` text. Search controls expose the original source selectors;
the unchanged search callback uses real native events, without locator adapters.
List styling preserves the native tile grid, selection and drag surfaces.
Sort choices are anchors retaining native IDs, event handlers and text updates.
They expose source `data-sort`/active classes, support Enter/Space without
fragment navigation and preserve translated captions. Only visible sorted paging
controls carry `.boards-pagination`; Custom mode retains the stable native
layout class while exposing no source pagination selector.

Workspace editing uses a real `.js-workspace-actions-form` with `data-id`, a
required `.js-workspace-name` textarea, `.js-workspace-icon` input and translated
Save submit input. Native controls retain their drafts, Unicode values and
literal icon persistence. The server binds the submitted name/icon snapshot to
the open editor revision, actor and session generation; its private workspace ID
is authoritative. Closed, completed or substituted editor commands and old native
Save-button events cannot write. Creation remains a separate form. The contextual
edit-name key is copied from the source into all 237 catalogs (now 163 keys total).
A separate sibling `.js-workspace-subspace-form[data-id]` provides an optional,
labelled `.js-subworkspace-name` textarea and translated submit button. It submits
only the child-name snapshot; the native open editor selects the authoritative
parent under revision/actor/session checks. Empty/ECMAScript-whitespace-only input makes no
mutation and closes the editor, matching the source submit lifecycle. Successful child creation preserves the stored parent name/icon even
when its edit form has an unsaved draft. DOM parent tampering, legacy button
events, stale parent editors and completed/closed packets cannot redirect or
repeat creation. Original `addSubworkspace` helper outcomes are compared with
actual UI SQL mutations through explicit method/identity/SQL-ID adapters.
Workspace icons now use the unchanged source viewer/helper and DOMPurify
sanitizer in a standalone browser bundle; names remain literal text. Empty icons
show the source folder glyph. The bundle includes Markdown/emoji/math/highlight/
task-list/hidden-link handling and exact source security rules. Native icon links
select the workspace without navigating. Raw icon values remain text in native
controls/SQL and are sanitized before insertion into the visible icon container.
Native Global Admin settings drive raw-code, URL-scheme and external-rule
policies through nonsecret reader snapshots. Readable native navigation titles
now drive reactive card-title labels as described below. Private icon-color
metadata is preserved and rendered too; full source DDP integration remains open.

Rebuild with `node tools/import-wekan-markdown.cjs /path/to/wekan` using that
checkout's installed dependencies. The source copies, hashes and dependency
versions live in `vendor/wekan-markdown/manifest.json`; deployed notices are in
`WeKan/.public/workspace-markdown-LICENSES.txt`. `workspace-markdown.test.cjs`
compares 136 bundled outputs with the unchanged parent helper/sanitizer and
checks injection/form/URL guards. Full original popup/transport integration
remains pending.

Global Admin / Security exposes **Always show all code as plain text** with an
explicit Save. `MarkdownPolicy` persists its source-default-false boolean and
private actor/time audit. Saves require a typed boolean, current admin/session
identity and locked/final rechecks, rolling back data/audit after write or late
role/session/value failures. A hidden read-only boolean snapshot updates the
source renderer live; a reader reload starts with the persisted policy. Settings
fields refresh when clean and retain drafts; losing admin access hides/clears the
panel and forged saves fail. Labels use 170 imported keys across 237 catalogs.
`MarkdownPolicyTest` and `markdown-policy.browser.cjs` cover defaults, private
audit, denied/failed writes, retry, two-session raw/rendered updates, reload,
external refresh, dirty drafts, demotion, mobile layout and Finnish controls.
Run `python3 tests/run-http.py --markdown-policy [--archive]`, or `test-live`.

The same panel offers a separate Save for **Automatic linked URL schemes**.
`markdown_url_settings` stores the exact source text and a private actor/time
audit; empty/null means no extra schemes. Typed text saves use the same locked
admin/session/final-value guards and rollback discipline. Public readers receive
only the text, parsed by the unchanged `models/lib/urlSchemeAllowlist.js` bundled
with the viewer: whitespace/comma/semicolon separators, case normalization,
deduplication, sorted names and a 50-scheme cap match the source. Built-in schemes
need no entry; executable/hidden-content and unsafe OS handlers stay forbidden
even when listed. JSON snapshot transport escapes spaces and line breaks before
Gambas label rendering, preserving exact source text and one-scheme-per-line
separators. Live changes update existing icons and reloads. Clean fields
refresh, dirty text survives external updates, and demotion clears the field.
Native tests cover typed/private/write/late role/session/value failures; real
browser tests cover exact persistence, custom/forbidden links, live/reload/draft
updates, forged saves, demotion and translated accessible mobile controls.

External issue-tracker prefix, URL template, multiline rules and identifier
abbreviations now have four translated, accessible fields and a single atomic
Save in Security. The native handler applies the source form's Unicode trimming.
`ExternalLinkPolicy` stores typed text together with private actor/time audit;
the source limits are 20,000 UTF-16 units for rules and 5,000 for abbreviations.
Missing/extra/mistyped values and late identity/role/value changes cannot partially
save the group. Public readers get only four nonsecret strings in a lossless JSON
snapshot; the unchanged source viewer applies prefix replacement, rule parsing,
aliases, existing-link protection and URL sanitization. Empty fields disable the
corresponding feature. Clean editor groups refresh live; any dirty field retains
the entire draft until explicit save, and demotion clears all four. Native tests
cover validation, audit and rollback/retry; browser tests cover trim/multiline,
combined links and aliases, protected links, unsafe targets, live/reload/disable,
clean/dirty groups, forged/demoted saves and mobile/Finnish controls. The fixture
explicitly rebuilds typed strings after Gambas JSON decoding of empty values;
this is a disposable test adapter, not a production settings API.

Workspace Markdown card URLs now use the source `resolveCardTitle` bridge.
`BoardLive.CardTitles` projects only the same card IDs/titles already used in
native navigation for the current active/archive context. Existing board access,
raw assigned-only flags and deleted-list filters apply; no new title lookup API
or public/global title cache is introduced. A lossless per-session JSON snapshot
feeds an own-key/string-only resolver in the bundled unchanged source helper.
Title changes refresh icons live. Missing, deleted, unassigned or revoked targets
fall back to the original URL; the source keeps comment/activity anchors,
existing-link protection and bracket/backslash escaping. Source sanitization
still applies to title markup. Native tests cover private/assigned-only scope,
read stability/no activity, rename, assignment loss, archive context, deleted
lists and revoked membership/sessions. Real browser tests cover current titles,
private snapshot/page isolation, hostile labels, reload and live fallback/recovery.
The source oracle now compares 136 outputs, including 24 card-title cases.
This bridges native navigation snapshots; original Meteor publications, IDs and
card route transport remain pending.

The Home sidebar row shows the current private Home mark as zero or one active
readable board. Its catalog supports global title search; Multi-Selection toggles
exactly one board and retains a refused multi-board selection. Home remains
independent of stars/workspaces, updates on external preference/access changes,
and has no Add Board tile. Archived/deleted IDs remain saved until explicitly
cleared. Dropping one board onto Home replaces the mark without toggling it.
Multiple selected boards are refused with the source warning and retain their
selection. A board picked up in Home gets only the full-width Remove bar as a
board destination; the bar appears only during that drag, becomes red under the
pointer and asks before clearing the matching mark. Escape/cancel preserves it,
and the board remains in its workspace or Remaining. Workspace tree ordering
continues to work in Home. The empty Home instruction is shown when applicable.
Native commands validate source view, visible origin, reserved fields and the
captured server-side selection revision. Archive multi drags cannot set Home.
`python3 tests/run-http.py --home-drops [--archive]` covers mouse/grouped/trusted
touch gestures, native forgery denial and Finnish captions. The 60-case
`tests/home-drop-conformance.test.cjs` runs unchanged source Home/Remove callback
bodies with explicit DOM/DataTransfer, confirmation, selection and synchronous
method adapters. Desktop mouse board drags now use real HTML5 events and the
original text/plain, multi and source MIME markers. Touch retains the pointer
engine and handle-only pickup. Native desktop hover reads protected-store types
only; drop checks its captured payload before sending the existing private
origin/selection-revision command. The browser's pointercancel does not abort an
HTML5 drag; drop/end/Escape clean up without a second submission. Detached
origins, tampered local payloads and malformed local selection snapshots
cannot submit through the same-form path. The selected-ID DOM snapshot is MIME
metadata only; the server derives actual group IDs from private selection state.
Cross-document Home set/Remove uses a separate private-profile command: MIME
identifiers are untrusted input, never an actor or permission. Parse the entire
single/group payload before effects, allow canonical native string IDs only,
and use the ordinary locked Home session/read/active checks. Workspace/file
MIME, Archive-multi Home sets, Home-origin other targets, non-Home commands and
Remove outside the Home view are refused. A valid group clears the recipient
form's selection only after success; a refused group retains it. External Home
removal shows the bar only while a Home-origin drag is inside the Home view,
asks before conditional clearing and leaves the board/stars/placement intact.
Drag depth, leave/drop/Escape and direct local-origin dragend handling clean up
marks and bars, including refused external drops and detached local sources.
A stopped external dragover stream also expires visual state after 1.5 seconds:
some browser/driver cancellations deliver dragend only to the source document
without a final recipient dragleave. Regular hover events renew this fallback;
it never submits a command and the next hover restores eligible targets.
Run `python3 tests/run-http.py --home-external [--archive]` for real Chromium
drags from an independent iframe document carrying only MIME IDs into the native
form: no source-form/session or authorization adapter. Native parser, role,
rollback and event negatives run in the local suite. Other cross-document board
destinations and original Meteor integration remain pending.

Native board visibility now has a private-default storage and read-access
foundation. `BoardVisibility` persists board private/instance/public permissions,
board instance-editing allowances and global private-only/instance-editing policy
in normalized tables. Legacy boards remain private. Read-only checks do not
create visibility tables. Manager/site-admin writes use strict input types,
account/policy/board locks, fresh identity/permission/owner/value checks and atomic
rollback; global settings require a current site administrator. Private-only
policy rejects explicit open-board changes while the source import-policy helper
coerces imported open permissions to private. Existing open boards retain their
permission when the policy changes. Purging a board removes its visibility row.

`BoardAccess.CanRead` separates readable public/instance boards from actual
membership. Signed-in nonmembers can resolve native public/instance board and
card routes without gaining mutation capabilities or joining the board. Active
assigned-only members keep their card restrictions; inactive public members read
as nonmembers. Native selected-board rendering and readable open favorites work
without adding unrelated open boards to personal catalogs. Default/API board
enumeration and whole-board REST membership/site-admin authorization remain
separate. Core native guest board/card entries and signed-in Public discovery
are described below. Guest child models and full source route/form integration remain pending.

`BoardVisibilityTest` checks defaults, strict values, administrator/manager
boundaries, private-only policy and late SQL/owner/epoch/policy/privilege/value
rollback. `BoardVisibilityReadTest` runs with native sessions and separate API
principals for assigned/inactive scope, favorites, selected rows, revocation and
whole-board REST refusal. Another 774 actual native outcomes match unchanged
source read/open, strict instance-editing and private-only import helpers.
The complete local suite (including 64 host tests) and complete source/packaged
browser suites pass. Global policy/editing controls, join-on-first-edit, import/copy integration
and original Meteor publications/callbacks remain pending; persisted editing
flags alone do not grant nonmembers editing.

The native board menu now exposes Visibility to board managers and readable-board
site administrators. The popup selects Private, Signed-in users or Public with
existing WeKan captions for all 237 native catalogs. A private binding captures
the board, actor, account generation and navigation context; stale, closed,
replayed, foreign-context and demoted saves are refused server-side. A permission-
only save reads and preserves the board's editing allowance under the existing
transaction lock. Private-only policy rejects open permissions with no audit or
permission writes. Clean choices follow external changes while dirty choices
remain intact; losing authority clears the popup and its private binding.
Navigation, Escape and close controls retire it. Fixed choices translate while
the board name remains literal, including a board named Public.

`python3 tests/run-http.py --board-visibility [--archive]` exercises real manager,
readonly and signed-in nonmember pages: persisted changes, forged/replayed/stale
saves, policy refusal, live clean/dirty refresh, demotion cleanup, public readonly
routes and immediate private-transition revocation, plus Finnish mobile geometry.
The same check runs in the complete source/packaged browser suites. The complete
local suite (64 host tests) and complete source/packaged browser suites pass. Anonymous
guest child models, global visibility controls and first-edit membership remain
pending; this editor does not expose the editing allowance. Native signed-in
Public discovery is described below.

Native `/public` now opens a separate read-only discovery table after login.
The account menu provides the same entry; direct GET, reload and Back/Forward use
the acknowledged native route flow, with a canonical `/public` URL and ignored
query commands. Ten rows render per page, with title search submitted on Enter
or Search. Public boards and signed-in instance boards are included; archived,
private and internal caret-wrapped helper boards are excluded. Search is literal,
not a caller-provided regular expression or selector. Unsubmitted text remains a
draft while the current result set refreshes. Live title/permission/archive changes
refresh rows/counts and clamp an exhausted page. Unchanged ticks preserve the DOM.

The Public pane has no personal navigation/sidebar, create/sort/selection/drag
controls or per-row actions. Entering it closes stale board/member/action forms
and clears their bindings. Hidden create/import/context commands cannot act from
this pane. Rows contain only the native ID, literal title/description and validated
hex color. No membership, card text, settings map or workspace tree is included in
the discovery projection. Titles are real canonical links with Enter and browser
Ctrl/new-tab behavior; clicking another row cell opens the same readable board.
Source captions translate for all 237 catalogs while titles/descriptions stay
literal. Layout and controls work at the tested 390px mobile width.

`PublicBoardCatalogTest` compares 96 actual native SQL page/count/projection cases
with the unchanged source `publicBoardsSelector`, plus 13 unchanged helper-title
outcomes. It covers anonymous service scope, signed-in scope, helper/archive
exclusion, literal/Unicode search, ten-row paging, strict malformed/unknown option
refusal and no storage writes. Numeric IDs, native working-board type, creation-ID
ordering, metadata fields and safe hex colors are explicit adapters. The current
native model has no source board background-image/template/global-sort fields;
those integrations and full Meteor publication/ReportPages transport remain open.
`python3 tests/run-http.py --public-boards [--archive]` checks real direct/menu/login/
history navigation, paging/search, private-safe rows, stale-panel cleanup, denied
forged actions, public/instance links, live exclusions, colors and Finnish/mobile
presentation. The complete local suite (65 host tests), complete source/packaged
browser runs and final focused source check with the final caption catalogs pass.
The discovery page still requires sign-in. Anonymous board/card entries are
described below; Sandstorm convenience and first-edit membership remain open.

Anonymous `/b/:id[/slug]` and `/b/:id/:slug/:cardId` entries now render a
separate native guest form when the destination board is public. Private and
instance boards retain the login form. The host supplies only validated path IDs
to the initial renderer; `?signin=1` requests the login form and never changes read
permissions. Authenticated UI cookies continue into the ordinary native editor.
There is no guest account, membership, bearer credential or UI login cookie.

`GuestBoardRead` is an anonymous-only, public-only read projection. It checks
current public permission before and after reading, validates canonical numeric
IDs, excludes soft-deleted cards/lists, preserves native ordering and safe colors,
filters active cards from archived lists/lanes and supports explicit archived-card
reads independently of the board filter. A moved card resolves only into a
currently public destination. Missing or inaccessible cards can leave a readable
URL board visible with a generic refusal and retained URI. Live public-to-private
changes clear the guest board/detail; Refresh can retry after access returns.

The guest form reuses the native kanban renderer with its mutation capabilities
and context action targets absent. Card links, close, Back/Forward and reload use
the same acknowledged route flow. A private command allowlist precedes Gambas's
cross-form dispatcher: only this form's bounded route text, timer, close/retry and
login buttons, and safe own-control focus are accepted. Foreign controls/focus,
window manipulation, arbitrary events/properties, upload completion and large
command-file dispatch are refused. Native callbacks/uploads still require their
existing authenticated host probe. The login button uses an explicit fresh login
entry and retains the requested card through successful authentication.

`GuestBoardReadTest` verifies anonymous/public scope, strict IDs, no storage
writes or synthetic principal, active/archived scope, current moved destinations,
private/instance and authenticated-context refusal, and permission revocation.
`GuestCommandsTest` uses real own/foreign form controls to verify the allowlist.
`python3 tests/run-http.py --guest-boards [--archive]` exercises actual guest kanban/
card/history/reload, credential and write-control absence, forged cross-form and
callback/upload refusal, privacy/retry, missing-card fallback, login handoff and
Finnish/mobile layout. The complete local suite (66 host tests) and complete
source/packaged browser suites pass. Final focused source/packaged checks and
all-catalog translation checks also pass with the source Refresh caption.
The guest surface covers kanban/core card fields and the comments/checklists
below. Remaining child/source-definition models, storage/cover models, additional views,
source backgrounds/templates and full Meteor publications/actions remain pending.

Guest readers can switch among native Swimlanes, Lists, Table and due-day
Calendar using four fixed native buttons. Each event performs the same fresh
anonymous public/card read; it cannot submit an arbitrary view or mutation.
Retain the selected view while opening/closing cards and navigating same-board
history. Permission loss clears both data and view controls; guarded Refresh
restores them. The requested view is document-local state, initially the public
policy default (legacy Swimlanes), without writes to user profiles or board settings.

Shared Table/Calendar/Gantt report cards now expose canonical semantic anchors
with routing IDs and literal-user-text protection, so keyboard opening uses the
existing acknowledged route flow while Ctrl/new-tab remains a real link. This
also improves signed-in native reports. The guest Calendar displays the current
native due-day field and undated cards with previous/next-month controls; it is
not the full source multi-date planner. Native command/report/HTML safety tests
and real guest browser checks cover all four views, mounted-view/card history,
keyboard/new-tab, dated/undated month navigation, idle DOM preservation,
translated controls/columns versus literal card titles, mobile, forged commands
and privacy/recovery. The complete local suite (66 host tests) and focused
source/packaged guest browser suites pass. Manager view-policy editing/REST,
instance feature controls, remaining guest views, richer date/calendar models
and original Meteor actions
remain pending.

`BoardViewPolicy` persists normalized settings for all 40 source view keys in
`kb_board_view_policy`, with separate public/private show flags and defaults,
full source order and actor/time attribution. Missing fields mean shown and
Swimlanes is the absent/unknown default; preserve older default-order insertion
and normalize duplicate/unknown stored order entries. Write preparation applies
new defaults (also showing them) before show flags, refuses hiding that side's
default, and matches source boolean coercion. Signed-in read guards and manager
writes are separate from the public guest projection. Manager saves lock the
current actor and board and recheck identity, generation, role, owner and written
state before commit. Reads do not initialize policy tables or rows. Board purge
includes policy atomically without touching unselected policy rows.

Guest snapshots contain only public native view names in source order and an
effective default; private settings remain absent. Initial entry/reload selects
that default. Keep a valid current view across default changes; hiding it falls
back live. Hide unavailable controls, reorder retained native controls, and
resolve even forged clicks on hidden controls through fresh policy. Source
`allowView` is adapted to the four currently implemented native renderers, so
unsupported source defaults use the source's core Swimlanes last resort. This
availability adapter does not implement instance feature settings. Import source
metadata with `node tools/import-board-views.cjs /path/to/wekan`. Native tests
cover scope, default/readonly/anonymous refusals, missing schema, failed writes,
late owner/principal loss and purge rollback; 188 native cases match unchanged
source snapshot/request helpers. Guest browsers cover live hidden/order/default/
reload/fallback behavior with existing navigation and privacy checks. The full
local suite (66 host tests) and focused source/packaged guest suites pass. Manager
editing UI/REST, signed-in view consumption, instance features, policy copy/import
and full original Meteor actions remain pending.

Selected guest cards now show comments and checklists through the same final
public/card scope guards. Only the selected board/card's records are queried;
checklist items must have a checklist parent on that same board/card. Foreign or
orphaned records are excluded. Comments retain their native author and creation
time; retained author text is read only from matching kind/item/board/card
provenance. No mutable child-store initialization is called: legacy databases
without child tables return empty sections without creating them. The board grid
does not fetch children.

Comment and checklist text is escaped and stays literal. Only the Comments and
Checklists headings translate; a checklist named Comments remains unchanged.
Completion is displayed by disabled checkboxes with no mutation target. Idle
polls retain the DOM, while external edits/deletion update the selected panel;
permission loss clears the children with the card. `GuestBoardReadTest` adds
missing-schema/no-write, foreign/orphan/provenance and completion-state checks;
the guest browser test covers literal script-like text, fixed-heading versus
user-title translation, disabled state, stable idle DOM, live edits/deletion and
privacy/recovery. The complete local suite (66 host tests) and complete source/
packaged browser suites pass. These are native flat-entry and retained-name adapters, not the
original Meteor child publications, rich-text viewer or checklist ordering model.

Selected guest cards also show native text/number/date/checkbox fields, stored
time entries and same-board subtask/dependency links. Legacy fields without a
type read as text; unknown types are excluded. Checkbox fields stay disabled.
Time displays the recorded minutes, notes, scoped author/record timestamp and
running flag; it neither starts/stops timers nor invents elapsed totals. Fixed
section/Running/minutes captions use source translations across 237 catalogs,
while field names, values and notes stay literal.

Relationship targets must be positive whole native IDs of live cards on the
same public board. Their labels come from the current target, never a stale
stored entry title/body; foreign, missing, soft-deleted and malformed targets
are excluded. Archived live targets remain readable through explicit card links.
Live renames update labels and a move to another/private board removes the link
without disclosing its new title. Native projection tests cover typed/legacy
values, stored/running time, invalid types/durations/targets, deleted/foreign
scope, stale-label refusal and no writes. The guest browser exercises disabled
fields, literal script-like values, stored durations, archived links/Back,
translated labels versus user field names, live rename and private-target loss.
The complete local suite (66 host tests) and complete source/packaged browser
suites pass.
These are existing card-level native models; source board-defined/admin-only
field definitions, cross-board relationship/deposit models, duration aggregation,
other download/storage models and original Meteor actions remain separate work.

Selected guest cards show live native attachment names, sizes and scoped author/
time metadata through a fixed-column query without byte payloads. Match both
board and card and exclude exactly scoped soft-deletion markers. Missing legacy
file or settings tables/rows remain absent: public policy reads do not initialize
stores. Bind retained authors to file kind/ID/board/card and escape filenames as
literal user text beneath the translated Attachments heading.

Available links use GET-only canonical positive native IDs at
`/_weba/public-attachment/:board/:card/:file`. The host rejects encoded aliases,
extra components/overflow/malformed IDs and non-GET methods and strips query
commands. There is no GUI callback/upload exemption or API credential grant.
Verify current public-board and exact file/card binding before metadata and bytes
and again afterward. Anonymous readers and public nonmembers may download;
active assigned-only members require current assignment, including raw flags on
unknown/canonical roles. Removed members read as public nonmembers; the source
file-server's verified site-admin exception precedes assignment narrowing.
Use the shared verified HttpOnly UI principal independently of GUI ownership:
an unrelated or absent GUI cookie cannot turn a valid restricted user anonymous.
API bearer/query credentials do not authenticate this native public route.

Respect native attachment block/size policy, API size fallback/environment and
64 MiB buffer ceiling independently of API block. Hide blocked/oversized links
while retaining metadata. Check size before fetching, bound the byte query and
recheck actual bytes/policy before returning. Force octet-stream with attachment
Content-Disposition, RFC 5987 filename encoding, host nosniff, sandbox CSP and
no-store. No read initializes settings or adds activity/history. Deletion removes
live list metadata but retained direct file URLs stay readable under current
scope, matching the source file server; revoking public permission refuses them.

Native tests cover exact binary/zero/name data, foreign bindings, assigned/raw/
removed/site-admin scope, retained files, pure missing schema/row policy reads,
API/native policy separation and no history writes. Source and packaged guest
browser checks exercise downloads without execution, safe headers, commands/
path/method negatives, live policy/metadata and assignment/privacy revocation,
and restricted UI cookies without or with unrelated GUI cookies. A 64-case
signed HTTP comparison plus anonymous reads executes unchanged source universal
file authorization/assigned-file helpers using explicit UI-cookie/token,
numeric-SQL-ID/cache and no-op security logger adapters. The complete local
suite (66 host tests) and focused source/packaged guest browser suites pass.
This is a public-only
native buffered-file path; full source storage/streaming/Sandstorm/eventlog,
cover/background/map and original Meteor file actions remain pending.

First native root landing after login or full
page reload now opens the current readable active Home board once. All Boards
remains usable afterward; named section entries win, ordinary mark changes do
not navigate an already open page, and stale archived/revoked marks fall back.
Gambas can retain forms across reloads, so only a fresh root HTML response rearms
the consumed decision; native event requests cannot rearm it. The landing command
accepts no caller board ID. Native board navigation now records its canonical
`/b/:id/:slug` URL.
An explicit readable board URL retains its board on reload even without a saved Home.
Original Meteor public/card routes, FlowRouter/profile/DDP and
Sandstorm single-board convenience remain TODO. Run
`python3 tests/run-http.py --home-login [--archive]` for login/reload coverage.
Run `python3 tests/run-http.py --home [--archive]` for the browser regression.

Native board entries accept `/b/:id/:slug` and short `/b/:id` (optionally with a
trailing slash). The host permits only root HTML GET entry, strips query commands,
rejects malformed/multiply encoded IDs/paths and never makes these mutation CGI
aliases. `BoardRoute.Resolve` validates a canonical positive native SQL ID and
returns only the current principal's readable title/archive state, with final
session/read rechecks. Anonymous, missing, private, global-nonmember and revoked
users/sessions cannot resolve the private board. Explicit archived entries use
actual archived scope; a scope change leaves a coherent safe overview.

The bundled installed limax and `board` fallback match the unchanged source
board schema and URL helper. Slugs are readable decoration: explicit stale slugs
remain valid by ID and stay unchanged through live rename/reload; a new tile
navigation uses the current title. Explicit board entries win over saved Home,
and reloading an explicit board keeps it when the Home preference changes; a
fresh root entry is what applies the new Home. The private route snapshot and
shared intent token acknowledge tile, automatic Home and native board changes
before recording URLs. Back/Forward uses the same server guards, stale replies
cannot win history, and a root entry waits for the landing decision.
Same-board entries preserve the native view/draft DOM and refresh their route
title from the freshly authorized resolver before canonicalizing short URLs. Denied or live-revoked
entries keep their requested URL while clearing board state; reload retries
fresh authorization. This is native SQL/private-board routing, not original
production Meteor FlowRouter/DDP routes. `BoardRouteTest`, host path/method/query
checks, twelve unchanged source slug/path comparisons and real
`python3 tests/run-http.py --board-routes [--archive]` cover these boundaries.

Catalog board tiles are real anchors with `/b/:id` fallback URLs. The bundled
source slug helper upgrades their hrefs to canonical board paths when available.
Primary unmodified activation uses the guarded native route acknowledgement;
Ctrl/Command, Shift, middle click, explicit targets/downloads and browser link
operations retain ordinary anchor behavior. Enter activates the link; Space does
not act like a button. The anchor is `draggable="false"` inside its existing
sortable parent, preserving native HTML5 and pointer/touch board gestures. Each
new tab shares login but keeps its selection, route and private form state.
`python3 tests/run-http.py --board-links [--archive]` verifies semantic links,
new-tab/opener state, keyboard activation, HttpOnly UI/API separation, background
GUI keepalive, tab close and shared logout. Original Meteor public/card routes and full
Meteor/FlowRouter callbacks remain open.

Signed-in native card entries use `/b/:boardId/:slug/:cardId`. The host serves
only root HTML for valid GET entries, strips query commands and rejects malformed,
overflow, multiply encoded and encoded-slash aliases or mutation methods.
`CardRoute.Resolve` looks up only the card's destination key before checking its
current board/card scope, then rechecks identity, destination and archive state.
Canonical native IDs, current readability and active-member assigned-only
restrictions apply; signed-in public/instance reads do not invent membership.
A readable moved card opens in its current board and gets its canonical URL.
Missing or unreadable cards keep a readable URL board mounted without exposing
the destination; denied boards fall back safely while retaining the requested
URI. These are native permissions. Anonymous public entries use the separate
guest read projection described above.

List/swimlane minicards are whole-card anchors, including ordinary browser
modified clicks on the card body. Menu/drag controls and unrelated links retain
their own behavior. Enter activates a card link; Space keeps normal link behavior.
Mouse surface dragging still works and ordinary touch keeps its scroll/handle
rules. Card entries survive login/reload, and same-board/same-card entries keep
the mounted board, view and unsaved draft. Open/close requests use the private
navigation intent token; newer card clicks win delayed menu replies without
extra history entries. Closing a card returns to its board; Back/Forward reopens
or closes through fresh guards. New-card creation clears the previous route.

An explicitly opened card remains readable across external archive/restore
changes independently of the board grid's archive filter. Its edit/restore
controls refresh without dropping the panel or URI. The source user archive
action closes the card and goes to its board; native user archive follows that
navigation, while user restore keeps its card open. Access loss still clears
private fields and panels. Fixed archive/restore captions reuse existing
translations; card titles and editor values stay literal.

`CardRouteTest`, strict host alias cases and
`python3 tests/run-http.py --card-routes [--archive]` verify these guards and real
browser flows, including whole-card Ctrl-click, keyboard, same-board drafts,
latest-menu races, archive/read-scope changes, moved/private/missing/revoked
cards and Finnish/mobile controls. Twelve native SQL/pure cases execute the
unchanged source moved-target helper using explicit ID/readable-fixture adapters;
twelve card paths match unchanged `buildCardRelativeUrl` with the existing source
slug helper. This does not execute production Meteor publication/FlowRouter
wiring. Guest child models, desktop multiple-card windows, container/reveal
routes and remaining original action/transport callbacks are still open.

Board-menu Archive now opens a native confirmation with a literal board name,
translated source warning, explicit Archive/Cancel and keyboard Escape/Close.
The private form binds the board, principal/session generation and current view;
context changes or navigation clear it, live permission/state changes close it,
and a consumed/cancelled confirmation cannot be replayed. The existing catalog
callback stays in its section after success. Archiving the open board goes to
native home at `/` (the native Remaining view), keeping the current page's Home
landing consumed; restoring opens its canonical active board and closes the old
menu. Typed private navigation revisions distinguish successful action navigation
from permission-loss fallback, and a later user menu intent wins delayed replies.
Initial revisions are observed before the optional URL helper arrives, so late
helper delivery cannot resurrect an obsolete board entry. Same-URL restore does
not add history and no temporary overview is recorded while opening a restore.

`BoardArchive` locks the current account and board, rechecks fresh session/manage
permission and owner/state before commit, and wraps the existing board/archive
activity writes in one transaction. Restore is idempotent. State/activity SQL
failure and late role/session/owner/state changes roll back; stars, placement and
saved Home remain untouched. Confirmation checks are private UI state, not a new
public API. Native negative/rollback/retry tests run in the local suite; real
`python3 tests/run-http.py --board-menu [--archive]` covers catalog/board/history,
forgery/cancel/replay/context substitution, live demotion, failed mutation/retry,
Finnish/mobile and delayed-helper/latest-menu races. The source archive callbacks
and restore callback were read directly; this native integration does not execute
them through production Meteor/FlowRouter or implement Sandstorm's restore swap.

Starred now applies the unchanged source Home-first presentation rule after
catalog paging: readable active Home appears first even when unstarred, once
per rendered page. A title search suppresses this insertion. Raw server counts
and page bounds remain unchanged, so a Home tile can be additional to a page.
The saved mark also appears as a top-center translated badge wherever that
board is visible, including Archive. Changing Home updates badges/order live;
viewing it changes no stars, workspace assignments or personal ranks.
`node tests/home-presentation-conformance.test.cjs` compares 288 actual native
outputs with the unchanged source helper using explicit SQL/cache/ID adapters.
Run `python3 tests/run-http.py --home-presentation [--archive]` for real paging,
lifecycle, translation and mobile geometry coverage.

The installed host now supports direct GET entry at `/allboards/remaining`,
`/allboards/starred`, `/allboards/archive` and `/allboards/home`, including one trailing slash and
single percent encoding. These paths match the unchanged source `allBoardsPath`
helper. The host dispatches only root HTML, removes entry query parameters before
CGI and refuses non-GET or multiply encoded aliases; native commands still use
the protected POST transport. The browser carries the validated section across
login in per-tab session storage, then a guarded native action selects the page.
Authenticated entry and reload reapply the URL's section, including after manual
navigation; the consumed native command is cleared so identical entries execute.
Both login/main forms
set a same-origin root asset base, so CSS, translations, native resources and the
viewer bundle load from nested addresses. Browser/host tests cover these paths,
forged section denial, no missing assets and mobile entry. Run
`python3 tests/run-http.py --overview-entry [--archive]` with the usual test env.
Supported Remaining/Starred/Archive/Home menu clicks now push their source paths only
when the path changes. The original root URL stays intact in its first frame.
Back/Forward restores its section through the same guarded native command without
adding frames. Commands carry a per-intent correlation token; a lossless private
native acknowledgement must match both section and token before updating history,
so an older response cannot add entries after a newer Forward intent. Repeated
clicks do not duplicate history. Reload and malformed/forbidden commands are tested,
as are delayed old requests and mobile navigation. The token correlates UI intent;
current native identity and existing data permissions remain the authority.
Workspace URLs now use the unchanged source `allBoardsUrls` helpers and the
same installed `limax` dependency, bundled with exact source/dependency hashes
and license notices. `/allboards/workspaces` and arbitrary nested slug paths
support login, reload, menu clicks and Back/Forward. Unicode transliteration,
emoji-only ID fallback, first sibling on duplicate slugs and partial name trails
match the source. A private owned-tree acknowledgement supplies the data; the
native command validates a canonical owned workspace ID (or the safe Workspaces
index) before changing page state. Foreign/malformed IDs cannot select data.

Missing paths keep the Workspaces section, with a title trail only as far as the
path still exists. A matching node that arrives later resolves reactively. Names
in the trail remain literal text; only its static prefixes are translated. Live
rename/reparent retains the old path until a new menu selection, and selected
node deletion preserves that stale URL while returning to the safe index. An
in-flight deleted target is rejected, then the latest owned tree permits index
fallback. Empty-index board filtering matches the source; removed assignments
remain visible after explicit Remaining navigation. Workspace clicks obey the
existing drag click-suppression window and safely wait for late helper delivery. Malformed percent escapes, invalid UTF-8,
traversal and multiply encoded entry aliases are rejected before CGI; valid entry
queries remain stripped. Run `python3 tests/run-http.py --workspace-urls
[--archive]` or the full live suites. Home/Templates, other page routes and
complete original Meteor route/DDP/profile transport remain TODO.

Source workspace `iconColor` metadata now has private native persistence in the
additive `kb_board_space_icons` table. `BoardSpaces.Edit` accepts an optional typed
color string: omission/null preserves existing metadata, while an explicit empty
string clears it. Ordinary source-style name/icon edits preserve the color. The
same transaction rolls back name, icon and color after write or late owner,
session or value failure. Reparenting keeps it; subtree and account deletion
remove it. Readable personal Record/Tree snapshots carry only the owner's data.
The source edit form has no current color picker, so this bridge adds none and
exposes no new HTTP route. Original profile-tree transport/import remains open.

A lossless hidden row snapshot applies the value through `element.style.color`
on the source `.workspace-icon-value` or default `.emoji-icon` folder wrapper.
It never interpolates raw CSS declarations or HTML. Invalid color values remain
literal metadata but the browser rejects their style; another declaration or
URL cannot be appended. Color changes refresh the icon live and survive reload.
Native tests cover private/type/late guards, explicit clear and lifecycle cleanup;
browser tests compare ordinary edit preservation with unchanged source
`updateSpaceInTree`, check Markdown/default folder colors, user isolation,
reload/mobile and malicious declaration no-network behavior.

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
requests with `Authorization: Bearer <token>`. The dedicated attachment-export
route also accepts the same native token as authToken, described below. Native
browser cookies grant no API authority. Tokens contain 256 bits of random entropy,
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
Legacy archived card/swimlane physical removal requires Global Admin, the explicit
permanent-delete flag and exact-title confirmation. Lists use reversible deletion
and the separate deleted-list purge described below.

The card editor and menu provide comments, checklists/items, real subtask cards,
dependencies, card-level text/number/date/checkbox fields, time entries/timers and
native attachment upload and download with persisted transfer limits. Copying containers/cards preserves
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
keep the editor open; blank child-name submissions close without mutation. Icons
render through the source Markdown viewer/sanitizer; stored values stay literal.

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

Remaining production transport/
routing parity remain open. Creation now uses a real form, required textarea and submit input with
revision/session/parent-bound native submission. The unchanged original Latin
callback passes through explicit native password-session and client-locale
adapters (1/6 spec 39 callbacks; no DDP/profile persistence claim).
Single-board drops are described below. Imported
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
original helper. It waits for rendered workspace IDs and parentage as well as
labels before the next keyboard move: nesting can preserve the visible name
sequence. Delayed native replies after SQL commit exercise that ordering, and
interception teardown waits for in-flight handlers. It covers nested/root moves,
repeated focus, folded targets,
scroll/cancel/reload/isolation, Archive and forged cycle/foreign/profile commands.
It runs in test-live for source/packages; run separately with the documented
toolchain/CDP environment using `python3 tests/run-http.py --workspace-order`,
adding `--archive` for the package. This does not run all original workspace
UI callbacks unchanged or implement their full shared desktop-handle preferences. Implemented native
multiselection/drop targets and rendered Markdown icons are described separately.


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


### Gated permanent board deletion and Recovery

Board deletion is offered only in the Archive multi-selection sidebar when the
current user is Global Admin and Admin Panel → Problems → Delete has Enable
permanent delete for Global Admin checked. The flag starts disabled. Changing it
does not delete content. The old per-board delete action is hidden and forged
menu/confirm events are rejected. Its internal legacy board service also requires
the global gate; card/list/swimlane title-confirmed cleanup is separate.

Delete opens the original irreversible-delete wording with a native checkbox and
Cancel. Confirmation belongs to the private selection revision. Selection changes,
live flag disablement or admin demotion cancel pending confirmation. Success clears
selection; refusal keeps it. The server checks current account/session/admin/flag,
accepts 1–200 unique positive board IDs and validates every archived board before
effects. Duplicates use set semantics. It locks account, setting and sorted boards,
rechecks before each deletion and again before commit, and rolls back the complete
batch on a late role/flag/archive/session change or write/audit failure. This explicit
Global Admin service may purge an archived board without membership, as the original
method does; it is not a general board-read override.

Recovery records setting changes and each purged board with actor, time, literal
ID/title, success and deleted-data flags. No-op setting changes add no event. A
success audit shares the mutation transaction; a denied/failed attempt is recorded
after rollback, with attempted IDs bounded to 200. If even the failure-audit write
fails, the original error is retained. Purging a board does not erase Recovery.
Native Confirm rejections before service dispatch also record bounded failures;
service failures are not recorded twice. Admin Panel → Problems → Recovery shows native text rows and clears/hides them
on live admin loss. No public recovery or purge HTTP route is added.

BoardPurgeTest injects second-delete, last-role/session, setting-disable, restored
board and success-audit failures; it checks rollback, failed/successful audit
boundaries, retry, duplicate/bound/null/active/missing/stale denial and private
content cleanup. Existing lifecycle fixtures now explicitly enable the gate.
A 55-case SQL comparator runs the unchanged original permanentlyDeleteArchivedBoards
body with explicit board/user/flag/audit adapters, including a 200-board success.
board-purge.browser.cjs uses actual two-user controls and SQL fixtures for the
setting, hidden/forged bypasses, confirmation/revision, live revocation, exact
selection purge and literal/admin-only Recovery. It runs in test-live for source
and packages, or with `python3 tests/run-http.py --board-purge` (add `--archive`).
These native tests are separate from running every unchanged original suite;
full Recovery schema/report/filter parity and non-SQLite drivers remain open.


### Reversible list deletion

The native list menu's Delete action confirms ordinary removal with a checkbox.
It preserves the list, its active and archived cards, attachment bytes, people,
dates and relationships. One UTC timestamp, actor snapshot and committed batch ID
mark the list and previously live cards. Repeating the delete keeps the same batch
and changes no content/history clocks. A global allocator prevents committed batch
ID reuse even after board purge. Earlier independent deletions keep their marks.

Deleted lists/cards are excluded from normal native and REST reads/counts,
relationship views and exports. Direct card/list editors and stale add/move targets
are rejected. Board polling removes deleted rows and closes stale card/detail panes.
Deleted lists in a board's sidebar offers native Restore to board writers, including
assigned writers allowed by the original list method. Restoration removes exactly
that batch's marks and preserves archive state and earlier deletions. Readonly users
cannot delete, restore or inspect this writer control. Navigation and write loss
cancel pending native deletion; dialogs support mobile placement and Escape.

Only Global Admin with the explicit permanent-delete setting can physically purge
a deleted list and its same-batch cards. Native confirmation captures the committed
batch: an external restore/redelete makes old consent stale. Live flag loss hides
and cancels purge controls. The service locks/rechecks account, setting, board,
list and batch cards, shares cleanup primitives, records recovery success with the
transaction and rolls back on late authority/batch/audit failure. Earlier independently
deleted cards are not purged with a later list batch. Legacy card/swimlane physical
removal also requires the global gate; the old archived-list hard-delete route is
rejected. Full card/swimlane/discussion and broader attachment lifecycle parity remains pending.

`DELETE /api/boards/:boardId/lists/:listId` matches source authorization-first
behavior: unauthorized roles/raw assigned flags receive 403, while authorized
missing, foreign and already-deleted list IDs receive `{ "_id": "requested-id" }`
with 200 and no business changes. Native numeric IDs have a canonical string form;
other list strings are acknowledged as unknown rather than coerced to another ID.
Ordinary deletion needs no permanent-delete flag. The REST site-admin exception is
scoped to this operation and reset afterward. Unexpected failures return sanitized
500 JSON and roll back metadata, content, clocks and batch allocation together.

ListDeletionTest checks data retention, visibility/destination guards, exact restore,
earlier marks, archive state, allocation and injected delete/restore/purge failures.
A 60-case SQL comparator runs the unchanged source lists.softRemove/restore/purge
and softRemoveList bodies with explicit time/ID/role adapters and no-op history
adapters. It proves lifecycle row outcomes, not full ChangeHistory/undo integration.
Real source/package HTTP+SQL tests cover role/combined-scope negatives, no-op
contracts, hidden reads/writes, bytes and rollback. list-deletion.browser.cjs covers
actual writer/readonly/admin confirmation, restore, mobile/Escape, live revocation,
changed-batch denial and permanent cleanup. Both tests run in the standard suites;
focused modes are `--list-delete-api` and `--list-deletion` in tests/run-http.py,
adding `--archive` for the packaged application.

Generic Delete/Restore/Close/warning captions use imported source translations;
new deleted-list-specific captions currently fall back to English and remain in
TODO.md. Full source history/undo, cross-board deleted hierarchy, original complete
UI/API/security suites and non-SQLite drivers still require further work.


### Retained attachment deletion and restore

Ordinary native attachment Delete and `DELETE /api/attachment/delete/:id` keep
stored file bytes and author attribution. A separate tombstone records the actual
actor, UTC milliseconds and attachment batch. Repeated deletion keeps that batch
and writes no duplicate activity/history. Native card-facing file summaries and downloads,
copies and JSON exports include only live files. Deleting the current cover clears
it; restoring the bytes never puts that cover back or changes another cover.

Attachments offers native History with filename/actor lifecycle rows and Restore
for a currently deleted file. Readers can inspect this metadata without receiving
binary content, but only a fresh card writer may restore. Assigned writers remain
restricted to their assigned cards. Polling clears a vanished live-file selection,
preserves a selected history row and updates Restore availability. Card menu
buttons are anchored to individual cards so multiple cards do not overlap them.
This is a dedicated attachment lifecycle journal, not the full original generic
ChangeHistory selection, comparison or undo interface.

The bearer DELETE route returns the source success fields (`success`,
`attachmentId`, `fileName`, `message`), 404 for unknown IDs, 403 for denied scope,
and a sanitized 500 for unexpected failures. Its scoped site-admin exception does
not cancel active assigned-only member flags. Account/board/card/file locks,
inner and outer permission checks, and nested transactions retain atomic rollback
when scope changes during deletion. No ordinary per-file physical delete exists.
Global gated container purge erases the retained bytes and lifecycle records.
Moves carry deletion/history scope with the card; copies and weba JSON exchange
omit deleted files and remap a live cover to the new file identity. Old weba-2
exports without file IDs or covers remain accepted.

AttachmentLifecycleTest exercises retention, metadata-only reader history,
idempotency, foreign/assigned/readonly rejection, injected history/permission
failures, cover behavior, copy/exchange/move and permanent board cleanup.
attachment-conformance.test.cjs compares 12 actual SQL outcomes against unchanged
source lifecycle decision helpers with explicit time/ID adapters. It compares
implemented lifecycle metadata, not the complete source history schema. Real
HTTP tests inspect SQL bytes, cover state and rollback (focused mode
`--attachment-delete-api`); focused native browser
coverage uses `tests/run-http.py --attachment-lifecycle` (plus `--archive` for the
packaged app). The standard local/browser suites include these checks.

Streamed uploads/downloads, storage backends, board-level
background/map files, linked-card permissions, retention jobs, visual cover
selection, security eventlog/Problems reporting and original complete UI/API/
security suites remain open in TODO.md. The unchanged UnassignedAttachBleed
callback also requires DDP and eventlog support and has not been executed
against this implementation.


### Card attachment API uploads

`POST /api/attachment/upload` accepts either raw bytes with query parameters
`boardId`, `swimlaneId`, `listId`, `cardId`, `fileName` and optional `fileType`, or
JSON containing those target/name fields plus `fileData` as base64. Target IDs use
the canonical numeric strings returned by native board/card APIs. Raw requests
preserve arbitrary bytes; JSON accepts the source decoder's unpadded, whitespace,
URL-safe and ignored-character base64 forms. Names preserve literal Unicode,
spaces, plus and percent characters. The host forwards valid escaped supplementary
filename characters as UTF-8 for Gambas 3.20. Ambiguous duplicate raw parameters,
invalid MIME/name controls and malformed target types are rejected.

The success response includes `success`, `attachmentId`, `fileName`, `fileSize`,
`storageBackend` and `message`. Weba reports its actual `database` backend rather
than claiming an FS/GridFS/S3 file. File bytes, author, MIME and UTC upload time
are committed together with activity/change clocks. Older blobs without metadata
remain readable with an octet-stream MIME fallback. Copy and weba exchange
preserve MIME under mapped identities; moves carry the scope; gated container
purge removes metadata. SQLite's Gambas driver represents a zero-byte blob as SQL
NULL; a retained file row reads and downloads as zero bytes, not a missing file.

The full card/board/lane/list path is validated, with fresh writer and assigned
scope before/after upload under account/board/card locks. Global site-admin writes
retain active raw assigned-only restrictions. A board's `allowsAttachments=0`
setting blocks API uploads, including global administrators; native board-setting
writes require manageBoard and copies/exchange preserve the policy. Its settings
UI is implemented in Board settings → Attachments. Late role, assignment, target or allowance changes roll back
the file, attributes, clocks and activity. Unexpected errors return sanitized JSON.

`ATTACHMENT_API_MAX_UPLOAD_BYTES` follows the source positive-byte configuration
and 64 MiB hard cap; zero/unset uses that cap. JSON requests have a 96 MiB safety
limit at both host and endpoint. Body reads have an absolute 30-second deadline;
truncated, timed-out and oversized uploads return JSON without starting CGI.
Other host routes retain the 20 MiB body limit.
Native file-picker uploads now follow persisted transfer policy with a physical
64 MiB ceiling; weba JSON imports retain their overall 20 MiB limit. Uploads are
buffered. Streaming and FS/GridFS/S3 backends remain unimplemented; the four
transfer controls are described below.

`api-attachment-upload.test.py` uses actual source/package HTTP and SQL to check
exact binary/Unicode responses, MIME/time, raw content types and base64 variants,
zero bytes, configured bounds, path/role/assignment/policy negatives and injected
rollback failures. `attachment-upload-conformance.test.cjs` compares 140 actual
HTTP results with unchanged source target/write helper bodies and source role/
scope functions; native ID/backend and no-op security-event adapters are explicit.
`attachment-upload.browser.cjs` verifies live panes, actual native binary download
and assignment-revocation cleanup. Focused modes are `--attachment-upload-api`
and `--attachment-upload`, with `--archive` for the packaged application. Standard
local/browser suites include these tests. Streaming, background/map/linked-card
scope, DDP, Problems/eventlog and the original complete
UnassignedAttachBleed callback remain open.


### Attachment API listings, info and downloads

`GET /api/attachment/list/:boardId[/:swimlaneId[/:listId[/:cardId]]]` returns
`success`, `attachments` and `count`. The literal `null` skips an optional path
filter. The legacy `GET /api/boards/:boardId/attachments` returns the same board
listing. Each item has attachment ID, name, byte size, MIME, actual `database`
backend, board/lane/list/card IDs, UTC creation time and image flag. Listings
exclude soft-deleted attachments. Metadata queries return lengths and attributes
without loading file bytes into the native metadata result.

`GET /api/attachment/info/:attachmentId` adds `success` and the `versions` array
with the stored original version's backend, size and MIME. Legacy files use their
stored creation date and an octet-stream MIME fallback. All read routes require
current active board membership: a global site administrator needs membership
too. Active raw assigned-only flags narrow even board/site administrators to
files on their assigned cards. Missing/foreign card filters follow the original
404 contract; an authorized unknown lane/list filter returns an empty listing.

`GET /api/attachment/download/:attachmentId` returns the source JSON success
fields and `base64Data`, including an explicit empty string for zero-byte files.
Add `?raw=1` for the exact binary response. Raw answers force attachment download
with the source ASCII fallback and RFC 5987 Unicode filename, native MIME (or safe
binary fallback for invalid header characters), `nosniff`, sandbox CSP and no-store.
The host derives disposition from private CGI filename metadata, which is never
forwarded to the client. `ATTACHMENT_API_MAX_DOWNLOAD_BYTES` uses the source
positive-byte normalization and 64 MiB cap; zero/unset uses that cap. Info/list
metadata remains accessible when a file exceeds the download byte limit.

The actual source keeps direct authorized info/download access to retained
soft-deleted files for history/recovery; only listings apply the attachment-live
selector. The cache and route bodies were inspected to verify this distinction.
These direct APIs use current board and assigned-card scope independently of the
native card gallery's live-file guard. Revoking membership or assignment refuses
later requests, including reads of retained files. Physical container purge
removes the retained file and its metadata. Parent entity soft-delete selectors
are separate from the attachment API's source selectors.

`api-attachment-reads.test.py` verifies actual source/package HTTP and SQL for
DTOs, exact base64/raw bytes, header safety, zero/legacy files, membership/assignment
loss, raw assigned flags, retained-file behavior, size bounds and sanitized no-write
failures. `attachment-reads-conformance.test.cjs` compares 192 real HTTP outcomes
with unchanged source list/info/JSON-download/legacy route and read-scope bodies.
SQL identity/time/database storage, transfer-policy and no-op security-log adapters
are explicit. The host disposition also matches the unchanged source helper on
Unicode/control/quote cases. `attachment-reads.browser.cjs` verifies that stored
HTML downloads with exact bytes and Unicode name without executing its script,
then checks deletion/list behavior and active-context assignment/member revocation.
Host tests reject malformed or out-of-route private download metadata and preserve
embedded CGI separator bytes with both LF and CRLF header formats.

Focused test modes are `--attachment-reads-api` and `--attachment-reads`, adding
`--archive` for the packaged app; standard local/browser suites include them. Raw
responses are still buffered by the database/CGI/host architecture. Source streaming,
other storage/version backends, global download blocking/settings UI, board-level
background/map and linked-card behavior, ordinary Meteor-Files URL/range routes,
DDP, security eventlog/Problems and original complete callbacks remain open.

### Persistent attachment transfer limits

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
