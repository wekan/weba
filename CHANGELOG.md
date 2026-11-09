# Upcoming WeKan ® for Gambas release

This work adds the following features and fixes:

- Add persisted Global Admin-only board-creation policy under Visibility, default
  off. Apply fresh actor/policy locks and final checks to new boards, single and
  selected copies and JSON import, with complete hierarchy rollback on late flag
  or admin loss. Preserve existing edits/card copies/bytes. Hide denied actions,
  clear stale forms, retain pending-copy retry state and refresh clean settings
  without losing drafts; clear/reject revoked admin panes. Verify native negative/
  rollback/retry paths, 392 unchanged source policy/guard outcomes and real mobile/
  translated/forged browser flows. Keep template/system models, missing REST/DDP
  paths, generic Visibility and security eventlog/full original suites open.
  Thanks to xet7.

- Add eight selected-copy content controls with Select all/none, source parent
  dependencies, checkbox/keyboard semantics, mobile layout and source captions.
  Filter native layout/cards/labels/custom fields/checklists/comments/attachments
  before cloning; preserve independent card data, mapped parents/MIME/covers and
  completed copies when changing choices for pending-only retry. Validate/copy
  option objects and guard busy/stale changes. Verify 256 native content cases,
  2,104 unchanged source helper outcomes and mobile partial-retry browser behavior.
  Keep rules/integrations/scrum, board-defined label/field models, single-copy
  controls, creation/placement policy and full original suites open.
  Thanks to xet7.

- Add selected native board duplication with a private revision/account-bound
  per-form queue. Commit each board independently; retain successes and retry only
  unfinished boards after failure. Show progress, cancel and clear on completion;
  reopen selection actions after search without losing off-page selections.
  Require fresh admin/active scope and use source-style numbered titles with
  native length/safe-counter limits and exact integer suffixes. Verify native
  rollback/retry/forgery, 29 source title outcomes, six unchanged submit-callback
  queue stages and mobile/translated browser behavior. Import source Duplicate
  Board labels across 237 catalogs. Keep source per-field options, creation
  policy, missing content, durable batch recovery and full original suites open.
  Thanks to xet7.

- Require board administration for whole-board copies, matching source copyBoard
  authorization. Hide and guard nonmanager Copy; close and clear revoked forms.
  Lock actor/source, prepare links within the transaction and recheck identity,
  source authority/state and destination ownership/state before commit. Exclude
  retained deleted cards. Verify eight role negatives, exact binary manager copy,
  late role/source/destination and child SQL rollback, 13 unchanged source guard
  outcomes and real readonly/stale-save browser checks. Keep selected duplication,
  options, source title/creation policy and full original callbacks open.
  Thanks to xet7.

- Add the board-manager Attachments allowance checkbox with persisted default-on
  state, live native upload controls and existing bearer enforcement. Retain
  downloads/metadata/internal copies. Lock actor/board and recheck permission and
  saved value; roll back late role/value changes and SQL failures. Cover native
  role/schema negatives and real mobile/reload/API/stale-save browser flows.
  Anchor its shared popup; reposition class-only delayed native reveals and
  wait for mobile positioning before geometry assertions. Reproduce the observer
  defect with a failing-then-passing unit regression. Keep minicard/other board
  settings and original DDP/full-suite work open.
  Thanks to xet7.

- Add persisted Global Admin native/API upload/download controls with Unlimited,
  Maximum file size and Blocked modes and source GB/MB/Bytes conversions. Enforce
  fresh limits on native/API bytes and JSON exchange with atomic late-change
  rollback; retain metadata/internal lifecycle access and board upload allowance.
  Close and clear settings on admin revocation; translate labels from source.
  Verify 234 source-helper outcomes, native rollback, HTTP and mobile/translated
  browser controls. Keep the buffered 64 MiB ceiling and explicit avatar/storage/
  streaming/DDP/eventlog/full-suite TODOs. Thanks to xet7.

- Add attachment list/info/JSON and raw download APIs plus the legacy board-list
  alias. Match source membership and raw assigned-card scope, including global
  nonmember read denial and retained-file direct history reads. Keep listings
  live-only; return metadata/versions, exact bytes, zero/legacy values and UTC
  times with configured download bounds. Force safe Unicode-named downloads
  with sandbox/nosniff/no-store headers and private host-only filename metadata.
  Preserve binary CGI separator bytes across LF/CRLF header formats and match
  strict raw-query flags. Verify 192 unchanged source-handler outcomes, actual
  source/package HTTP and browser HTML non-execution/revocation, and host failure
  regressions. Streaming/storage/global-policy/DDP/eventlog parity stays open.
  Thanks to xet7.

