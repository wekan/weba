# Upcoming WeKan ® for Gambas release

This work adds the following features and fixes:

- Bind native browser sessions to persistent account session versions. Revoke
  other browsers after password changes, all native sessions after administrator
  resets, and predecessor sessions after same-name account recreation. Keep the
  changing browser signed in, reject missing/stale stamps and initialize legacy
  versions only after verified credentials. Transact password/version/token
  changes and deletion together, and serialize native verification/REST token
  issuance with credential mutations. Add real source/archive session lifecycle
  tests, legacy/negative store cases and forced reset-commit rollback checks.
  Existing unversioned browser sessions must sign in again. Thanks to xet7.

- Recover database connections after failed transaction commands. Gambas 3.20
  can decrement its nesting counter before a driver rejects COMMIT, leaving
  pending writes that a subsequent Rollback cannot discard. Use shared portable
  connection lifecycle recovery throughout the stores, without retrying an
  ambiguous commit. Reproduce with independent SQLite reader locks and verify
  registration/card rollback, unchanged history and later successful writes on
  the same connection. Wait for both concurrency workers before fixture cleanup;
  verify eight fresh first-admin races and the full local suite. Thanks to xet7.

- Add native shared-board member controls for all nine roles, with member add,
  role changes and removal. Adapt menus, card/detail editors and drag handles to
  server capabilities; enable Worker self-assignment and card movement. Keep
  refreshed dialogs anchored, synchronize disabled button HTML/ARIA states and
  translate fixed member/role captions using WeKan catalogs. Verify packaged
  two-session reader/Worker/assigned-only behavior, forged writes and mobile
  placement, plus disabled-state and drag regressions. Thanks to xet7.

- Enable all nine built-in WeKan roles with assigned-only card scopes on lists,
  direct reads, comments/files, relationships, history, card ordering and export.
  Reject assigned-only container copies/transfers and retain only readable
  relationship targets. Add multiple assignees, Worker-only self-assignment and
  within-board moves; preserve other assignees and refuse arbitrary Worker edits.
  Retain assignments through copy/import/move, count hidden occupants for WIP
  enforcement and verify nested-import rollback. Add SQLite role/negative tests.
  Thanks to xet7.
- Add shared private-board membership and server-side capability checks for
  board-admin, normal, no-comments, comment-only and read-only roles. Cover
  card/container mutations, comments and authorship, uploads, timers, cross-board
  moves, archives and deletion; fail closed for unsupported/unknown roles.
  Preserve legacy owners as administrators, transact member changes and isolate
  stars/watch preferences per user. Keep content copying separate from comment
  authoring. Add real SQLite negative store tests and a snapshot guard against
  the authoritative WeKan capability matrix. Assigned-only/Worker restrictions
  and the native member controls are the next steps. Thanks to xet7.
- Reject dot-only path segments, encoded traversal/backslashes, control bytes
  and excessively nested URL encoding before CGI. Keep Gambas static asset,
  library and icon paths from escaping the public asset boundary. Test no-runner
  rejection and actual public/private canary files through packaged HTTP.
  Thanks to xet7.
- Bound CGI process deadlines even when a descendant inherits output handles.
  Capture output in private temporary files instead of pipes so timeout cleanup
  does not wait indefinitely for descendants; never log CGI stderr. Test a real
  spawned descendant and actual CGI output, plus host failure handling.
  Thanks to xet7.
- Document the runtime origin/development-route boundary, reverse-proxy origin
  configuration, native POST/large-text protocol, initial Bearer REST routes,
  token/throttle behavior and verified source/archive contracts. Keep remaining
  WeKan fixture/feature parity explicit. Thanks to xet7.
- Preserve large native text updates beyond OS environment/dispatcher limits.
  Send a short native wake-up and read the checked text update from a private
  mode-0600 request file, removed on success or timeout. Restrict targets to
  text controls on the current form; reject large arbitrary event payloads.
  Verify long Unicode descriptions independently in SQLite and test bridge
  privacy/cleanup plus packaged CGI behavior. Thanks to xet7.
- Discover the shared tool area from both .tools/weba and .tools/w/weba
  companion checkouts while keeping standalone defaults and explicit overrides.
  Test doctor resolution with paths containing spaces in all layouts.
  Thanks to xet7.
- Add Gambas REST login/logout and owner-scoped board reads with independent
  Bearer identity, 256-bit random tokens stored only as SHA-256 digests, expiry,
  presented/all-token logout and password-change/reset revocation. Rate-limit
  login attempts by direct peer using a bounded window; use a dummy password
  check for unknown accounts. Honor WITH_API for data routes and add no-store
  JSON responses. Validate cookies cannot authenticate REST, foreign-board
  reads fail, token persistence/revocation/expiry/reset work, and disabled API
  paths reject encoded/case variants in real source/archive runs. Other REST
  endpoints, email/LDAP/2FA and shared-board roles remain pending.
  Thanks to xet7.
