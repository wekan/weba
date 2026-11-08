# Work in progress

Updated 2026-11-08. Target: the signed-in pages of the current `wekan/wekan`
checkout, implemented with Gambas Web UI, SQLite persistence and portable Gambas
DB operations. This is an initial implementation, not complete WeKan parity.

## Current UI/API/security work

- Full scope remains all items below and the current WeKan UI/API/security test
  contracts. Complete original suites have not passed against weba. Six spec 17
  callbacks (three board membership, one card membership, one people-array clear,
  one user deletion) run unchanged with actual Playwright assertions and explicit
  SQLite fixture adapters; the other 24 callbacks remain unexecuted. Preserve
  original assertions as execution adapters expand.
- Completed: remove login initializer request/query/user-agent logging and the
  unused shared temporary logfile sink. Guard sources against reintroducing
  request payload logging; validate registration through real CGI sessions.
- Completed: block Gambas development/environment-dump routes before CGI,
  including encoded paths; test the packaged HTTP endpoint and no-runner guard.
- Completed: native commands now use POST bodies with a required custom header,
  authority/origin and Fetch Metadata validation. Cross-origin form/image/native
  requests are rejected before CGI; iframe embedding is denied. Browser tests
  inspect actual POST URLs/headers and exercise rich-card upload/download.
- Completed first REST contracts: `/users/login`, `/users/logout`, owned-board
  lists and board reads. Tokens have 256 bits of entropy, only SHA-256 digests
  are stored, and expiry/logout/all/password-reset revocation are verified.
  Native browser cookies cannot authenticate REST. Login attempts use a bounded
  per-peer window and unknown-account password checks; WITH_API gates data routes.
- Completed REST user deletion: site-admin-only DELETE /api/users/:userId uses
  the committed removal result, returns the deleted ID, and reports repeat or
  missing users as 404. Preserve native self-delete protection; REST site-admin
  self deletion follows the original route and revokes its credentials. Reuse
  atomic reference cleanup, token/session revocation and display-only attribution.
  Verify no mutation for anonymous/forged/cookie/board-admin requests, retained
  cards/files/history and other administrators, sanitized database failures with
  independent full-table rollback snapshots, and the unchanged original spec 17
  deletion callback. Stable user IDs and full original suite parity remain open.
- `build.sh test` now includes real REST tests for source and archive, alongside
  native sessions, store tests, runtime security cases and JS transport guards.
- Completed: build.sh finds the shared tool area from .tools/w/weba as well
  as the legacy/standalone layouts; doctor fixture checks include path spaces
  and explicit overrides.
- Completed first shared-board layer: persisted private-board membership,
  board-admin/normal/no-comments/comment-only/read-only capabilities enforced
  across store operations, protected legacy owners and transactional changes.
  Comment edits/deletes require authorship or board administration; deep copies
  can retain existing comments without granting new comment authoring. Personal
  stars/watch flags do not alter another member's preferences. SQLite negative
  tests cover reader/editor/comment/admin boundaries and membership removal.
- Completed: all nine built-in role definitions, including assigned-only scopes
  across lists/direct reads, related entries, attachments, history/order/export.
  Assigned-only container copying/transfers are denied. Multiple assignees are
  retained across copies/imports/moves; Workers can move within a board, comment
  and change only their own assignment. Hidden WIP occupants are counted by the
  server. Store tests include negative cases and late import rollback.
- Completed: native member list/add/role/remove controls, role-aware editors,
  menus and drag handles; Workers can assign themselves and move cards. Native
  disabled buttons expose matching HTML/ARIA states, and rerendered dialogs keep
  their anchor. Packaged two-session Chromium tests verify member changes,
  forged reader writes, Worker comments/moves, assigned-only scope and mobile
  placement. Static member/role captions use the existing WeKan translations.
- Completed initial membership REST routes: POST add/remove and role updates,
  named aliases/boolean-string flags, source flag precedence and raw combined
  flag retention. Return minimal board rows instead of user documents; add is
  idempotent for active members. Preserve the caller's own admin bit, keep the
  final admin on removal and reject demotion that strands a board. Site admins
  can explicitly manage/recover foreign/orphan boards through a tightly scoped
  API context; native sessions cannot enter it. Replace legacy implicit owners
  with explicit memberships while preserving personal preferences. Verify
  source/archive HTTP cases, unchanged spec 17 callbacks, scope reset after
  success/failure, native role resets, deletion cleanup and real failed-COMMIT
  rollback/retry of roles/flags/history.
