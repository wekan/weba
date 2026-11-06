# Upcoming WeKan ® for Gambas release

This work adds the following features and fixes:

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
