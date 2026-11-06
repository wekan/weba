# Upcoming WeKan ® for Gambas release

This work adds the following features and fixes:

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