- Make workspace keyboard browser checks wait for rendered IDs and parentage,
  including hierarchy changes whose visible name order stays the same. Reproduce
  the former dropped-next-key test race with delayed native replies after SQL
  commit; retain the delay and all move/focus/permission assertions. Wait for
  interception handlers during teardown. Source and packaged checks pass.
  Thanks to xet7.

- Add raw-byte and JSON/base64 card attachment uploads through the bearer API.
  Validate the canonical board/swimlane/list/card path, current writer/assigned
  scope and board attachment allowance before and after atomic writes. Preserve
  exact binary/Unicode names, MIME and UTC upload metadata; carry MIME through
  copy/exchange/moves and clean attributes during gated purge. Respect configured
  upload bytes with a 64 MiB cap and 96 MiB JSON safety bound; reject stalled or
  truncated request bodies before CGI with an absolute deadline. Report the real
  database backend and sanitize failures. Verify native policy/metadata rollback,
  source/package HTTP, 140 unchanged source-helper target/write outcomes and real
  native upload/download/revocation browsers. Streaming, additional storage/read
  APIs, settings controls, DDP and security-event reporting remain open.
  Thanks to xet7.

- Retain attachment bytes on ordinary native/API deletion; filter deleted files
  from card reads, downloads, copies and exports. Add native metadata-only
  attachment history/restore, idempotent actor/time/batch records and fresh
  readonly/assigned-card guards. Clear a deleted cover without restoring it;
  remap live covers on copy/JSON exchange and carry lifecycle scope on moves.
  Clean retained files/journals during gated container purge. Add the bearer
  attachment DELETE route with scoped site-admin permission, raw assigned flags
  and sanitized atomic failures. Anchor card menus to individual cards. Verify
  native rollback/legacy exchange, 12 unchanged source-plan SQL comparisons,
  real source/package API and native writer/reader browser regressions.
  Full attachment API/storage/security-eventlog and generic history/undo parity
  remain open. Thanks to xet7.

- Make ordinary native list deletion reversible: retain the list, active and
  archived cards, attachments and relationships under one actor/time/batch.
  Hide deleted rows from native/REST reads, counts, exports and destinations;
  restore exactly that batch while preserving earlier deletions and archive
  state. Add native deleted-list restore and batch-bound global purge controls,
  a source-compatible list DELETE API and non-reused batch allocation. Close
  legacy card/swimlane physical-delete flag bypasses. Verify SQL rollback/late
  role/state/scope/audit failures, 60 unchanged source lifecycle outcomes and
  source/packaged HTTP plus real desktop/mobile writer/readonly/admin controls.
  Full source history/undo, other delete lifecycles and new local caption
  translations remain open. Thanks to xet7.

- Gate permanent board deletion behind Global Admin plus an explicit default-off
  setting. Remove archived per-board delete actions and reject forged/legacy
  bypasses. Add revision-bound confirmed Archive batch deletion, bounded unique
  IDs, full-set archive validation, account/setting/sorted-board locks and fresh
  per-effect/final guards. Persist independent recovery setting/purge success and
  failure audits; roll back data and success audits together. Verify native late
  role/session/flag/state/audit and second-delete failures, retry and cleanup,
  55 unchanged original method outcomes including 200 boards, and real two-user source/package setting, confirmation, live revocation,
  selection and private literal Recovery controls. Full original suites and
  Recovery report/schema parity remain open. Thanks to xet7.

- Keep nullable native JSON export row keys instead of dropping them through
  Collection assignment. Verify raw description/assignee/labels/due/checklist
  fields, false flags and zero values, with a failing-before/passing-after test.
  The current driver's SQL empty-text/null normalization and broader original
  JSON/batch-export contracts remain separate work. Thanks to xet7.

- Add selected-board archive confirmation/cancel in the native sidebar. Bind
  confirmation to the private selection revision, cancel it on selection/scope
  changes and derive IDs on the server. Use the atomic batch archive service and
  clear selection only after success. Verify readonly whole-batch denial, stale
  confirmation, exact owner selection, reload and forged Archive events in real
  source/packaged browsers. Thanks to xet7.

- Add the native selected-board sidebar star toggle: fill missing stars in mixed
  selections and clear all when every selected board is starred. Use private
  selection IDs, current account/sorted board locks and final access checks.
  Keep personal stars independent and unchanged stars unwritten. Verify readonly
  controls, partial/final-access rollback and retry, source/package 30-board
  browser selection and disabled/Archive event guards. Remaining sidebar actions
  and complete original suites stay open. Thanks to xet7.

