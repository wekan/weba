# Work in progress

Updated 2026-11-09. Target: the signed-in pages of the current `wekan/wekan`
checkout, implemented with Gambas Web UI, SQLite persistence and portable Gambas
DB operations. This is an initial implementation, not complete WeKan parity.

## Current UI/API/security work

- Documented private workspace schema, stable IDs, transaction rechecks, category
  semantics and lifecycle tests; native UI/gestures and original callbacks remain
  in progress.

- Completed personal workspace tree CRUD/reparenting and board assignments,
  category filtering before counts, current-principal/foreign/cycle guards and
  account/board cleanup. Native tests cover readonly personal organization,
  rollback/retry, late parent/membership changes, stable IDs and recreation.
  Original getAllBoardsPage comparison now covers 75 cases on raw SQL fixtures.
- Completed native nested workspace rows and per-row menus, create/subworkspace,
  name/literal-icon edits, confirmed subtree deletion and board placement forms.
  Readonly members can organize their own readable boards. Category/search and
  Remaining transitions, reload/user isolation, live assignment/name/deletion
  changes, dirty form preservation, revoked-pane cleanup/forged stale Save denial,
  mobile popup/Escape and Finnish/Latin labels have real browser coverage.
  Import 10 additional source keys (123 total) for all 237 local catalogs.
- In progress: workspace drag/drop and collapse/count controls, Markdown icon
  rendering and complete original All Boards workspace/UI callbacks. The new
  native form tests do not execute the original Latin callback unchanged.

- Documented header menu lifecycle and stable shared styles, delayed stylesheet/
  font placement and safe teardown. Recorded the new real browser/unit evidence;
  workspace and full original-suite requirements remain open.

- Completed catalog sort popup lifecycle: View/Account menus exclude it,
  Home/Remaining/Starred/Archive navigation closes it and Escape/trigger anchoring
  use the shared popup handler. Move kanban.css out of the refreshed Visual
  container to stable bootstrap; reposition after stylesheet/font completion and
  guard teardown callbacks. Real desktop/mobile tests preserve saved sort/search
  drafts and clickable close controls. Delayed-width/async-error tests, full
  local/test-live and existing layout regressions pass. Original suite counts
  remain unchanged.
- Next workspace parity: add persisted collapse/visible counts and tree/board
  drag gestures, then align form semantics and run the unchanged original Latin
  callback with explicit native transport/fixture adapters.

- Documented personal rank merging, readonly/sorted/archive boundaries, fresh
  transaction checks, cleanup, expected-order focus and trusted browser evidence.
  Kept workspace/multiselection/original callbacks and collation/polling limits
  explicit; order failure injection does not change the 20 card COMMIT phases.

- Completed per-user Custom board order with real mouse, trusted touch-handle
  and repeated keyboard moves. Retain/merge filtered-out ranks, title fallback,
  reload and live personal-order updates; sorted/archive modes do not reorder.
  Recheck principal/mode/board visibility under locks, keep shared history and
  activity untouched, roll back injected write failure and clean account/board
  references. Native tests also inject late membership/mode changes after the
  account lock and reject/roll them back. Source/packaged gesture tests cover readonly
  members, foreign/sorted forgery, user isolation and original mapping/merge
  helpers. Preserve keyboard focus only for the expected resulting order. Import
  the original Custom (drag order) translations across 237 catalogs. Full original
  UI callbacks/workspaces/multiselection remain pending. Full local tests pass
  (28 Python tests and unchanged 20 card-update COMMIT phases), as do source/
  packaged test-live. The separate order failure test injects UPDATE failure,
  not a physical COMMIT failure.

- Documented native catalog controls, board/card search separation, page-label/
  button update ordering, cross-session state and source/packaged/mobile/Finnish
  evidence. Preserve workspace/original-callback and
  unmatched-translation follow-up rather than claiming full spec 39 completion.

- Completed native All Boards sort popup, live board-name search/clear and
  25-result paging, wired to scoped BoardCatalog data. Persist per-user A-Z/Z-A
  choices, show the active choice, preserve unpaged Custom/title fallback and update
  page/controls before rendering. Verify 25/5 pages, reload/user isolation,
  Unicode/private search, external sort changes, archive-induced page clamping,
  mobile controls and Finnish labels on real source/packaged browsers. Import
  current matching WeKan texts across 237 catalogs. Full local test/test-live and
  existing desktop/mobile layout regressions pass. Workspaces and unchanged
  original spec 39 callbacks remain pending.

- Documented the native catalog service, principal and result bounds, UTF-8
  search and account preference cleanup. Recorded the 54-case source-method
  adapter and explicit UI/raw-JSON/custom-order/workspace/facet limitations.