- Documented membership REST payloads, explicit recovery and source/archive
  original-callback execution, including reference dependencies and honest gaps.
- Completed inactive membership persistence: removal retains API flags with
  isActive false and clears the administrator flag. Inactive rows never grant
  access or count as final administrators, even with stale owner/member pointers.
  Role updates stay inactive; explicit add replaces old flags and reactivates.
  Preserve personal preferences, transact audit history and clear retained rows
  on account/board deletion and historical username cleanup. Verify native
  negatives, source/archive API contracts, three unchanged original callbacks,
  four forced-COMMIT rollback/retry phases and packaged browser re-invitation.
- Documented active/inactive roster semantics, explicit re-invitation, retained
  preferences, identity cleanup and the four real failed-COMMIT test phases.
- Documented REST user deletion, site-admin/self-delete behavior, authoritative
  responses, rollback/content guarantees and original callback coverage. Native deletion cancel/confirm and session revocation still pass in
  packaged Chromium after sharing the deletion implementation with REST.
- Completed card-person merge routes: POST/DELETE card members and assignees
  remain separate, deduplicate additions, preserve append order, require active
  board members for adds
  and allow stale removals. Match REST write/full-card-scope checks and the
  explicit scoped site-admin exception; reject foreign board/list IDs and
  archived cards. Card members never bypass assigned-only visibility. Preserve
  members through copy/move/JSON and clear them on account/card/board deletion
  and historical username cleanup. Verify original card-member callback,
  source/archive role/negative HTTP tests, sanitized database failures,
  four forced-COMMIT rollback/retry phases and native lifecycle/invalid-import
  rollback. Extend account-deletion rollback snapshots to the member table.
- Documented card-person routes, independent ordered fields, active/stale
  targets, REST role restrictions, scoped administration, lifecycle/rollback
  tests and exact original callback coverage.
- Completed native Gambas card-member editor from the saved-card panel and
  card context menu. Show ordered current members and only unselected active
  board members as add candidates; let writers remove inactive/stale members.
  Readers can inspect members, while hidden/disabled controls and server-side
  checks prevent forged changes. Assigned writers may edit visible cards;
  Workers and readers cannot change membership. Recheck permissions/scope under
  transaction locks and preserve the independent assignee field. Verify native
  role negatives, two-session Chromium persistence/forged requests/stale cleanup,
  mobile fit/X, translated fixed captions and unchanged user/card names. Extend
  real COMMIT rollback/retry checks to native add/remove as well as REST.
- Documented native member editor entry points, active candidates, stale
  removal, read/write/assigned/Worker boundaries, independent assignees,
  popup behavior, native/REST COMMIT test phases and 105 translated keys.
- Completed members/assignees card PUT replacement: normalize explicit
  null/empty/non-array values to [], retain supplied string order/duplicates,
  filter inactive/unknown board members and leave omitted fields untouched.
  Preserve explicit empty JSON keys on Gambas 3.20 while rejecting undefined
  syntax. Use portable sequence rows alongside unique permission relations;
  retain legacy fallback reads and carry/clean sequences through copy, move,
  JSON exchange, account recreation and permanent deletion. Merge additions
  keep existing duplicates; removal and native self-unassignment remove every
  occurrence. Native member trees offer one selectable row per person.
  Match the legacy archived-PUT no-op/ID response and empty-body 404; unsupported
  card fields return explicit 400 until their own contracts are implemented.
  Verify the unchanged original #3697 callback, source/archive HTTP normalization,
  role/list/cookie boundaries, partial second-field rollback, eight card-person
  failed-COMMIT/retry phases, duplicate lifecycle and packaged Chromium PUT /
  native editor interaction. Full original suite parity remains pending.
- Documented PUT replacement/coercion, filtered ordered duplicates, omitted
  fields, legacy archive/empty responses, unsupported-field limits, eight
  card-person COMMIT phases and API-enabled Chromium coverage. Original spec 17
  coverage is now six of thirty callbacks, with full-suite gaps explicit.