- Add native per-form board multi-selection controls and visible-page Select All,
  retaining selection across filtering, paging and categories. Use revisioned
  server-owned IDs for multi-drop transport; reject stale/private/off-page and
  selected-origin single-drop bypasses. Show group counts and prevent group grid
  reordering. Verify principal/session/form isolation, native mouse and trusted
  mobile touch, 25+5 paging and atomic denial after off-page access revocation.
  Batch sidebar actions, Home/group targets and complete original suites remain
  open. Thanks to xet7.

- Document the native mixed-state batch transaction and lock/scope/rollback
  evidence, including 156 original callback outcomes. Keep selection controls,
  authoritative native selection transport and full original suites open.
  Thanks to xet7.

- Add the native atomic DropBoards service for mixed active/archive selections.
  Preserve input order and acquire sorted board locks; validate the full set,
  each effect and final identity/target/read/manage/state before commit. Share
  mutation primitives with single drops. Verify SQL lock order, partial failure
  rollback/retry, late/final membership/target/restore-role denial and personal
  isolation. Expand original callback outcome comparison to 156 single/multi/
  mixed cases. Selection UI and multi-drop transport remain in progress.
  Thanks to xet7.

- Document single-board drop targets, sorted placement, atomic restoration and
  scope guards, with native failure/late checks, 52 original callback outcomes
  and source/packaged browser evidence. Retain multi/Home/full-suite limits.
  Thanks to xet7.

- Add single-board workspace/Remaining/add-only Starred/Archive drops with
  sorted-mode placement handles, confirmation and atomic restore+placement.
  Recheck read/manage, archive state and target ownership under locks; preserve
  personal isolation and roll back activity/global changes with failed placement.
  Keep assigned archived boards reachable in global Archive. Verify native SQL
  failures/late guards, 52 original callback-body outcomes and real source/packaged
  mouse/trusted touch, readonly/cancel/reload and private/reserved forgery checks.
  Multi-board/Home/group targets and full original suites remain pending.
  Thanks to xet7.

- Document native workspace pointer/keyboard ordering, transaction resolution,
  no-op/ownership guards, focus and 196-case source/real browser verification.
  Retain board drops, handle preferences and full original-suite limitations.
  Thanks to xet7.

- Add native workspace before/after/inside drops with fresh locked ownership,
  sibling and ancestor resolution and no-op rank-write avoidance. Support mouse
  name/handle, touch handle and logical keyboard sibling/indent/outdent moves,
  target marks and bounded focus recovery. Preserve fold/assignment state and
  reject cycle/foreign/stale/non-overview commands. Verify native partial failure
  rollback/retry, late parent denial, 196 original tree-helper comparisons and
  real source/packaged mouse/keyboard/trusted touch, cancellation, collapsed
  targets, reload/isolation and Archive behavior. Board drops remain pending.
  Thanks to xet7.

- Document private workspace fold storage and cleanup, direct readable counts,
  hidden selection, keyboard/focus/aria and native failure/source/browser tests.
  Update the translation count and retain original workspace/gesture limits.
  Thanks to xet7.

- Add private persisted workspace folding with native caret buttons, keyboard/
  focus support and translated named aria labels. Preserve a selected hidden
  descendant and show direct active readable board counts with helper exclusion.
  Refresh counts across placement/archive/access changes. Verify true-only
  storage, locked ownership checks, rollback/retry, cleanup and 25 comparisons
  against the original helper; exercise live/reload folding and counts in real
  source/packaged browsers. Original workspace gestures/callbacks remain open.
  Thanks to xet7.

- Document native workspace rows/forms, readonly placement, private live state,
  draft/revocation guards and literal user text. Record source/packaged browser
  checks, imported labels and the remaining form/gesture/original-suite gaps.
  Thanks to xet7.

- Add native nested workspace navigation and per-row menus, workspace/subspace
  creation, name/literal-icon edits, confirmed deletion and personal board
  placement including Remaining. Preserve dirty workspace drafts during external
  tree updates, refresh category placement and close revoked/stale panels; deny
  stale Save events. Import workspace labels into all 237 catalogs and protect
  user names from translation. Verify real source/packaged browser persistence,
  readonly isolation, live changes, Finnish/Latin labels and mobile popup/Escape.
  Original workspace callbacks, collapse/counts and drag parity remain pending.
  Thanks to xet7.

- Document the personal workspace service, private category semantics, stable
  IDs, transaction rechecks and cleanup evidence. Update page-method comparison
  coverage to 75 cases and retain native UI/gesture/original-suite limitations.
  Thanks to xet7.