- Documented overview snapshot boundaries, capture/refresh ordering, stable idle
  tiles and the native/two-user browser evidence. Retained all original spec 39
  sorting/search/pagination/workspace requirements and remaining view/polling gaps.

- Completed live All Boards/Starred/Archive overview tiles and their navigation.
  Reproduced stale home titles with two native browser users; detect authorized
  title/color/star/navigation changes, membership grants/revocations and board
  archive/restore. Keep unchanged tile DOM nodes and exclude hidden card changes,
  card bodies and another user's stars from the private snapshot. Capture before
  navigation reads and remember after refresh succeeds. Native scope/privacy and
  two-user source/packaged tests cover the implemented behavior; complete original
  suites remain pending. Full build.sh test passes (28 Python tests and 20
  card-update COMMIT phases); test-live passes on source and packaged apps,
  including existing details/people/archive regressions.
- Completed the native BoardCatalog service for current-user sorted board pages
  and per-user sort preferences. Verify disjoint pages/counts, stable equal-title
  IDs, literal/UTF-8 case-insensitive search, 25 default/200 maximum results,
  active/starred/archive scopes, stale/invalid/forged option rejection and
  deletion/recreation preference cleanup. Compare 54 actual native results with
  the original getAllBoardsPage body on independent SQL rows. Full local tests
  (28 Python tests/20 card-update COMMIT phases) and source/packaged test-live pass.
  Native controls are now wired for the implemented modes; there is no new
  public HTTP endpoint.
- In progress: remaining original spec 39 All Boards parity: workspace/category
  semantics and translated workspace creation/navigation, then run the unchanged
  six callbacks. Native browser/source-method comparisons are separate evidence.
  Multi-selection/cross-workspace drops, raw-JSON null-key preservation, efficient
  SQL count/paging and other open-view/idle reactivity remain pending. Clear search
  still lacks an exact imported source caption; Custom now uses its source key.

- Documented private live people snapshots, home roster polling, identity-based
  selection preservation, vanished-target cleanup and current role controls.
  Recorded native/two-user browser evidence and retained incomplete full source
  reactivity and original-suite requirements. Existing account-deletion browser
  regression also passes.

- Completed live native card member/assignee and board roster panes. Preserve
  valid row/candidate selections and invitation drafts, clear vanished choices
  without retargeting, update clean selected roles and reapply capabilities.
  Home-page rosters refresh too. Scope loss closes and clears card people fields;
  native mutations still guard forged events. New snapshot tests and two-user
  source/packaged browser tests pass, including duplicate display, readonly
  forgery/no-write, assignment loss, member removal and administrator demotion.
  Full local tests (28 Python tests, 20 card-update COMMIT phases) and existing
  member/details browser regressions pass. Full original suites remain pending.

- Verified existing WeKan color presets and custom color picker alongside hex
  entry. Fixed mobile action dialog height after reproducing viewport overflow.
  Packaged browser color tests pass, including saved colors and all four contexts.

- Completed current native dependency/subtask labels: reproduce stale cached
  names after target rename, then derive pane rows and selected field values from
  the current authorized target. Generated relationship titles are read-only;
  creating a new subtask still accepts its title. Reads do not rewrite link data
  or history. Native tests cover both kinds and assignment/reauthorization; real
  source/packaged two-user live tests verify two renames, selected values, target
  visibility loss while retaining root access and reappearance. Full local tests
  pass (28 Python tests), with native details/create/copy/archive browser coverage.
  Original callback counts and 20 COMMIT phases remain unchanged. Full source
  cross-board hierarchy and dependency metadata/navigation remain pending.
- Documented current relationship labels, generated read-only fields versus new
  subtask creation, read-side cache/history stability, guarded row/selection
  paths and native/two-user evidence with full hierarchy/metadata gaps retained.
- Completed live refresh for the existing native detail kinds: reproduce the
  missing external comment, then read private scoped pane snapshots and update
  rows/clean selected fields while retaining dirty input. Merge entry drafts over
  locked current data; retain author, role and identity guards. Preserve a missing
  checklist selection instead of retargeting a pending item; clear deleted entry/
  file selections, disable stale downloads and reject unsafe custom-type changes.
  Read file metadata without blobs, exclude foreign/orphan native relationships
  for all roles, normalize nullable timer fields and commit snapshot state only
  after a successful pane rebuild. Native tests plus two-user source/packaged
  test-live cover comments/checklists, drafts, author forgery, deletes/parents,
  files, typed conflicts and role/scope loss without JS errors. Two real entry-
  draft COMMIT/retry cases bring card-update phases to 20. Full local tests pass
  (28 Python tests), with native details/member/account-deletion browser coverage.
  Original callback counts stay 10/30 in spec 17 and 3/3 in the archive file.
