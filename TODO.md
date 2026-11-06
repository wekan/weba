# Work in progress

Updated 2026-11-07. Target: the signed-in pages of the current `wekan/wekan`
checkout, implemented with Gambas Web UI, SQLite persistence and portable Gambas
DB operations. This is an initial implementation, not complete WeKan parity.

## Verification follow-up

- The existing concurrent-registration test can exhaust its retry loop; the
  complete suite passed on rerun. Investigate that intermittent
  test before treating repeated full-suite runs as deterministic.

## Translation coverage

- Imported 73 matching WeKan keys for 237 registered languages. Language selection
  on login and in the account menu persists locally; browser language is the initial
  default, with English fallback and RTL metadata from WeKan.
- Native interface labels and selected report headings/calendar dates are localized.
  User identities, input, board/card titles and custom swimlane names stay unchanged.
- Weba-specific status/error/help text without a WeKan equivalent remains English;
  see `WeKan/.public/i18n/manifest.json` for unmapped strings. Complete these before
  claiming full translation coverage. No human translation is overwritten.

## Implemented and checked

- Touch drag handles for cards/lists/swimlanes, 7px threshold, ghost/placeholder,
  card ordering and movement across lists/lanes, list ordering and moving unique
  lists with their cards, lane ordering, auto-scroll, pointer cancel/multitouch
  and Escape. Ordinary touch swipes stay native scrolling; mouse card surfaces
  and keyboard handle arrows also work.
- New portable `kb_order` metadata retains manual order without altering existing
  card/lane schema. Moves validate ownership, active state and destinations and
  use transactions. Blank legacy lanes remain part of Default. Rejected moves
  reload canonical data; duplicate destination list titles are rejected safely.
- Store/gesture/protocol tests pass. Chromium CDP touch events cover ordering,
  cross-lane/list moves with UTF-8 names, list confirmation/decline, carried cards,
  persistence, mouse surface dragging, edge scrolling and ordinary swipes. These
  are browser-emulated touch tests; physical devices and other browser engines
  remain unverified.


- Card popups open beside their initiating button and stay inside the visual
  viewport on desktop, portrait/landscape and resize. View/account/list/swimlane
  popups/composers have top-right X controls; native popup X stays visible when
  scrolling. Escape dismisses open popups. Geometry, clickability and dismissal
  are covered with jsdom and Chromium checks. Gambas focus outlines follow the
  anchored editor, closing restores focus even after native control re-rendering,
  and the complete Chromium layout check (including card-save focus) passes.


- WeKan Font Awesome solid/regular/brand fonts and v4 aliases replace native
  Unicode/bitmap interface icons, including header, tree and board controls.

- Opening a board defaults to Swimlanes, including an empty board. Swimlane
  controls sit at the right edge of its header; list collapse is at the left,
  with add-card/menu/add-list at the right and another add-card at the bottom.
- Empty swimlanes and custom lists persist in portable Gambas tables. List
  composers open after the selected list. Card actions prefill the native editor
  with the correct swimlane/list; clicking a card opens that editor. Owner checks
  and archived-board action guards are covered. Chromium checks desktop/mobile
  positions, Unicode action values and reopen persistence.
- Full WeKan structural menus and creating new cards at the top via the header
  action remain unimplemented; existing cards can be reordered by dragging.

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

## Active work: remaining WeKan menus

- Priority confirmed: boards, lists and cards first; then administrator,
  automation and integration groups. Native Gambas menus must invoke working
  authorized database operations, not placeholder actions.
- Stable list identities are implemented and checked, including duplicate-name
  touch moves and retention of legacy card assignments. Structural action menus
  and richer card details are the next implementation steps.

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

- Renaming/archiving lists and swimlanes, cross-board drag/drop, multi-selection,
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
