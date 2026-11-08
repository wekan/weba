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
| `GET /api/boards/:id` | Read an accessible board and its active/inactive member flags; inaccessible boards return 404 |
| `POST /api/boards/:id/members/:userId/add` | Add an existing account with `action: "add"` and optional role/flags; an active member is unchanged |
| `POST /api/boards/:id/members/:userId` | Change an active or inactive member's role/flags without changing activation |
| `POST /api/boards/:id/members/:userId/remove` | Remove with `action: "remove"`; the final administrator remains active |
| `POST` / `DELETE /api/boards/:id/lists/:listId/cards/:cardId/members/:userId` | Add/remove one card member, preserving other members and the separate assignees |
| `POST` / `DELETE /api/boards/:id/lists/:listId/cards/:cardId/assignees/:userId` | Add/remove one assignee, preserving other assignees and the separate members |
| `PUT /api/boards/:id/lists/:listId/cards/:cardId` | Replace provided people fields and four UTC dates; other card fields are pending |

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
an administrator through this endpoint; this does not silently grant general
private-board read access. Add/remove replies contain only board `_id`/`title`
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

These REST writes require a writing role with full-card scope, or a site
administrator acting through the explicit scoped mutation. Assigned-only roles
and Workers cannot use these general REST writes; their supported native card
operations have separate checks. A foreign list/card combination or archived
card returns 404. A site-admin mutation does not enable general private-board
reads afterward. Changes, order and audit history commit together; failures
return a sanitized 500 and roll back.

Card PUT implements `members`, `assignees` and the four date fields below, returning
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
combined people/date replacement and clear phases bring card-update COMMIT
coverage to ten phases. A separate HTTP
failure in the second field verifies that the first field and audit history also
roll back. Native store tests cover ordering, copy/move/JSON, invalid-import
rollback, assigned-only denial and deletion cleanup.

User-deletion tests inspect independent SQLite snapshots after denied requests
and a real database failure partway through cleanup, then verify successful
cleanup, retained content and credential revocation. The native deletion UI is
also checked with the packaged Chromium workflow (`WEBA_DELETION_ONLY=1`).

When the parent WeKan checkout is available, `--members` executes four original
`#5998` spec 17 callbacks unchanged (three board-member, one card-member), plus
the original `#3697` people-clear and `#5846` due-date callbacks. `--api` executes its user-deletion callback
unchanged. Both use actual Playwright assertions and explicit SQLite fixture
adapters. User fixtures are created through the real Gambas account store;
post-delete checks read SQLite independently of the HTTP response. Each adapter
reports which callbacks it did not execute. Together they cover seven of the
file's 30 callbacks; the other 23 and the complete original UI/API/security
suites have not passed against weba. The reference checkout's
`tests/playwright/package.json` dependencies must be installed. A standalone
weba checkout can select the reference with `WEKAN_SOURCE=/absolute/path/to/wekan`.
Without a reference checkout, the original-callback check reports an explicit
skip; weba's independent contract/rollback checks still run.

Date conformance executes 44 supported UTC/offset/epoch cases against the actual
reference date helpers. Packaged Chromium tests (`WITH_API=true` and
`WEBA_MEMBERS_ONLY=1`) verify actual PUT, native unchanged/change/clear and
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
when available. The imported WeKan catalog currently provides 105 matching interface
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