- Carry native Gambas commands in POST bodies instead of credential-bearing
  URLs. Require a non-simple native request header, validate authority/origin
  and Fetch Metadata, reject URL commands and protect uploads/callbacks. Add
  frame-denial, nosniff and referrer headers. Adapt the checked POST body to
  Gambas 3.20 session dispatch internally, preserving spaces/plus/Unicode.
  Verify negative origin cases, real CGI sessions and browser file transfers.
  Named reverse proxies configure WEBA_PUBLIC_URL. Thanks to xet7.
- Block Gambas development routes before starting CGI, including encoded
  variants of the environment-dump endpoint. Prevent disclosure of database
  credentials and other runtime environment values. Verify host rejection and
  actual packaged HTTP requests. Thanks to xet7.
- Remove raw query/request/user-agent logging from login initialization and
  remove the unused shared temporary logfile sink. Native update payloads may
  contain passwords and must never enter application logs. Add a regression
  guard against raw request logging. Thanks to xet7.
- Document color palette refresh, custom-wheel/hex controls, tested coverage
  and the remaining board gradient/theme limitation in README/TODO.
  Thanks to xet7.
- Add WeKan color presets as native Gambas swatch buttons beside a browser
  custom color wheel and the existing hex field. Synchronize all three inputs,
  preserve server validation and saved colors, and use context-specific card,
  list/swimlane and board palettes. Import source color values with a refresh
  tool; board theme presets use solid base/first-stop samples, not full themes.
  Add the translated custom-color caption and packaged Chromium persistence,
  invalid-input and mobile-dialog tests. Thanks to xet7.
- Document implemented native workspace/card actions, JSON exchange limits,
  isolated browser checks and remaining WeKan parity work in README/TODO.
  Record verified SQLite ARM64/Chromium coverage and pending database/browser
  conformance checks. Thanks to xet7.
- Refresh native detail-editor controls when selecting a checklist through the
  checklist-item tree, retaining selection and showing the appropriate fields.
  Verify the packaged card-detail browser workflow. Thanks to xet7.
- Release registration result cursors before writes/rollback and calculate the
  password hash before opening the transaction. Reduce SQLite first-signup lock
  contention while retaining the unique first-Admin claim. Three consecutive
  complete store/race runs pass after reproducing the previous retry failures.
  Thanks to xet7.
- Extend imported WeKan translations to 91 interface keys across 237 languages
  for the new native menus and card controls. Preserve user-provided context,
  action and detail titles during localization. Thanks to xet7.
- Add versioned weba JSON export/import through native file controls. Preserve
  empty/duplicate containers, order, archived cards, metadata, checklists,
  relationships and binary attachments; remap IDs into a new owned board and
  roll back malformed imports. Limit import JSON to 20 MiB; this format does
  not yet import Meteor WeKan exports. Verify store and packaged browser
  round trips. Reject fractional WIP limits. Thanks to xet7.
- Move cards, lists and swimlanes between owned active boards while retaining
  IDs, rich content, files and internal card relationships. Reject partial
  relationship moves and inaccessible destinations. Permanently delete archived
  boards/containers/cards with exact-title confirmation and cascading cleanup.
  Verify store guards and packaged Chromium workflows. Thanks to xet7.
- Add native Gambas context menus for boards, swimlanes, lists and cards: rename,
  copy, same-board movement, colors, stars, saved watch preferences, WIP limits,
  archives/restoration, scoped activity and JSON card export. Preserve list
  identity and copy rich card content with validated relationship remapping.
  Add native comments, checklists/items, subtasks, dependencies, typed card fields,
  manual/running time records and binary attachment upload/download. Verify
  SQLite authorization/validation and Chromium menu/detail workflows. Watch
  preferences do not yet send notifications. Thanks to xet7.
- Give cards stable list identities, preserving legacy assignments before
  creating same-named lists. Keep duplicate-title lists separate in rendering,
  editing, copying destinations and touch/keyboard moves. Remove the duplicate
  title restriction without merging cards. Thanks to xet7.
- Add WeKan-style touch drag handles for cards, lists and swimlanes with a
  seven-pixel movement threshold, drop feedback, edge scrolling, cancellation
  and mouse/keyboard support. Persist order and cross-list/lane moves through
  validated transactional Gambas database operations, preserving card content
  and legacy default lanes. Keep ordinary touch swipes scrollable. Verify actual
  Chromium touch events, negative cases and SQLite persistence. Thanks to xet7.
- Anchor the native card popup beside its opening button and keep it fully
  within the visible viewport, including mobile/landscape and keyboard resizing.
  Add reachable top-right X controls to view/account/structure popups, preserve
  close controls while scrolling, support Escape, align keyboard focus and restore
  it after closing. Verify popup and full-layout behavior in Chromium.
  Thanks to xet7.