- Documented live detail row/field preservation, missing-parent/delete behavior,
  binary-free metadata, scoped relationships, author/role/type boundaries and
  entry merge/retry semantics. Record native/two-user source/package evidence,
  20 COMMIT phases and remaining people/label/full-original-suite gaps.
- Completed native stale-editor field merging: reproduce an old title editor
  undoing an external description update, then keep a private opening baseline
  and merge fields differing from it over the locked, reauthorized current card.
  Preserve unedited concurrent descriptions, labels, moves, assignees/raw people
  and precise dates. Explicit same-field changed values win on save; clears remain
  explicit. Treat lane/status/list as one destination. Advance committed menu/
  people fields without rebasing unrelated drafts; refresh values/baseline after
  success and keep them for retry after failure. Reject mismatched/archived draft
  targets and retain role/scope checks. Native/SQL late-lock tests and two extra
  real failed-COMMIT/retry phases pass (18 card-update phases total). Full local
  tests pass (28 Python tests), source/packaged test-live keeps the external value
  through save/reopen, and packaged people/date/details regressions pass. Original
  callback counts remain 10/30 for spec 17 and 3/3 for the archive file.
- Documented changed-field/native baseline semantics, grouped placement,
  explicit last-write/clear behavior, precise people/date retention and
  menu/retry handling. Record the old browser data loss, native lock/negative
  coverage and 18 COMMIT phases with full original/editor gaps explicit.
- Completed open-board live updates through a one-second native Gambas
  WebTimer and private read-only scoped state. Compare visible cards/assignments,
  layout/order/colors/preferences and role capabilities before refreshing; hidden
  card edits do not change restricted state. Close/clear stale card panels after
  archive, assignment loss or board revocation, while retaining permitted unsaved
  input. Unchanged ticks preserve card DOM. Original archive callbacks pass 3/3
  unchanged on real source and packaged Playwright pages via build.sh test-live;
  original spec 17 remains 10/30 independently. Verify native stable/read-only
  state, empty lanes/metadata, draft/DOM behavior, direct revocation and packaged
  details/membership/account-deletion regressions. Full local tests pass, including
  28 Python tests. The timer still emits native heartbeat requests on other
  signed-in views; visible detail/people panes now also refresh there.
- Documented the native heartbeat/private state, capture-before-render rule,
  draft/DOM preservation and revoked-panel cleanup; add the test-live command,
  actual original callback/browser evidence and polling/deep-pane limits.
- In progress: full source inline-edit/unsaved-draft UX, other open-view navigation
  and efficient idle/background
  polling and complete original UI/API/security suites. Custom roles/list
  exceptions and full source hierarchy remain open.
- Completed native combined administrator/assigned-only card scope: reproduce
  the former bypass, then narrow shared visibility by every raw assigned flag
  independently of canonical role precedence. Keep write/manage capabilities and
  the scoped REST site-admin override; native site administration cannot bypass
  assignment, and inactive members still have no access. Verify direct cards,
  comments/files/relations, export/history, hidden mutation denial, assigned-card
  writes and clearing flags. All 256 active built-in flag combinations match
  actual source role/scope functions and native card queries. Packaged two-user
  Chromium checks all three flags, response packets and forged hidden contexts.
  Full local tests pass (28 Python tests); original callback counts remain 10/30
  for spec 17 and 3/3 for the separate archive spec (via test-live).
- Documented independent native raw assignment scope versus canonical action
  capabilities, native/site-admin/inactive boundaries, 256-case source comparison
  and packaged two-user response/context evidence. Keep custom roles/list
  exceptions, full original suites and deep-pane synchronization open.
- Completed documentation consolidation: project-specific source map, Gambas
  tooling, database notes and verification limits live in docs/Development.md.
  Remove companion AGENTS.md/CLAUDE.md duplicates per the containing WeKan root
  instructions; retain shared policy at the root.
- Full scope remains all items below and the current WeKan UI/API/security test
  contracts. Complete original suites have not passed against weba. Ten spec 17
  callbacks run unchanged with actual Playwright assertions and explicit SQLite
  adapters: three board membership, one card membership, one people-array clear,
  one due-date clear, one user deletion and HashBleed/ErrorBleed/AssignedBleed.
  The other 20 callbacks remain unexecuted. Preserve original assertions as
  execution adapters expand.
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
  tests. Original #5846 is covered; the current callback count is summarized
  above. Complete original UI/API/security suites remain unverified.
