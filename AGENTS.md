# AGENTS.md — weba development instructions

## Scope and checkout

This file applies only to the `wekan/weba` repository: the Gambas Web UI Kanban
application. Keep its changes, history, changelogs and release assets in this
repository. The application project is `WeKan/`. Do not add unrelated repository
instructions here. Keep this file and its instruction twin synchronized.

## Git boundary: local commits only

An assistant may edit files, run local checks and create authorized local commits.
It must never push any branch/tag/ref, update remote refs by API, open a pull
request, merge, dispatch a publishing workflow or publish release assets. Do not
invoke a build-menu release action during assisted work. Preparing and testing
release scripts locally is allowed. Stop after local commits and report their
hashes and exact human-run push command.

Check identity and branch before committing:

```sh
git config user.name
git config user.email
git branch --show-current
```

The maintainer is **Lauri Ojansivu <x@xet7.org>**. When working on his behalf,
use that identity, setting missing local git configuration if necessary. Commit
directly on `main`; if another branch is checked out, stop rather than committing
there. Do not create a topic branch or pull request for maintainer work.

A contributor with another identity works on a branch in their own fork, with
one feature/fix per pull request and no changelog changes. The assistant still
stops at a local commit: pushing and opening the pull request are human actions.

A human assisted by tools is the sole human author. Do not add assistant names,
co-author trailers or generated-by notices to commits, changelogs or documents.
An autonomous bot that itself submitted a change is credited as that participant.

## Commit categories and changelogs

Commit each coherent feature/fix/build/documentation change separately, together
with its relevant tests. Do not combine unrelated changes merely because they
were prepared in the same session. Inspect the diff and avoid staging user work.

In maintainer mode, each category commit updates both changelogs in their own
existing formats:

- `CHANGELOG.md`: Upcoming section above released sections, plain feature/fix
  bullets ending `Thanks to xet7.` (also credit actual human reporters when
  applicable). Do not move unreleased work into an already released section.
- `WeKan/.hidden/CHANGELOG`: the existing dated maintainer/version header followed
  by change bullets. Keep release numbering truthful; unreleased entries can be
  explicitly marked unreleased.

Keep `TODO.md` current: completed/tested work, work in progress, remaining feature
parity and verification gaps. Do not describe a prototype or an unexecuted CI
matrix as fully verified. Documentation and instruction changes are their own
commit category. Do not create a release tag or rename Upcoming during ordinary
implementation work.

## Application structure

- `WeKan/.src/WebformLogin.class` / `.webform`: login and registration.
- `WeKan/.src/WebformMain.class` / `.webform`: native Gambas navigation, board/card
  tree, editor, profile and administrator controls.
- `WeKan/.src/WebDatabase.module`: account schema, connection and permissions.
- `WeKan/.src/KanbanStore.module`: owner-scoped boards/cards, archives, activity.
- `WeKan/.public/kanban.js` / `kanban.css`: embedded browser report components.
- `runtime/server.py`: local CGI host preserving runtime/database environment.
- `build.sh`: build/run/test/package menu and human-only release dispatch.
- `releases/targets.json`: the single source of release target definitions.
- `releases/`: packaging, missing-asset planning, uploads and Gambas-copy helper.
- `.github/workflows/`: manually invoked release workflows and shared build jobs.
- `tests/`: isolated account/store/HTTP, report-DOM and tooling tests.
- `dist/`: generated archives/installers/checksums, ignored by git.
- `.tools/`: local toolchains, caches and temporary files, ignored by git.

## Accounts and database rules

Ship no accounts, passwords or user database. On a fresh installation, the first
successful registration is Admin and subsequent registrations are Normal. Protect
the first-admin claim with a unique constraint inside the registration transaction.
Test empty/duplicate registrations, concurrent-claim safety and role assignment.
Minimum password length is disabled by default. Only enforce the configured
1–256 character minimum when Admin Panel / Password Length enables it. Apply the
same persisted policy to registration, user creation, changes and resets; do not
hardcode eight characters in either client or server guards. Reject empty passwords.
Preserve password whitespace, hash stored passwords, and never log passwords,
hashes or raw AJAX URLs that can carry credentials. Gambas `Crypt.Check` returns
True on mismatch; tests must verify correct and incorrect passwords.

Enforce authorization in server methods; hiding controls is insufficient. Guards
must propagate denial, not catch it and continue. Authorize resets using the
actual session, not a supplied administrator name. Owner-check every board/card
operation and test another signed-in user's access as well as anonymous access.