- Add personal nested workspaces with rename/icon edits, cycle-safe moves,
  subtree deletion and private board assignments. Filter categories before page
  counts while preserving cross-category search and stars. Guard current-user
  ownership and fresh board access, keep stable IDs and clean account/board
  references. Verify rollback/retry, late permission changes, readonly isolation
  and 75 original page-method comparisons; native workspace UI remains pending.
  Thanks to xet7.

- Document header menu exclusion/navigation, Sort Escape/anchors, stable shared
  CSS placement and stylesheet/font rescheduling. Record desktop/mobile and
  delayed-width/teardown verification without changing original-suite claims.
  Thanks to xet7.

- Fix catalog sort popup exclusion with View/Account menus, overview navigation
  cleanup and Escape/trigger handling. Keep kanban.css in stable bootstrap so
  repeated Visual refreshes do not invalidate measured popup sizes; reposition
  after stylesheet/font completion and guard document teardown. Verify actual
  desktop/mobile menu transitions, unchanged sort/search drafts, delayed-width/
  async-error checks and full local/live/layout regressions. Thanks to xet7.

- Document personal Custom rank merging, readonly organization, sorted/archive
  guards, transaction rechecks, cleanup and expected-order keyboard focus. Record
  native rollback/late-guard and trusted source/packaged gesture evidence while
  retaining workspace/multiselection/original-suite and collation gaps.
  Thanks to xet7.

- Add personal Custom board ordering with mouse surface/handle, trusted touch
  handle and repeatable keyboard moves. Merge filtered ranks, refresh personal
  views, retain expected keyboard focus and isolate readonly members' preferences
  from shared history/activity and other users. Recheck mode/session/boards under
  transaction locks and clean account/permanent-board references. Verify native
  write-failure rollback/retry, original helper/merge comparisons and real
  source/packaged gestures/forgery/privacy; full local/live tests pass. Import
  Custom translations across 237 catalogs; workspace/original-suite gaps remain.
  Thanks to xet7.

- Document native catalog controls, separate board/card search, pre-render page
  updates, persisted/cross-session sort state, unpaged Custom fallback and browser
  evidence. Retain manual ordering, workspace/original-callback and unmatched
  translation requirements. Thanks to xet7.

- Wire native board sort/search/paging controls to BoardCatalog: saved A-Z/Z-A
  choices, visible active state, live name search/clear, 25-result pages, external
  preference changes and page clamping. Keep Custom unpaged with title fallback;
  manual drag order remains pending. Update controls before rendering and import
  matching WeKan labels across 237 catalogs. Verify source/packaged native browser
  privacy, reload, paging, mobile/Finnish and existing live/layout regressions;
  full local tests pass. Workspace/original-suite gaps remain. Thanks to xet7.

- Document the native board catalog service, effective principal, bounded
  results, UTF-8 search and preference cleanup. Describe the 54-case original
  method comparison and its SQL adapter, plus pending UI, raw-JSON, custom order,
  workspace/facet and full original-suite contracts. Thanks to xet7.

- Add the native current-user BoardCatalog paging and sort-preference service.
  Guard visible boards, literal UTF-8 search, personal stars, stable title/ID
  sorting and bounded returned pages; clear preferences on account deletion and
  recreation. Verify native negative/205-board limits and 54 results against the
  original getAllBoardsPage body, plus full local and live regressions. UI controls,
  custom/workspace categories and full original suites remain open. Thanks to xet7.

- Document overview snapshot visibility, personal-star isolation, navigation
  refresh ordering and stable idle DOM. Record native/two-user verification and
  keep original All Boards sorting/search/pagination and other-view reactivity
  requirements explicit. Thanks to xet7.

- Refresh All Boards, Starred and Archive tiles/navigation after external native
  title/color edits, membership grants/revocations and board archive/restore.
  Compare private read-only scoped snapshots, preserve unchanged tile DOM and
  isolate unreadable cards and other users' stars. Add native scope/privacy and
  real two-user source/packaged browser tests. Original sorting/search/pagination
  and full suite parity remain open. Thanks to xet7.

- Document private live people snapshots, home roster checks, preserved choices
  and invitation drafts, role updates and missing/revoked target cleanup. Record
  native/two-user test scope and remaining full source reactivity/suite gaps.
  Thanks to xet7.

- Synchronize native card member/assignee and board roster panes, including home
  rosters. Preserve valid choices and invitation drafts, clear vanished targets,
  refresh roles/capabilities and clear revoked card people fields. Add private
  deterministic read snapshots, native scope tests and two-user source/packaged
  browser checks for external edits, duplicate display, forged readonly denial,
  assignment loss, removal and demotion. Full local/member/detail checks pass;
  full original UI/API/security suites remain pending. Thanks to xet7.