- Documented: date PUT inputs/clears, numeric precision, UTC native projection,
  original date callbacks, 44 helper cases and ten COMMIT phases at that stage. Packaged
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
  Full local tests pass (28 Python tests); current original callback coverage is summarized above.
  Lone-surrogate behavior and remaining scalar fields still need source parity.
- Documented description PUT values/errors, atomic writes, escaped/direct
  Unicode transport, native reopening and remaining scalar/lone-surrogate gaps.
- Completed: native card create/edit rejects a newly supplied unknown, foreign
  or inactive assignee using the active board roster under user/board/card locks.
  Unchanged stale assignees can remain while editing other fields; clearing is
  allowed. Copy/import restore historical values via guarded restoration paths,
  including old exports containing only the scalar assignee. Store regressions
  verify no partial card/lane/history on denial, reactivation and stale copy/
  import; full local tests and final extended store checks pass. Packaged
  Chromium verifies forged edits are rejected and the persisted assignee survives.
  Saved-card multi-assignee editor is implemented below; new-card roster picking
  and complete WeKan assignee/avatar workflow parity remain open.
- Documented native assignee roster validation, transaction checks, unchanged
  stale values, copy/import restoration, test evidence and remaining picker UI.
- Completed: native multiple-assignee editor from saved card details and card
  menus. Reuse Gambas tree/active-member choices/add/remove, existing translated
  captions and anchored mobile/X behavior. Additions recheck active targets;
  stale targets can be removed; ordered duplicates remain in data but render as
  one selectable row, and removal deletes all occurrences. General edits require
  write permission and visible-card scope; Worker self-assignment stays separate.
  Synchronize primary Assignee before subsequent Save; assigned-only self-removal
  closes the picker/details and refreshes the card out of the visible view.
  Store negatives verify reader/Worker/assigned scope and independent members;
  two new native-assignee failed-COMMIT/retry phases bring card-update phases to
  twelve. Full local tests pass (28 Python tests), and packaged two-user Chromium
  verifies add/remove/save/reopen, forged reader writes, self-removal and mobile
  menu placement/X. Complete original suites remain open.
- Documented saved-card multi-assignee controls, stale removal/duplicates,
  primary synchronization, role/self-removal behavior, twelve COMMIT phases and
  packaged Chromium/mobile evidence with original-suite gaps explicit.
- Pending assignee UI: active roster selection before first card save, avatars,
  full WeKan menu/keyboard/accessibility parity and complete original UI suites.
- Completed initial whole-board REST reads: lists, swimlanes, board/list card
  counts and active list cards with title/description/swimlane/assignees/order/
  UTC dates. Refuse nonmembers, inactive members, assigned-only and other source-
  excluded built-in/combined flags with 403; missing boards return 404. Match
  source global-administrator REST reads independently of board membership while
  preserving native board access and reset scoped authority after success, SQL
  failure and retry. Keep real empty strings through Collection.Add on Gambas
  3.20. Verify archive/empty/missing filters, independent SQL ordering (negative/
  zero ranks), exact text/dates, WITH_API=false and native-cookie boundaries.
  Original HashBleed/ErrorBleed/AssignedBleed pass unchanged; total spec 17
  callback coverage is 10/30. Packaged Chromium reads back actual PUT data and
  verifies the existing native multiple-assignee/member/date workflows.
- Documented whole-board read routes, source role/combined/global-admin checks,
  independent scope reset, empty text and archive/order/date behavior. Update
  current original callback coverage to 10/30 and retain full document/
  fractional-sort and complete-suite gaps.