- Completed: card PUT receivedAt/startAt/dueAt/endAt with UTC millisecond
  storage, numeric epochs, ISO offsets, explicit clears and invalid-date skips.
  Combine people/date writes atomically; preserve instants across copy/move/JSON,
  native unchanged-day saves and permanent cleanup. Changed native due days reset
  only dueAt to UTC midnight; clearing removes only that date. Normalize numeric
  JSON date fields before Gambas decoding without bypassing the body-size limit.
  Verified 44 cases against actual source date helpers, original #5846 callback,
  source/archive HTTP boundaries, SQL persistence, rollback and ten card-update
  failed-COMMIT/retry phases. Full local test command passes, including 27 Python
  tests. Original spec 17 coverage totals seven of thirty callbacks across the
  adapters; the complete original UI/API/security suites remain unverified.
- Documented: date PUT inputs/clears, numeric precision, UTC native projection,
  seven original callbacks, 44 helper cases and ten COMMIT phases. Packaged
  Chromium verifies actual PUT plus native unchanged/change/clear and preserved
  milliseconds/other dates.
- Pending dates: local-time/unqualified and freeform V8 date parsing, complete
  native controls for all four fields and time zones, and expanded-year day UI.
- Completed: card PUT description accepts strings (including empty), clears
  JSON null, preserves omitted data and rejects other types with 400 before any
  people/date write. Literal HTML, Unicode and whitespace remain exact. The
  card PUT host re-encodes valid supplementary description characters as UTF-8
  to avoid Gambas 3.20 dropping escaped surrogate pairs. Independent HTTP tests
  cover type/role/list/archive boundaries and trigger-induced combined rollback;
  existing real failed-COMMIT date phases now include description replace/clear.
  Packaged Chromium confirms API Unicode descriptions reopen in the native editor.
  Full local tests pass (28 Python tests); original callback coverage stays 7/30.
  Lone-surrogate behavior and remaining scalar fields still need source parity.
- Documented description PUT values/errors, atomic writes, escaped/direct
  Unicode transport, native reopening and remaining scalar/lone-surrogate gaps.
- Next card-person work: remaining card PUT fields, reads, creation/bulk routes
  and complete original UI/API/security suites.
- In progress: REST cards/containers and full API identity/data parity, including
  stable IDs and complete source roster metadata. Custom roles, list-level
  exceptions and public/instance board visibility remain pending.
- Completed: native browser sessions bind to persistent nonreused account
  session versions. Password changes retain the changing browser but revoke
  other native sessions; administrator resets and same-name account recreation
  invalidate old sessions. Missing/legacy stamps fail closed, and legacy accounts
  get a version only after verified credentials. Password/version/token changes
  and account deletion now transact together; native credential verification and
  REST token issuance serialize with password resets. Source/archive HTTP tests,
  legacy/negative store checks, forced reset-commit rollback and the complete
  local suite pass. Existing unversioned browser sessions must sign in again.
  Revoked native commands now return a login reload before dispatch rather than
  throwing into Gambas's alert/backtrace path; source/archive lifecycle tests and
  the packaged two-browser deletion flow verify navigation and denied writes.
- Completed: account deletion clears legacy owners, memberships, personal
  stars/watch flags and both assignee representations in the same transaction
  as account/token/session removal. Other members and assignments remain;
  normal members are never silently promoted. Comments, files and history stay,
  with display-only attribution detached from deleted account principals and
  orphan timers stopped. Registration/admin-created accounts also clear
  historical dangling references before claiming a formerly unused name.
  Copies retain comment/file authors, JSON exchange retains display-only names,
  moves preserve provenance and permanent deletion prunes its metadata. Reject
  forged comment ownership and invalid imported author values. Protect the last
  active board admin after an owner disappears. Real SQLite negatives,
  independent failed-COMMIT snapshots and packaged
  two-browser admin cancel/confirm/re-registration tests pass; no broad WeKan
  suite parity is implied by these focused checks.
- Follow-up: native administration controls for explicit recovery/ownership
  transfer (membership REST recovery exists), and stable opaque account IDs for full WeKan API
  identity/import parity. Current deletion cleanup does not reconstruct the
  original principals of accounts already reused before this update.