- Keep the color action dialog within mobile viewport height. Verify existing
  WeKan preset palettes, custom picker/hex synchronization and persistence with
  the packaged-app browser test. Thanks to xet7.

- Document current relationship display titles, generated read-only fields and
  editable new-subtask creation, read-side stability and guarded row/selection
  paths. Record native/two-user rename/scope evidence and remaining full source
  hierarchy/metadata/navigation work. Thanks to xet7.

- Fix stale native dependency/subtask names after target card edits. Derive live
  rows and selected values from authorized current target titles, preserve
  read-only generated labels and new-subtask creation, and leave stored cache/
  history untouched on reads. Verify native scopes/reauthorization and two-user
  source/packaged renames, target visibility loss/reappearance and existing detail
  regressions. Full source hierarchy/metadata/navigation remain open.
  Thanks to xet7.

- Document live detail snapshots, dirty/clean fields, deletion and missing-parent
  behavior, binary-free files, author/role/type safeguards and entry merge/retry.
  Describe native/two-user source/packaged evidence and twenty card-update COMMIT
  phases; keep people/linked-label/full-original-suite gaps explicit.
  Thanks to xet7.

- Add live refresh for existing native detail panes with scoped binary-free
  snapshots, preserved dirty fields and updated clean selected values. Merge
  entry drafts under locks; preserve author/role guards, reject unsafe type
  changes, clear deleted selections and avoid retargeting a missing checklist.
  Exclude foreign/orphan native relationships, handle nullable timer fields and
  retry failed pane builds. Verify native/two-user source/packaged browser cases,
  file/parent/delete/scope behavior and two real entry COMMIT/retry phases (20
  card-update phases total), retaining full original-suite gaps. Thanks to xet7.

- Document private native editor baselines, changed-field merge and grouped
  placement, explicit last-write/clears, people/date retention and menu/retry
  behavior. Record browser data-loss reproduction, native lock/negative checks
  and eighteen card-update COMMIT phases, preserving complete editor/original-
  suite gaps. Thanks to xet7.

- Fix stale native card editors overwriting unrelated concurrent changes. Keep
  server-side opening values and merge only differing fields over the current
  locked/reauthorized card; preserve other descriptions, moves, people and precise
  dates. Keep explicit last-write/clear behavior, advance committed menu/people
  baselines and refresh after success. Verify the prior browser data loss,
  independent fields, late-lock merge, invalid/archive/role denial and two real
  failed-COMMIT/retry phases (18 total), plus source/packaged live and native
  people/date/details browser regressions. Thanks to xet7.

- Document open-board heartbeat/private-state semantics, capture-before-render,
  draft/DOM preservation and revoked-panel cleanup. Explain test-live source/
  packaged execution of all three original archive callbacks, additional browser
  evidence and remaining polling/deep-pane/full-suite work. Thanks to xet7.

- Add open-board live updates with a native Gambas timer and private read-only
  permission-scoped state for visible cards/layout/metadata/role capabilities.
  Preserve permitted unsaved input and stable DOM on unchanged ticks; close and
  clear stale panels after archive, assignment loss or board revocation. Add
  build.sh test-live for source/packaged real Playwright pages, running all three
  original archive callbacks unchanged. Verify drafts/DOM/revocation, scoped
  native state and packaged details/membership/account-deletion regressions.
  Full source reactivity, deep panes and idle polling work remain open.
  Thanks to xet7.

- Document native raw assigned-only scope versus canonical capabilities and
  scoped REST administration, inactive/cleared-flag behavior, 256 source-backed
  native cases and packaged response/context privacy checks. Keep custom roles,
  list exceptions and complete original-suite gaps explicit. Thanks to xet7.

- Fix native combined board-admin/assigned-only flags bypassing card visibility.
  Narrow all shared card queries/checks by raw assignment flags independently of
  canonical role capabilities; retain the explicit scoped REST site-admin
  override, with no native override. Reproduce the prior bypass and verify hidden
  cards/comments/files/relations/export/history/writes, assigned writes, inactive
  denial and cleared-flag recovery. Compare 256 active combinations with original
  source functions and real native queries; packaged two-user Chromium verifies
  all three flags, response packets and forged contexts. Thanks to xet7.

- Document archive/restore routes, retained UTC metadata, native graph/lifecycle
  semantics, role/error/rollback contracts, sixteen card-update COMMIT phases,
  two original archive callbacks and packaged Chromium REST/native readback.
  Keep live UI synchronization, cross-board hierarchy, list exceptions and full
  original-suite gaps explicit. Thanks to xet7.

