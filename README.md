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
   selecting it in the tree. Status is `Todo`, `Doing` or `Done`; dates use
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

## Interface translations

The login page and signed-in account menu have a language selector. The selected
language is saved in this browser; a new browser starts with its preferred language
when available. The imported WeKan catalog currently provides 63 matching interface
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