- Replace Unicode and bitmap interface symbols with WeKan’s local Font Awesome
  fonts, compatibility aliases and matching icon classes. Cover native headers,
  view menus, trees, board controls, calendar navigation and close actions.
  Thanks to xet7.
- Open boards in Swimlanes by default and place swimlane/list controls at the
  same header/footer edges as WeKan. Add functional inline list/swimlane composers,
  persistent empty layouts, correctly targeted native card editing and card-tile
  navigation. Preserve legacy cards and verify owner checks, ordering, desktop
  and mobile behavior using SQLite and Chromium. Thanks to xet7.
- Import matching WeKan interface translations for 237 languages, with a local
  language picker on login and in the account menu, persisted selection, RTL
  direction and localized report headings/calendar dates. Preserve user content
  and fall back to English for weba-specific unmapped text. Add an import tool
  and catalog, DOM and browser regression coverage. Thanks to xet7.
- Handle browser disconnects without a traceback or a second response attempt.
  Test normal-response and error-response disconnects. Thanks to xet7.
- Use local Font Awesome eye/eye-slash icons for both password visibility
  buttons, retaining descriptive tooltips. Thanks to xet7.

- Place independent Show/Hide password buttons beside both password fields and
  give the confirmation field the same white input styling. Thanks to xet7.

- Arrange native Gambas controls in the current WeKan order: one header with
  page/view/account actions, left navigation, central board tiles/reports,
  optional right sidebar and closable card details. Move admin navigation and
  profile/password settings into their page areas. Keep keyboard focus aligned
  with CSS-positioned panels. Verify desktop/mobile geometry and interactions
  in Chromium using source and packaged-archive sessions. Thanks to xet7.
- Select a free local port when the default 8080 is occupied and print the actual
  URL. Preserve explicitly requested ports. Add occupied-port and bind-error
  regression tests. Thanks to xet7.
- Add login/register navigation, Show/Hide password buttons and password
  confirmation when registering. Explain mismatched passwords, duplicate usernames
  and configured minimum lengths separately instead of one misleading error.
  Verify the controls through source and packaged-archive HTTP sessions.
  Thanks to xet7.
- Make minimum password length optional and disabled by default. Add persisted
  Admin Panel / Password Length settings shared by registration, user creation,
  password changes and resets. Test short passwords, enabled/disabled policy,
  Unicode length and administrator-only changes. Thanks to xet7.
- Added registration without seeded accounts: the first successful registration
  becomes Admin and later registrations become Normal, including concurrent
  first registrations. Create the SQLite schema on first use and stop shipping
  the demo database. Thanks to xet7.
- Fixed recursive/swallowed permission checks, hash new passwords, authorize
  resets against the actual session, preserve password whitespace and avoid
  logging password hashes. Added isolated authentication, permission and
  concurrent-registration regression tests. Thanks to xet7.

- Added native Gambas board/card navigation and editing, persistent owner-scoped
  boards/cards, search, labels, assignees, swimlanes, due dates, archives and
  activity records, with portable Gambas driver operations. SQLite is verified;
  other drivers still require conformance testing. Thanks to xet7.
- Added local HTML/JavaScript/CSS lists, swimlanes, tables, monthly calendars,
  due-date milestones and current-status charts inside Gambas. Added profile/
  password and administrator user-management controls, SQLite CRUD/negative tests
  and DOM/report tests. Full current WeKan parity remains in TODO.md.
  Thanks to xet7.

- Added build.sh with local build/run/test/package actions, Release All,
  Release All Missing, target listing, toolchain checks and Copy Gambas to
  Flatpak Sandbox. Added a local CGI host preserving runtime/database settings,
  plus real source-project and packaged-archive HTTP/session tests.
  Thanks to xet7.
- Added independently uploaded Linux deb/tar targets for eight Debian CPU
  architectures, Windows WSL and macOS Docker launcher zips, source archives
  and per-file SHA-256 sums. Missing mode preserves completed pairs and repairs
  incomplete assets; workflows require existing tags and never push refs.
  Added copy/packaging/release-plan tests. Local ARM64 packages and workflow
  syntax are checked; remote jobs and other OS/CPU installers remain unverified.
  Thanks to xet7.

- Added weba-only AGENTS.md and CLAUDE.md, moving its working instructions out
  of the parent repository. Documented toolchains, registration, local builds,
  human-only publishing, installer/runtime dependencies and test limitations.
  Added TODO.md tracking completed work and remaining page/component parity.
  Thanks to xet7.

Thanks to above GitHub users for their contributions and translators for their translations.

# v1.0 2021-12-08 WeKan ® for Gambas release

This release adds the following new features:

- Added simplified UI mentioned at https://github.com/wekan/wekan/issues/4027#issuecomment-931751251 .
  Thanks to xet7.

Thanks to above GitHub users for their contributions and translators for their translations.