SQLite is the default tested database. Use Gambas `Connection.Tables` / `Fields`
for schema and `Find`, `Create`, `Edit`, `LastInsertId`, transactions and bound
`Exec` parameters for data. Do not introduce SQLite-only DDL, PRAGMA, date
functions, generated-key queries or conflict clauses. Other writable drivers need
their components enabled and separate conformance tests before claiming support.

Connection overrides: `WEBA_DB_TYPE`, `WEBA_DB_HOST`, `WEBA_DB_NAME`,
`WEBA_DB_USER`, `WEBA_DB_PASSWORD`. Runtime data belongs outside installed program
files. Existing deployed user data must not be overwritten by builds or tests.

## Gambas tools and sandbox copying

The preferred repository-local installation is `.tools/bin/gambas`; in a nested
checkout `build.sh` can use the containing tools directory instead. The earlier
manually copied `.tools/bin/gambas3` layout remains a fallback. Inspect actual
files and CPU architecture before use; an IDE archive is not the compiler/runtime.

`Copy Gambas to Flatpak Sandbox` reads the installed host files under `/usr/bin`,
`/usr/lib/gambas3`, `/usr/share/gambas3`, `/usr/local` equivalents, desktop/icon/man
metadata, and essential `gbc3`, `gbx3`, `gba3`, `gbr3` executables. Inside Flatpak,
`build.sh` invokes the copy helper with `flatpak-spawn --host`. The destination has
`usr/bin`, `usr/lib/gambas3`, `usr/share/gambas3`, `usr/lib/host-deps` and `bin/`
wrappers. Do not replace the sandbox libc/loader with host copies. Run
`./build.sh doctor`; host/Flatpak CPU and libc compatibility is not guaranteed.

A relocated compiler accepts `-r <prefix>`; the runner may need `GB_PATH` and
`LD_LIBRARY_PATH`. Keep overrides scoped to commands. Use `GBC`, `GBX`, `GBA`,
`GBR`, `NODE`, `GAMBAS_PREFIX` and the documented copy variables to select tools.
Compile with `gbc3 -j 1 -a WeKan`; one job avoids restricted process-group errors.

Temporary files belong under `.tools/tmp`, never the host `/tmp`. Create it and
export its absolute path as `TMPDIR` before compilers, test runners, mktemp or
build scripts. Remove only exact task-owned temporary directories. Never commit
compiled Gambas output, test data, toolchains or release artifacts.

## Validation

Read actual code before changing behavior. Add meaningful positive, negative and
UI/protocol tests for features/fixes, and run the affected checks. Prefer `rg` for
searches. Do not scan generated output as source. Keep dependency installs local
when the sandbox cannot install system packages.

Use `./build.sh test` with a complete toolchain. Its checks cover:

- `tests/run-store.sh`: fresh databases for registration/authentication and CRUD.
- `python3 tests/run-http.py`: the real Gambas session protocol through the runtime
  host, with a disposable copied project/database.
- `python3 tests/run-http.py --archive`: the same path from a packaged archive.
- `python3 -m unittest discover -s tests -p '*_test.py'`: release/copy/package logic.
- `node tests/reports.test.cjs`: jsdom reports, calendar navigation and safe text.

Never run test modules against production data. A passing compile, HTTP test or
jsdom test does not establish real-browser visual/accessibility coverage. Validate
workflow YAML with actionlint and shell scripts with `bash -n`. State which CPU,
OS and database were actually tested, and record limitations in TODO/README.

## Packaging and releases (human execution only)

`Release All` and `Release All Missing` dispatch workflows only for an existing
pushed `vMAJOR.MINOR.PATCH` tag, with a clean checkout. They do not push refs.
Publishing commands must be executed by a human maintainer, not an assistant.

The target list currently covers Linux Debian/tar packages for amd64, arm64,
armhf, armel, i386, ppc64el, riscv64 and s390x; Windows WSL and macOS Docker
launchers for amd64/arm64; and a source archive. Do not label WSL/Docker launchers
as native Windows/macOS Gambas binaries. Add platforms only with a working runtime
and testable build path, and report unverified platforms honestly.

Each completed target attaches its files and SHA-256 checksums independently.
Missing mode treats a package/checksum pair as complete only when both exist,
preserves completed pairs and computes a repaired checksum from existing published
bytes. Failed targets must stay visible as failures; never publish an unfinished
artifact as a successful installer. Do not bundle seeded accounts or a user DB.
