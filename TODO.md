# Work in progress

Updated 2026-11-06. Target: the signed-in pages of the current `wekan/wekan`
checkout, implemented with Gambas Web UI, SQLite persistence and portable Gambas
DB operations. This is an initial implementation, not complete WeKan parity.

## Verification follow-up

- The full Chromium layout run timed out checking the card-editor focus outline
  after saving a card. Login/register geometry and independent visibility checks
  passed separately; investigate the unrelated card-focus check.

## Implemented and checked

- Login/register: local Font Awesome eye/eye-slash visibility icons.
- Login/register: matching white password inputs with independent visibility
  buttons on the right; verified with HTTP sessions and Chromium geometry checks.

- Native Gambas navigation, board/card tree, card editor and search controls.
- Persistent owner-scoped boards and cards: create/edit, statuses, swimlanes,
  assignees, labels, descriptions, due dates, archive/restore and activity records.
- Embedded HTML/CSS/JavaScript list, swimlane, table, month calendar and current
  status chart reports. Calendar month navigation and safe user text rendering.
- Due-date milestone table under Gantt; full task durations/dependencies remain below.
- My cards and due cards filters; profile identity and administrator user listing.
- Portable schema creation with Gambas field types, bound query parameters and
  driver operations. SQLite integration tests pass; other drivers are unverified.
- Repaired recursive admin checks and swallowed access-denial errors; user creation
  hashes passwords and reset checks the actual session. No accounts are seeded.
- Registration on a fresh database: first successful user is Admin, later users
  are Normal; a transactional unique claim prevents two first admins.
- Profile/name/password and administrator create/reset/role/delete controls.
- Real Gambas HTTP registration/login → board/card → reports → admin/profile →
  logout tests pass against an isolated, initially empty database.
- Gambas 3.20.2 compilation, real SQLite CRUD/archive tests, negative input/access
  tests, authentication/privilege tests and JavaScript DOM/report tests pass.

- Added persisted Admin Panel / Password Length settings, disabled by default.
  Short passwords work unless enforcement is enabled. Tests cover all new-password
  entry points, administrator-only updates, Unicode length and saved-policy reads.

- Added login/register modes, Show/Hide password controls and a repeated-password
  field. HTTP tests cover both visibility toggles, mismatch rejection and specific
  duplicate/length messages on source and packaged-archive sessions.

- Local startup prefers port 8080 and selects a free port if it is occupied.
  Real socket tests verify fallback, serving on the selected port, explicit-port
  behavior and propagation of unrelated bind errors. Test servers are closed.

- Compared the running WeKan UI and reordered native Gambas controls into a
  single header, left navigation, central board/report content, optional right
  page sidebar and closable card details. Added clickable board tiles and menus.
- Added isolated real-browser checks with optional screenshots; source-project
  and packaged-archive UI paths are covered without seeded application accounts.

## Current status and next work

- Changes are organized into separate local commits for accounts, Kanban,
  build/release tools and documentation, updating both changelogs per category.
  Full current WeKan parity is not complete.
- Chromium layout/interaction checks now pass at 1440×1000 and 390×844, including
  header/navigation/sidebar geometry, view menus, board/card creation, calendar,
  admin forms and keyboard-focus placement. Other browsers and a comprehensive
  accessibility audit remain to be done.
- Weba now has its own project-only AGENTS.md and CLAUDE.md. Its information is
  removed from the parent instruction files as requested.
- The user-provided legacy `.tools/bin/gambas3` contains the IDE, components, metadata
  and source; compiler/interpreter executables were absent from `bin/` when
  inspected. Initial tests use a disposable Debian ARM64 3.20.2 toolchain under
  the parent `.tools/tmp/weba/gambas` directory. The embedded HTTP server discards
  relocated runtime paths; the committed HTTP runner preserves them for testing.

## Build/release tooling status

- Added build/run/test/package menu, Release All / Release All Missing, target
  listing, toolchain doctor and Copy Gambas to Flatpak Sandbox.
- Copy helper targets `.tools/bin/gambas` and includes host tools, components,
  metadata, icons and relocated wrappers. Fixture-copy tests pass; an actual host
  copy and its libc/CPU compatibility still need to be checked by the maintainer.
- Workflows build Linux installers for eight Debian CPU architectures, source
  archives, Windows WSL and macOS Docker launcher packages. Each target attaches
  completed artifacts and checksums independently; missing mode preserves complete
  pairs. Workflows require existing pushed tags and never push refs themselves.
- Local ARM64 deb/tar and desktop-launcher zip structures/checksums verified.
  Packaged `.gambas` HTTP/session test passes. Actionlint and shell syntax checks
  pass. Build-menu tests pass, including release planning and copy fixtures.
- GitHub workflows have NOT been dispatched. Other CPU builds, actual package
  installation under Debian, Windows WSL installation and macOS Docker startup
  remain unverified. Native BSD/macOS runtime packaging is still future work.

## Remaining page and component parity

Use the actual parent source rather than treating the prototype's old menus as
an exhaustive list. Reference areas: `client/components/boards`, `cards`,
`sidebar`, `rules`, `settings`, `users`, `activities` and `gantt`.

- Configurable lists and swimlanes, ordering/drag-and-drop, multi-selection,
  board rename, stars, colors, visibility and board membership/roles.
- Card comments, checklists, subtasks, dependencies, attachments, rich text,
  custom fields, time tracking, history and notifications.
- Public boards, templates, organizations, teams and global/multiboard search.
- Full Gantt durations/dependencies, timeline, roadmap, statistics/history,
  scrum, time, assignee grouping, maps, chat, email and version-control views.
- WeKan chart types (flow/history/forecast/etc.) with the required persisted
  historical data; do not present invented historical measurements.
- Board settings, labels and custom-field management, automation rules,
  notification settings, integrations, import/export and account preferences.
- Admin settings, people/teams/organizations, problems summaries and other
  current administrator pages, each with server-side authorization.
- Reuse/adapt existing WeKan HTML/JS/CSS where independent of Meteor/Blaze;
  do not assume Meteor templates or Mongo publications run inside Gambas.
- Browser E2E checks, responsive layouts, keyboard/accessibility checks,
  translation integration and database conformance for other Gambas drivers.

## Before committing

- Finish the active changes, run focused checks, document actual limitations in
  README and CHANGELOG, review both repositories separately.
- Commit locally on `main` as Lauri Ojansivu; never push. Report each commit hash
  and the exact human-run push command. Do not commit the test database or tools.
- Before human publishing: run the GitHub CPU matrix, test real Debian package
  installation and the WSL/macOS launchers, and repeat browser checks on the release targets.