- Add guarded card archive/unarchive POST routes with JSON scope/state errors,
  persisted UTC archive times retained by restore and atomic same-board native
  subtask cascades. Preserve metadata through move/JSON and clear it on permanent
  deletion; keep fresh copies and unknown legacy timestamps distinct. Verify
  cycles/diamonds/foreign references, roles/late scope checks, SQL rollback and
  four additional real failed-COMMIT/retry phases. Run two unchanged original
  archive callbacks with explicit SQLite fixtures; live board synchronization,
  full source cross-board hierarchy and list exceptions remain open.
  Thanks to xet7.

- Document raw assigned-only REST write restrictions, canonical non-scope/admin
  controls, late-injection rollback and the 256 active boolean flag matrix against
  original source functions and persisted data. Keep native/custom-role/list
  exception and full-suite gaps explicit. Thanks to xet7.

- Fix combined board-admin/assigned-only flags bypassing general card REST
  writes. Check all three raw assigned-only flags before mutation and again under
  locks for PUT and member/assignee merge/pull routes; retain the explicit site
  administrator override and source-compatible non-scope combinations. Reproduce
  the prior unauthorized 200, then verify no data/history/clock writes on denial,
  late injected-flag rollback and all 256 active built-in boolean flag combinations
  against actual source functions and persisted HTTP results. Native/custom-role
  and remaining archive endpoint parity remain open. Thanks to xet7.

- Document single-card GET routes, archived/scoped permission behavior, supported
  card/checklist fields, UTC/type/role isolation and SQL/source-serializer/browser
  verification. Preserve full schema/custom-field/deadline gaps and the unchanged
  ten-of-thirty original spec 17 callback count. Thanks to xet7.

- Add single-card GET at global and board/list paths with source whole-board
  permissions, permission-before-scoped-ID/card lookup, scoped admin reset and JSON
  missing-card errors. Global GET includes archived cards; scoped GET requires
  an active matching card. Return implemented fields, raw ordered people, precise
  UTC dates/change time and scoped checklist/item arrays with nullable deadlines.
  Reuse the original cardWithChecklists serializer as an SQL-backed oracle;
  verify roles/combined/inactive flags, canary isolation, Date limits, cookie/API
  gates, SQL failure/retry and packaged native checklist/archive Chromium flows.
  Full document/custom-field and deadline parity remain open. Thanks to xet7.

- Consolidate project-specific source/toolchain/database/verification notes in
  docs/Development.md and link them from README. Remove companion AGENTS.md and
  CLAUDE.md copies as required by the containing WeKan root instructions, keeping
  shared policy at that root and weba details in its own documentation.
  Thanks to xet7.

- Document #5251 list/card clock semantics, UTC storage, legacy/empty nulls,
  lifecycle and transactional writes. Describe source-reducer/SQL/HTTP comparison,
  four-zone clock verification, eight native write-failure rollback paths,
  timestamp-aware COMMIT snapshots and packaged Chromium coverage. Thanks to xet7.

- Track independent list/card UTC modification times for #5251 using portable
  Long fields. Return list modifiedAt and newest cardsModifiedAt, including
  archived cards; preserve null for empty/untimed legacy data. Cover creation,
  edits, ordering, settings, archive, copy/import/move, user cleanup and relation
  cascades. Keep personal preferences/source-copy clocks separate. Make card
  detail/file/timer and metadata writes transactional with locked permission
  rechecks. Verify the actual source reducer against HTTP/SQL, four time zones,
  eight native clock-write rollback paths, timestamp-aware COMMIT snapshots and
  packaged Chromium editor/content workflows. Full suites remain open.
  Thanks to xet7.

- Document whole-board REST routes, source role/combined-flag checks, independent
  global-administrator reads, native scope isolation and exact text/order/date
  results. Record ten-of-thirty original callbacks and SQL/browser verification;
  retain full document, list timestamp, fractional-sort and complete-suite gaps.
  Thanks to xet7.

- Add REST whole-board lists/swimlanes/card-list/count reads with WeKan's
  built-in role/combined-flag checks and scoped global-administrator access.
  Refuse nonmembers and assigned-only roles with 403, return missing boards as
  404 and preserve native permissions after success/failure/retry. Keep active
  archive filters, ordered card/assignee/date projections and exact empty strings.
  Execute unchanged HashBleed/ErrorBleed/AssignedBleed assertions in addition to
  existing original callbacks. Verify independent SQL results, malformed/missing
  targets, API gating and packaged Chromium PUT-to-GET/native interaction.
  Full board documents, list activity timestamps and complete suites remain open.
  Thanks to xet7.