- Completed list/card change tracking (#5251): portable Long UTC clocks in
  kb_item_changes; list modifiedAt changes on list document writes, while
  cardsModifiedAt is the newest known current-card time including archived cards.
  Empty/legacy-only lists return null; no current time is invented on reads.
  New lists/default lists, card edits/people/dates/details/files/timers, sort,
  list settings/archive, copy/import/move and account reference cleanup update
  clocks. Copies keep source clocks untouched and create fresh destination clocks;
  moves transfer scope, permanent deletion removes clocks and invalidates surviving
  cards whose relationships are removed. Personal star/watch metadata does not
  mark the list document. Card content/attachments/timers/archive/settings now
  commit with their clock/history changes and recheck permission under locks.
  Verify independent SQL/HTTP against the actual original list reducer, UTC clock
  bounds in UTC/Helsinki/New York/Kathmandu, native lifecycle/scope negatives,
  eight injected native clock-write rollback paths, existing twelve real card
  COMMIT rollback/retry phases with clock snapshots and packaged Chromium member/
  assignee/content/timer/file flows. Original spec 17 coverage stays 10/30.
- Documented independent list/card change times, legacy/empty nulls, UTC Long
  storage and lifecycle/transaction semantics. Describe source-reducer comparison,
  four-zone clock checks, eight native write-failure rollbacks, timestamp-aware
  COMMIT snapshots and packaged Chromium verification.
- Completed initial single-card GET: global /api/cards/:id includes archived
  cards; /api/boards/:id/lists/:listId/cards/:cardId reads only the active matching
  card. Check whole-board REST permission before scoped list/card validation and
  existence; preserve source 403/404 distinctions and scoped global admin cleanup.
  Return implemented IDs/text/swimlane/archived/order, independent ordered people,
  exact four UTC dates/change time and checklist/item arrays. Empty strings/arrays
  stay exact, checklists/items stay scoped by card/board, unrecorded deadlines are
  null and checklist creation dates use canonical UTC across Gambas date encodings.
  Verify nine roles plus combined/inactive flags, cookie/WITH_API boundaries,
  crafted foreign/stale checklist parents, missing/malformed scope privacy,
  TimeClip limits and read-only data/history/clock snapshots. Source/archive HTTP
  responses match the actual original cardWithChecklists on independent SQL inputs
  for implemented fields; SQL failure/retry resets native authority. Full local
  tests and packaged Chromium native checklist/checkbox/archive GET flows pass.
  Original spec 17 callbacks remain 10/30; these helper checks do not imply full
  original suite or full schema coverage.
- Documented global/scoped single-card GET distinctions, supported metadata/
  checklist fields, source permission-first handling and authority reset. Describe
  independent serializer/SQL/HTTP tests, UTC/type/role/canary boundaries and native
  Chromium checklist/archive verification; retain full-schema/deadline gaps.
- Pending read parity: complete board/card documents (including remaining source
  attributes and board-defined/admin-only custom-field behavior), checklist/item
  deadline editing/persistence,
  full fractional sort support, custom roles, legacy lane mapping,
  public/instance visibility and complete original UI/API/security suites.
- Completed REST write scope correction: a combined board-admin/assigned-only
  raw member row previously bypassed the canonical role-only check (reproduced
  unauthorized PUT 200). Check isNormalAssignedOnly/isCommentAssignedOnly/
  isReadAssignedOnly independently before general card writes and after locking.
  PUT text/date/people plus member/assignee add/remove now return 403 without
  writes; injected scope changes at the first board write roll back flags/data/
  history/clocks. Preserve source site-admin override and non-scope combinations
  such as admin+Worker/no-comments where the source canonical write role permits.
  Verify all 256 active built-in boolean flag combinations using actual source
  roleCan/memberRoleOf/isAssignedOnlyMember and persisted HTTP descriptions.
  Source/archive and full local tests pass; original spec 17 remains 10/30.
- Documented the raw assigned-only REST write restriction, source-compatible
  non-scope/admin controls, late-injection rollback and 256 active boolean flag
  comparisons. Keep native combined-scope/custom-role/list-exception gaps explicit.
- Completed archive/unarchive POST endpoints with authorization before scoped
  identifiers, lock/recheck, exact JSON missing/wrong-list/wrong-state 404s and
  repeat no-write behavior. Persist UTC archivedAt and retain it on restore;
  carry metadata through move/JSON and remove it on permanent deletion. Fresh
  copies do not inherit archive history; legacy unknown timestamps stay absent.
  Native same-board subtask graphs archive/restore atomically, deduplicate diamond
  and cyclic edges and exclude foreign-board references. Verify role/site-admin
  boundaries, late scope injection, descendant SQL rollback, timestamp/clock
  failures and four additional failed-COMMIT/retry phases. Full local test command
  passes, including 28 Python tests. Two of three original archive callbacks run
  unchanged with actual Playwright assertions and an explicit SQLite adapter.
  Original spec 17 remains 10/30; the separate archive file is 2/3.
- Documented archive/restore routes, retained UTC metadata, native graph and
  copy/move/JSON/deletion behavior, exact scope/state errors and verification.
  Packaged Chromium passes actual REST lifecycle/readback and explicit native
  board reopening; it does not establish automatic live synchronization.
- Archive live-board synchronization and its original UI callback now pass via
  the open-board watcher above. Full source parent/linked-card/cross-board
  hierarchy, list-level exceptions, custom roles and complete original
  UI/API/security coverage remain pending.
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
- Shared instruction files remain in the parent workspace; project-specific
  guidance is in docs/Development.md. Duplicate AGENTS.md/CLAUDE.md files were
  removed under the current parent repository instructions.
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