- Follow-up security work: email/LDAP/2FA login, configurable token lifetime,
  native-login throttling, registration policy, concurrent site-admin deletion/
  demotion, parallel first-API schema initialization, and the original WeKan
  fixture/browser suites remain pending.
- Completed: native large-text updates bypass environment/dispatcher limits
  through private per-request files and a short native event. Independent SQLite
  checks verify the full Unicode description; unit tests verify mode 0600,
  cleanup on success/timeout and rejection of arbitrary large event payloads.
- Completed: CGI timeouts no longer wait for descendants holding inherited
  stdout/stderr pipes. Test a real spawned descendant, actual CGI output and
  error handling; diagnostic stderr is not logged.
- Completed: reject dot/encoded traversal and library/icon escapes before CGI;
  test public/private canary boundaries without reading real private files.
- Next: expand REST API contracts and shared board access/role boundaries;
  remaining feature work below is still pending.

- Completed: reproduce the failed-COMMIT registration retry failure with a
  separate SQLite reader lock. Gambas 3.20 decrements its transaction counter
  before driver commit/rollback, so failed commits could leave pending writes
  on a connection that could not roll them back. Shared transaction helpers now
  close/reopen failed connections without retrying an ambiguous commit. All
  store transaction boundaries use the helper. Deterministic registration/card
  tests verify discarded accounts/content/history and successful later writes
  on the same shared connection; eight fresh two-process registration races and
  the complete local build.sh test suite pass. Only SQLite/ARM64 was executed;
  other database drivers still need conformance tests.

## Verification follow-up

- Reproduced the concurrent first-registration retry failures. Release result
  cursors before writes/rollback and hash before starting the transaction; three
  consecutive complete store/race runs passed afterward. Continue monitoring
  under production concurrency and other database drivers.

## Translation coverage

- Imported 92 matching WeKan keys for 237 registered languages. Language selection
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
  reload canonical data; duplicate-title lists retain distinct stable identities.
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
- Implemented stable list identities, native context menus, rename/copy/colors,
  stars, saved watch preferences, WIP limits, archives/restoration, history and
  scoped weba JSON export. Duplicate-title lists retain their own cards.
- Implemented comments, checklists/items, real subtasks, dependencies, typed
  card fields, manual time records/timers and binary attachments. Rich copies
  remap internal relationships; running timers are not copied.
- Implemented cross-board card/list/swimlane moves and archived permanent
  deletion with exact-title confirmation. Moves spanning only part of a card
  relationship are rejected; move the complete linked group or remove the link.
- Implemented weba-2 JSON export/import with empty layouts, ordering, archived
  cards, metadata and rich content. Imports create a new owned board atomically;
  20 MiB JSON and 10 MiB individual attachment limits apply. Running imported
  time records become stopped records. Meteor WeKan JSON import remains pending.
- SQLite store tests and real Chromium native-menu, rich-card, cross-board,
  deletion and packaged JSON exchange tests pass. Desktop/mobile full-layout
  regression passed after adding the new controls.
- Color dialogs now have WeKan preset swatches, a browser color wheel and a
  synchronized hex field. Packaged Chromium tests verify all context palettes,
  invalid hex rejection, persistence and mobile placement; `build.sh test` passes.
  Board presets currently use solid theme base/first-stop samples; full gradient
  and special-theme styling remains pending.
- Next priorities within boards/lists/cards: shared membership/permissions,
  board-defined labels/custom fields, rich text, notifications and remaining
  card actions. Administrator, automation and integrations remain later groups.

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

- Cross-board drag/drop gestures (native menu moves exist), multi-selection,
  board visibility and board membership/roles.
- Rich text, mentions, complete date controls, board-defined custom fields and
  notifications. Saved watch flags currently record preferences only; they do
  not deliver notifications. Card-level text/number/date/checkbox fields exist.
- Public boards, templates, organizations, teams and global/multiboard search.
- Full Gantt durations/dependencies, timeline, roadmap, statistics/history,
  scrum, time, assignee grouping, maps, chat, email and version-control views.
- WeKan chart types (flow/history/forecast/etc.) with the required persisted
  historical data; do not present invented historical measurements.
- Board settings, labels and custom-field management, automation rules,
  notification delivery/settings, integrations, Meteor WeKan/other import formats
  and account preferences. Native weba JSON exchange exists.
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