- Document the native multiple-assignee entry points, active/stale choices,
  immediate changes, primary synchronization, reader/Worker rules and assigned-
  only self-removal. Record twelve COMMIT phases and packaged Chromium/mobile
  evidence while preserving new-card/avatar/original-suite gaps. Thanks to xet7.

- Add a native Gambas multiple-assignee editor from saved cards and card menus,
  reusing the member tree, active-member picker, anchored mobile popup, X and
  translated captions. Add/remove atomically with permission/card checks under
  locks; preserve independent members and ordered duplicate semantics. Synchronize
  the scalar primary before later saves and close inaccessible details after
  assigned-only self-removal. Verify store negatives, twelve card-update COMMIT
  phases and packaged two-user Chromium persistence/forgery/mobile checks.
  New-card roster picking and full original suites remain pending. Thanks to xet7.

- Document native assignee roster checks, unchanged historical values and
  authorized copy/import restoration, with store/browser evidence and remaining
  picker UI gaps. Correct the leading TODO coverage summary to seven original
  callbacks, leaving the other 23 explicitly unexecuted. Thanks to xet7.

- Reject new native card assignees outside the active board roster inside the
  card-save transaction, rechecking after user/board/card locks. Preserve an
  unchanged retired assignee, allow clearing and retain historical assignments
  through the authorized copy/JSON restore paths. Verify unknown/foreign/inactive
  create/edit denial without partial cards/lanes/history, reactivation, stale
  copy/import and packaged Chromium forged-assignee persistence boundaries.
  Full original suite parity remains pending. Thanks to xet7.

- Document description PUT values, strict errors, atomic updates, native text
  reopening and the escaped emoji transport fix. Record direct/escaped Unicode
  HTTP and combined COMMIT verification while keeping remaining API/scalar and
  lone-surrogate gaps explicit. Thanks to xet7.

- Add card PUT description strings, empty/null clears, omitted preservation
  and strict type errors inside atomic people/date updates. Preserve Unicode,
  whitespace and literal HTML; forward valid escaped supplementary characters
  as UTF-8 to prevent Gambas 3.20 emoji loss. Verify role/list/archive boundaries,
  partial-write rollback, real failed-COMMIT/retry snapshots and packaged
  Chromium native-editor reopening. Full scalar/API parity remains pending.
  Thanks to xet7.

- Document four card date fields, clears/invalid skips, atomic people/date
  writes, numeric precision handling, UTC native day projection and remaining
  date-editor/parser gaps. Record seven-of-thirty original callbacks, 44 source
  helper cases, ten COMMIT phases and packaged Chromium verification.
  Thanks to xet7.

- Add card PUT receivedAt/startAt/dueAt/endAt UTC instants with millisecond
  precision, explicit clears, invalid-date skips and atomic people/date changes.
  Preserve instants through native day edits, copy/move/JSON and deletion;
  normalize numeric JSON dates before Gambas decoding to prevent precision loss.
  Verify 44 cases against original date helpers, original #5846, source/archive
  HTTP and ten real card-update failed-COMMIT/retry phases. Local-time/freeform
  parsing and full native date/time controls remain pending. Thanks to xet7.

- Document card people PUT normalization, ordered duplicates, partial field
  support, legacy archived/no-op behavior, native row/self-unassignment rules,
  eight card-person COMMIT phases and API-enabled Chromium verification. Keep
  six-of-thirty original callback coverage and remaining API gaps explicit.
  Thanks to xet7.

- Add card PUT members/assignees replacement with explicit clear/coercion,
  active-member filtering, omitted-field preservation and exact ordered duplicate
  values. Preserve empty JSON keys on Gambas 3.20 without accepting undefined
  syntax. Keep unique permission relations and legacy fallback reads; carry and
  clean raw sequences throughout the native lifecycle. Keep merge additions
  idempotent and remove every occurrence on pull/native self-unassignment;
  show one native member row per person. Match legacy archived PUT/no-op and
  empty-body responses; reject unsupported card fields explicitly. Verify the
  unchanged original #3697 callback, source/archive role/normalization/rollback
  cases, eight real card-person failed-COMMIT/retry phases and packaged Chromium
  PUT/native interaction. Full original suite parity remains pending. Thanks to xet7.

- Document native card-member editing, role/assigned scope, active/stale
  choices, independent assignees and popup behavior. Describe native/REST
  COMMIT checks and update the imported interface-key count. Thanks to xet7.

- Add native Gambas card-member editing from saved cards and card menus, with
  active add candidates, ordered members and stale removal. Keep assignees
  separate, permit assigned writers only on readable cards and deny reader/
  Worker or forged changes on the server. Recheck permission/scope under locks.
  Reuse anchored mobile popups, X buttons and WeKan Font Awesome icons; import
  the Add caption verbatim for 237 languages without translating user data.
  Verify native negatives, two-session packaged Chromium persistence/removal/
  forged requests/mobile layout and native add/remove failed-COMMIT retries.
  Full original suite parity remains pending. Thanks to xet7.

- Document card members/assignees merge routes, ordered independent fields,
  active/stale targets, REST role restrictions, lifecycle/rollback verification
  and exact five-of-thirty original callback coverage. Keep native card-member
  editor, card PUT/bulk and complete suite gaps explicit. Thanks to xet7.

- Add separate card members and assignees merge REST routes with active-member
  validation, stale removal, deduplication, persisted append order and source
  role/full-card-scope rules with
  tightly scoped site-admin writes. Reject foreign list/board and archived-card
  targets. Preserve members through copy/move/JSON; clean account/card/board and
  historical identity references without granting assigned-only visibility.
  Verify an additional unchanged original spec 17 callback, native lifecycle,
  source/archive role negatives, sanitized database-error rollback and four real
  failed-COMMIT/retry phases. Card member UI, array PUT/bulk contracts and full
  original suite parity remain pending. Thanks to xet7.

- Document REST user deletion, site-admin/self-delete policy, committed
  responses, retained content, rollback verification and exact original-test
  adapter coverage. Record packaged native deletion regression verification.
  Thanks to xet7.

- Add site-admin-only REST user deletion with an authoritative committed result,
  deleted-ID reply and repeat/missing 404 responses. Reuse atomic privilege and
  session/token cleanup while preserving attributed content; retain native
  self-delete protection and match REST administrator self deletion. Verify
  denied-request snapshots, real HTTP database-error rollback/sanitization,
  source/archive contracts and the unchanged original spec 17 deletion callback.
  Full original UI/API/security suites remain pending. Thanks to xet7.

- Document inactive member API rows, activation rules, native re-invitation,
  preferences/identity cleanup and four-phase transaction failure tests. Keep
  stable identity, complete roster metadata and full-suite gaps explicit.
  Thanks to xet7.

- Retain removed board memberships as inactive API rows with non-admin flags.
  Deny access and administrator counts despite stale owner/member pointers;
  keep inactive role updates inactive and require explicit add to reactivate
  with replacement flags. Preserve preferences and transact audit history;
  clean retained identities on account/board deletion and username recreation.
  Verify native negatives, source/archive API contracts, three unchanged
  original callbacks, four real failed-COMMIT rollback/retry phases and packaged
  browser re-invitation. Full original suite parity remains pending. Thanks to xet7.

- Document membership REST routes, named/legacy roles, scoped administration,
  explicit REST recovery, role/preference migration and test commands. Explain
  the original-callback fixture adapter, reference dependencies and remaining
  identity/inactive-roster/full-suite gaps. Thanks to xet7.

- Add membership REST add/remove/role routes with WeKan named aliases, ordered
  legacy flags, combined flag retention and active-member add idempotency.
  Serialize roles/flags/history together, synchronize native role changes and
  clean flags on account/board deletion. Return minimal board rows, preserve
  self-admin bits and protect the final administrator. Scope site-admin member
  changes explicitly, including orphan-board recovery; materialize legacy owners
  without losing personal preferences. Verify source/archive contracts, authority
  cleanup, real failed-commit rollback/retry and three unchanged original WeKan
  spec 17 membership callbacks with a SQLite fixture adapter. Its other 27
  callbacks and full UI/API/security parity remain pending. Thanks to xet7.

- Prevent same-name accounts from reclaiming deleted users' board ownership,
  memberships, personal preferences, assignments or comment/timer privileges.
  Clean current and historical dangling references transactionally; keep other
  members/assignments, comments, binary files and history, retaining author names
  as display-only provenance and stopping orphan timers. Preserve comment/file
  authors in copies, retain display-only names in JSON exchange, and carry/prune
  provenance on moves/permanent deletion. Protect the last active board admin
  and reject invalid imported author metadata. Verify real
  store negatives, failed-COMMIT snapshots, packaged admin delete cancel/confirm,
  same-name re-registration and denied predecessor edits. Thanks to xet7.

- Redirect revoked native browser sessions before command dispatch. Return a
  login reload instead of throwing from the form event, which made Gambas drop
  queued navigation and display an alert/backtrace. Verify no stale write or
  alert and real browser login navigation after account deletion. Thanks to xet7.

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
