# Upcoming WeKan ® for Gambas release

This work adds the following features and fixes:

- Add a native manager view-order list with desktop handle dragging, trusted
  touch, Up/Down keyboard moves and retained focus/scroll. Use the source's two
  distinct algorithms: drag fills only offered slots, while keyboard insertion
  steps past instance-disabled views. Filter editor rows/default choices by
  current instance availability while retaining all 40 stored entries and hidden
  defaults; show an unselected placeholder for an unavailable default instead of
  implying a replacement. Stage changes in the private batch draft until Save.
  Bind commands to actor/session/current readable board/raw-manager authority and
  captured draft revision; refuse stale, hidden, closed, demoted and readonly
  events, invalidate on feature changes and clear private state on close. Cancel
  Escape/outside/multitouch/DOM teardown without writes; ordinary scrolling stays
  native. Import 269 source keys across 237 catalogs. Verify 7,200 unchanged-source
  drag/move outcomes, gesture cleanup and real filtered/default/draft/Save/focus/
  replay/role/feature/Finnish/mobile browser behavior. The full local suite
  (69 host tests) and complete source/packaged browser suites pass against final
  code. Execute original sortable
  stop and keyboard callbacks through explicit native command adapters. The native
  handle list and batch Save are adapters; the original jQuery/Blaze/Meteor popup,
  shared showDragHandles preferences and remaining source view renderers stay open.
  Thanks to xet7.

- Preserve all 40 normalized board-view entries, public/private defaults and
  order through whole-board native export, empty/full-option copy and weba-2
  import. Keep personal preferences, instance feature policy, permissions and
  source actor/time attribution out of the transfer; install once on the new
  actor-owned destination with fresh owner/session/admin checks and attribution.
  Guard source/destination policy stability and roll back all new rows on policy
  write, owner, source-policy, destination-policy or session failure; retain UI
  copy drafts for opaque-error retry. Recheck schema after enclosing dialog/
  batch transactions roll back new DDL so first-operation retries work; exports stay pure
  reads. Legacy bundles without policy retain defaults, and normalized legacy
  hidden defaults retain their meaning. Card/list/lane exports omit whole-board
  policy and reject injected policy on subset import. Verify native scope,
  authority/preferences/global isolation and rollback, 44 unchanged-source copy/
  export body comparisons, and real readonly download, empty-option copy,
  failure/retry, own private import, reload and Finnish/mobile file upload.
  The full local suite (69 host tests) and complete source/packaged browser
  suites pass against final code, including first outer-dialog schema rollback
  and retry.
  Native weba-2 imports preserve policy while the current original WeKan
  createBoardAndLabels drops it (42 source fixtures); the original-format import
  bridge and full source child/storage/transport integration remain pending.
  Thanks to xet7.

- Add instance feature policy and a bound site-admin form for all 16 source
  feature groups, per-group descriptions/decisions, approval of new catalog
  entries, admin previews and pilot usernames. Match strict source booleans,
  known-key snapshots, unknown-user results and bounded Unicode name parsing.
  Persist settings/pilots atomically with actor/generation/admin rechecks, retain
  dirty drafts and refresh clean forms, clear private pilot fields on close or
  demotion, and keep failed writes opaque and retryable. Pure reads create no
  feature rows; account deletion/recreation clears pilot privileges. Apply fresh
  availability to signed-in/guest board menus/fallbacks and native off-board
  menus, refusing disabled forged choices without preference writes. Retain
  personal view choices and mounted drafts; core Lists/Swimlanes stay available
  and preview never grants board reads or editing. Import 268 source keys across
  237 catalogs. Verify native store/scope/rollback/lifecycle behavior and 1,809
  unchanged-source feature decision/modifier/pilot cases. The complete local
  suite (69 host tests) and complete source/packaged browser suites pass,
  including all retained decisions, previews, board/off-board forgery refusal,
  draft preservation, fault/retry, dirty/clean refresh and Finnish/mobile.
  Native empty textarea
  values use an explicit null-to-empty-list form adapter; strict service input
  still rejects null. Other source renderers/non-view feature actions, card-field
  policy, original admin page layout and Meteor methods/publications remain
  pending.
  Thanks to xet7.

- Apply board-view public/private audience, ordered visible choices and fallback
  defaults to signed-in native board rendering, navigation, menu opens, live
  updates and temporary add-card layouts. Active membership selects the private
  side regardless of role flags; public nonmembers and removed members use the
  public side, and site-admin status does not invent membership. Preserve saved
  choices while hidden so re-enabling a view restores them, and refuse forged
  hidden choices without preference writes. Keep mounted unsaved card drafts
  during policy changes. Fix Table/report card links using their own popup
  anchor when no Kanban card wrapper exists. Verify native audience/read scope,
  429 unchanged-source snapshot/request/presentation cases across all 40 keys,
  and real readonly/member/nonmember, live membership/policy, ordering, draft,
  reload and Finnish/mobile browser behavior. The full local suite (69 host
  tests) and complete source/packaged browser suites pass. Fixture cleanup
  removes dedicated users and makes their board private so discovery is isolated.
  Availability is the six native
  renderers; original instance feature flags, other renderers and full Meteor
  profile/publication/ReportPages integration remain pending.
  Thanks to xet7.

- Persist private current-user board-view preferences with per-board choices
  ahead of a shared fallback and core default. Retain all 40 known source view
  IDs, ignore invalid legacy fallbacks and preserve unsupported choices behind
  the six-view native renderer adapter. Allow readonly personal choices without
  granting board access; guard own writes with actor/generation checks and
  rollback. Reads do not initialize storage. Apply preferences on native view
  switches, board/card entries, reload, restore/copy/import/Home destinations
  and live peer changes while preserving mounted card drafts. Keep intentional
  add-card layout changes temporary. Clean user preferences on account deletion/
  recreation and selected board purge without touching other users/boards/shared
  rows. Verify native scope/fallback/rollback/lifecycle cases and compare 450
  native reads with unchanged source preference setter/reader bodies. Real UI
  tests cover readonly selection, board/shared/user isolation, reload/route/peer
  state, fresh-board shared fallback, unsaved drafts, opaque failed-save/retry
  and Finnish/mobile behavior. Clean fixture memberships after browser checks
  so later catalog/selection tests retain their original page composition.
  The complete local suite (69 host tests) and complete source/packaged browser
  suites pass against final code.
  Native SQL IDs/profile-map and absent browser/pending/publication layers are
  explicit adapters. Signed-in public/private policy enforcement, browser/profile/
  DDP bridges and remaining source views remain pending.
  Thanks to xet7.

- Add a bound native manager editor for all 40 board views: public/private show
  flags, separate defaults and up/down ordering, with retained per-view drafts.
  Keep defaults shown, save only changes from the baseline and preserve unrelated
  concurrent settings. Refresh clean forms live and retain dirty forms; guard
  every event/save by current readable board, raw-admin authority, actor/session
  generation and navigation context. Clear private state/selectors on close or
  revocation and refuse forged opens, replayed saves, navigation and demotion.
  Integrate anchored popup/Escape/mobile lifecycle, literal board titles and
  source captions across 229 keys/237 catalogs. Keep failed writes atomic with
  opaque errors and retained drafts for retry; verify native delta-only merge,
  both visibility sides/defaults/order directions, live guest changes, clean/
  dirty refresh, fault/retry and readonly/stale/translated/mobile browser cases.
  The complete local suite (69 host tests) and complete source/packaged browser
  suites pass against final code.
  This is a native per-view batch form. Signed-in view-policy rendering, instance
  feature filtering, drag ordering/original popup callbacks, policy copy/import
  and remaining original source integration remain pending.
  Thanks to xet7.

- Add authenticated GET/PUT `/api/boards/:boardId/boardViewSettings` with the
  source normalized 40-view snapshot and partial-write rules. Keep whole-board
  GET raw-role scope separate from active raw-isAdmin/site-admin PUT authority;
  public visibility and UI cookies grant no REST access, while assigned board
  admins can update settings under the source management rule. Recheck bearer,
  actor/generation/role/owner and written state before atomic commit. Accept
  JSON/form structured fields, defaults-before-hide, null/boolean coercion and
  normalized JSON/CSV order; preserve duplicate form-value semantics. Work
  around Gambas reused-decoder null loss through route-specific host transport
  normalization, strict JSON and exact source whitespace/coercion decisions.
  Reject malformed/no-recognized/default-hide requests with sanitized errors;
  keep legacy GET free of policy initialization and roll back late token/role
  loss and injected SQL failure. Compare 536 actual HTTP outcomes with unchanged
  source route/Authentication bodies over all 256 raw flag sets and additional
  scope/coercion cases, with explicit SQL-ID/owner/bearer/cache/logger adapters.
  The complete local suite (69 host tests), focused source/packaged API checks
  and focused source/packaged guest browser suites pass.
  Manager UI, signed-in policy rendering, instance feature/copy/import, custom
  role/OAuth/DDP/eventlog and full original source integration remain pending.
  Thanks to xet7.

- Persist native board-view policy for all 40 source views: separate public/
  private visibility and defaults, source order normalization including older
  defaults, source boolean coercion and default-before-hide validation. Guard
  manager writes under actor/board locks with final identity/generation/owner/
  role/state checks and rollback; keep legacy policy reads free of schema/row
  initialization. Expose only available public view names/default to anonymous
  readers, enforce live hiding/order/current-view fallback and default-on-entry/
  reload in the guest form, and recheck hidden-control clicks. Preserve valid
  current views when only the default changes. Register policy with atomic board
  purge and preserve unselected policies. Verify native scope/no-write, invalid
  default, readonly/anonymous, attribution, failed write/retry and late owner/
  principal rollback; compare 188 native cases with unchanged source snapshot/
  request helpers and test live guest policy controls and navigation in browser.
  The complete local suite (66 host tests) and focused source/packaged guest
  browser suites pass.
  Native renderer availability is an explicit four-view allow predicate; source
  metadata retains every view. Manager editing UI/REST, signed-in consumption,
  instance feature policy, copy/import integration and original Meteor actions
  remain pending.
  Thanks to xet7.

- Expose read-only native Lists, Swimlanes, Table and due-day Calendar in the
  guest form using four fixed own-control click handlers and fresh public/card
  read checks. Keep the current view while opening/closing cards and moving
  through same-board history; hide controls and content on permission loss and
  restore through guarded Refresh. Translate the fixed controls without changing
  the 186-key/237-catalog inventory. Make shared Table/Calendar/Gantt report
  card titles real canonical anchors with routing IDs and literal-text protection,
  retaining keyboard/new-tab/history behavior and the current mounted view.
  Verify closed command shapes/foreign setter refusal, report links/HTML safety,
  and real guest view switching, dated/undated Calendar/month navigation/idle
  stability, translated fixed labels/literal titles, mobile and live privacy.
  The complete local suite (66 host tests) and focused source/packaged guest
  browser suites pass.
  Source board/instance view visibility/default/order, other guest views, full
  source calendar/date models and original Meteor view actions remain pending.
  Thanks to xet7.

- Add guarded native public attachment downloads and guest file links. Require
  canonical GET paths, current public-board/exact file-card scope and verified
  UI-cookie assigned-member scope independently of native GUI ownership; keep
  removed-member/public reads and source file-server site-admin distinction.
  Preserve retained direct files while live lists hide deletion. Share pure
  native block/size reads with API-size/environment fallback and a 64 MiB ceiling,
  leaving missing settings tables/rows absent; hide unavailable links, preflight
  and bound byte fetches, then recheck scope/policy/actual size. Force attachment
  octet-stream, safe Unicode filename headers, sandbox/nosniff/no-store and no
  API/callback/upload or query-command authority. Test binary/zero/name data,
  foreign/assigned/raw/removed/admin scopes, retention/privacy and no writes.
  Real source/packaged guest browsers cover forced download/no execution,
  headers/path/method/command guards, live policy/assignment/privacy and absent
  or unrelated GUI cookies. Compare 64 signed native HTTP cases plus anonymous
  reads with unchanged universal authorization/assigned-file helper bodies,
  with explicit UI-cookie/source-token, SQL-ID/cache and no-op log adapters.
  The complete local suite (66 host tests) and focused source/packaged guest
  browser suites pass against final code.
  Full source storage/streaming/Sandstorm/eventlog, cover/background/map and
  original Meteor file actions remain pending.
  Thanks to xet7.

- Show live selected-card guest attachment names and scoped author/time metadata
  through a fixed-column read that excludes file bytes. Match the current public
  board/card and exact soft-deletion scope, preserve empty missing-schema reads
  without initializing stores, and bind retained authors to file kind/ID/board/
  card. Render escaped literal filenames beneath the existing translated
  Attachments heading, with no preview/download/upload or mutation target.
  Retain idle DOM and remove metadata live after deletion or access loss. Verify
  native projection/foreign/deleted/card/provenance/no-write guards and real
  browser literal/translated labels, absent actions/bytes and live removal.
  The complete local suite (66 host tests) and complete source/packaged browser
  suites pass.
  Public download identity/assigned-only scope, transfer policy, retained-file
  behavior, storage/cover models and original Meteor file actions remain open.
  Thanks to xet7.

- Extend selected-card guest reads with native text/number/date/checkbox fields,
  legacy text fallback, stored time/running state and same-board subtask/
  dependency links. Keep typed field checkboxes disabled and expose recorded
  minutes/notes/scoped author/time without timer actions or invented elapsed
  totals. Translate fixed headings and Running/minutes captions across 237
  catalogs while retaining literal field names and values. Resolve relationship
  labels from current live same-board targets, excluding stale stored titles/
  bodies, foreign/deleted/missing/fractional targets and invalid fields/time.
  Keep archived target links readable, refresh renamed labels and remove links
  after a target moves away without revealing its private destination. Reuse
  scoped retained-author reads without new mutation dispatch or store setup.
  Verify native typed/legacy values, durations/running state, corrupt/foreign/
  deleted scope and no writes, plus real browser disabled/literal/translated
  fields, archived links/Back, live rename/private-target loss and prior guest
  privacy/login. The complete local suite (66 host tests) and complete source/
  packaged browser suites pass. Source board-defined/admin-field and cross-board/deposit models,
  elapsed aggregation, attachments/downloads and original Meteor actions remain
  pending.
  Thanks to xet7.

- Show native selected-card guest comments and checklists without new mutation
  targets. Scope child reads to the current public board/card, include only
  checklist items with a valid parent on that same card, and scope retained
  author text by kind/item/board/card. Keep board-grid child reads absent and
  return empty sections on legacy databases without initializing mutable child
  tables. Render escaped literal text, author/time and disabled completion
  states; translate fixed headings while preserving user checklist titles.
  Retain idle DOM and update edited/deleted children live, clearing them on
  public-access loss and restoring them through the existing read guards.
  Verify native missing-schema/no-write, foreign/orphan/provenance/completion
  negatives and real browser literal/script-like text, translated/literal
  captions, disabled states, idle stability, edits/deletion and privacy/recovery.
  The complete local suite (66 host tests) and complete source/packaged browser
  suites pass.
  Native entry-ID order, flat child records and retained author names are
  explicit adapters. Other child models/downloads, rich text, source checklist
  ordering and full original Meteor publications/actions remain pending.
  Thanks to xet7.

- Add native anonymous public board and core card entries in a separate
  read-only guest form. Derive initial board/card IDs from validated host paths,
  retain private/instance login refusal and use an explicit login entry without
  inventing an account, membership or authentication cookie. Check current public
  permission before and after read-only projections, canonical IDs, soft-delete
  and archived/list/lane scope, native ordering and safe colors. Resolve moved
  cards only into public destinations; preserve a readable URL board and generic
  refusal for missing/inaccessible cards. Reuse the native kanban renderer with
  no mutation/context targets, retaining card links, close/history/reload and
  live permission clearing/retry. Keep login handoff on the requested card.
  Gate native dispatch through an own-form command allowlist, bounded typed
  routes and native null/empty button arguments; refuse foreign controls/focus,
  windows, arbitrary properties/events, completion and large-command dispatch.
  Keep callback/upload host authentication intact. Verify native read-only and
  dispatcher negatives, host path context, actual guest navigation/privacy/
  credential/forgery/callback/upload/login and Finnish/mobile cases. The complete
  local suite (66 host tests) and source/packaged browser suites pass; final
  source/packaged focused checks and all-catalog tests also pass after the
  source Refresh caption correction. Guest child
  panels/downloads/additional views, source backgrounds/templates and full
  original Meteor publication/action integration remain pending.
  Thanks to xet7.

- Add native signed-in `/public` discovery as its own read-only table with
  ten-row paging and submitted literal title search. Derive public/instance
  scope on the server, exclude archived/private/helper boards, accept no caller
  identity/selector and return only native ID, title, description and safe hex
  color. Keep cards, memberships, workspace trees and unrelated settings out of
  the discovery projection. Hide personal/create/sort/selection/drag/sidebar
  chrome and row actions; clear stale board/member/action bindings on entry and
  refuse hidden create/import/context commands. Use real canonical board links,
  keyboard and browser new tabs, row-cell activation, direct GET/login/reload,
  account-menu and acknowledged Back/Forward navigation. Canonicalize `/public`
  and ignore query commands. Preserve unsubmitted search drafts and unchanged
  DOM while live titles/permissions/archive changes refresh rows/counts and
  clamp exhausted pages. Translate source captions across 237 native catalogs
  while preserving literal titles/descriptions and tested mobile layout.
  Compare 96 native SQL page/count/projection and 13 helper-title outcomes with
  unchanged source helpers; verify strict malformed/scope options and read-only
  storage, host path/method/query rules and real browser privacy/navigation/
  search/paging/stale/forged/mobile flows. The complete local suite (65 host
  tests), complete source/packaged browser runs and a final focused source check
  with the exact source caption key pass. Native working-board type, creation-ID
  order, metadata and hex colors are explicit source adapters; background-image,
  template/global-sort models, anonymous board/card UI, first-edit membership
  and full original Meteor/ReportPages wiring remain pending.
  Thanks to xet7.

- Add the native board-menu Visibility editor for board managers and readable-
  board site administrators. Bind the board, actor, account generation and
  navigation context privately; refuse readonly/forged, closed/replayed,
  navigated and demoted saves with fresh server authorization. Persist Private,
  Signed-in users and Public while preserving the current editing allowance
  under the transaction lock. Keep private-only refusal atomic. Refresh clean
  choices from external changes while preserving dirty selections; clear stale
  private state and support Escape/close and anchored mobile popup behavior.
  Import three source captions for all 237 native catalogs, preserving option
  wire values and literal board names. Verify native lock-time allowance
  preservation and real manager/readonly/nonmember browser paths, live policy/
  scope changes, private-transition revocation, stale saves and Finnish mobile
  presentation. Complete local (64 host tests) and source/packaged browser
  suites pass. Guest/public discovery, global policy/editing controls,
  first-edit membership and full original callbacks remain pending.
  Thanks to xet7.

- Add native private-default board visibility and global private-only/instance-
  editing policy storage, with strict typed manager/site-admin setters, ordered
  locks, final actor/epoch/owner/policy/value guards and rollback. Keep legacy
  boards private, read checks free of visibility-schema writes, and purge stale
  visibility with board content. Match source private-only import normalization
  and strict editing-policy helpers without enabling nonmember editing yet.
  Separate public/instance readability from real membership and mutation roles;
  retain active assigned-only card scope and inactive nonmember read semantics.
  Let signed-in native board/card routes, selected-board rows and readable open
  favorites use that scope while keeping unrelated open boards out of personal
  catalogs and preserving default enumeration and whole-board REST guards.
  Verify native policy/late-change/rollback/privacy tests with native sessions
  and separate API principals, plus 774 unchanged source helper outcomes.
  The complete local suite (64 host tests) and complete source/packaged browser
  suites pass.
  Guest/public page and anonymous route/form integration, policy controls,
  first-edit membership, import/copy wiring and full original Meteor callbacks
  remain pending.
  Thanks to xet7.

- Add signed-in native `/b/:boardId/:slug/:cardId` entries with strict canonical
  IDs, GET-only root HTML/query stripping and malformed/encoded-slash/overflow
  alias refusal. Resolve a card's current readable destination with final
  identity/scope/destination/state rechecks. Redirect readable moved cards;
  keep a readable URL board for missing or unreadable cards without disclosing
  the destination, and clear denied private state while retaining the URI.
  Render whole-card links with native modifier/Ctrl body-click and keyboard
  behavior, separate menu/drag controls and retained mouse/touch gestures.
  Preserve login/reload entries, mounted same-board state and unsaved drafts;
  acknowledge open/close intents and let newer card clicks win delayed menus
  without extra history. Keep explicitly routed cards readable on external
  archive/restore independently of the board filter, refreshing controls and
  retaining their panel/URI. User archive closes to its board; restore keeps the
  card open. Clear previous route state for new-card creation and reuse existing
  translated captions while preserving literal content. Verify native malformed,
  private/assigned/revoked guards, twelve unchanged moved-target helper native
  SQL/pure cases, twelve unchanged source card URL comparisons and real
  source/packaged login/history/draft/whole-link/keyboard/race/archive/privacy/
  Finnish/mobile flows. The complete local suite (64 host tests) and complete
  source/packaged browser suites pass. Public/instance visibility, desktop
  multiple-card windows, container/reveal routes and full original Meteor/
  FlowRouter/subscription/action wiring remain pending.
  Thanks to xet7.

- Render native catalog board tiles as real canonical links with a short board
  URL fallback, browser Ctrl/Command/middle-click new tabs and Enter activation.
  Preserve Space behavior and sortable-parent HTML5/pointer/touch gestures.
  Give each document a private native GUI process so opening another tab cannot
  reset the opener's selection, route or private form state. Share login through
  a separate random HttpOnly, SameSite UI cookie with HTTPS Secure protection,
  digest-only persistence, account-generation/idle checks and shared logout;
  keep REST bearer credentials separate. Bind opaque page routing namespaces to
  the shared credential, check callbacks/uploads before dispatch, retain only
  the current browser credential inside an atomic own-password change, and
  clear account-deletion references. Close only the departing document's GUI;
  use throttled passive peer pulses without renewing idle authentication or
  executing actions, and retire expired peer namespaces. Keep native HTML and
  command replies out of caches. Verify native authentication/expiry/owner and
  password rollback guards, forged namespace/callback refusal, cookie/API and
  transport boundaries, real new tabs with usable opener selection, background
  lifetime, tab close and shared logout. Wait for pending fresh-form workspace
  snapshots in browser assertions and scope duplicate fixture titles by ID.
  The complete local suite (64 host tests) and complete final source/packaged
  browser suites pass. Original public/card routes and full Meteor/FlowRouter/
  DDP callbacks remain pending.
  Thanks to xet7.

- Confirm native board-menu archive through a private board/actor/session/view
  binding, with cancellation, Escape, context/navigation invalidation and replay
  refusal. Catalog archive stays in its current section; archiving the open board
  goes to native home at `/` without reapplying saved Home during that page.
  Restore opens the active canonical board and closes its old menu, with no
  intermediate overview or duplicate same-board history entry. Preserve private
  stars, workspace placement and saved Home. Serialize archive/restore under
  account/board locks and recheck identity, role, owner and final state; roll back
  activity and state together on failures and avoid repeated restore effects.
  Keep newer menu intents authoritative over delayed responses and allow the
  first successful native navigation before the URL helper loads. Translate the
  fixed warning/actions using existing keys across 237 catalogs while preserving
  literal board names and readable mobile wrapping. Verify native archive and
  restore rollback/role/session/owner/state/retry negatives, real confirmation,
  scoped/root/canonical and race behavior, readonly/live demotion refusal and
  Finnish mobile controls. Full local (54 host tests) and complete source/packaged
  browser suites pass. Original Meteor/FlowRouter callbacks, public/card routes and real tile-link gestures remain pending.
  Thanks to xet7.

- Add native `/b/:id/:slug` and short `/b/:id` board entries with current-session
  read checks, canonical native IDs, literal titles and fresh archive context.
  Serve only root HTML for valid GET entries, stripping query commands; refuse
  malformed/multiply encoded paths and mutation aliases. Use the source limax
  slug/fallback for canonical tile and Home URLs; resolve by ID and retain an
  explicit stale slug during rename/reload. Give explicit board entries priority
  over saved Home and preserve the current explicit board when Home changes.
  Share acknowledged route tokens across boards/overview/workspaces so only the
  latest intent changes history; support menu, view, Back/Forward and reload.
  Await the root landing decision before recording a cached board URL, and keep
  denied/live-revoked entries at their requested URL with safe native fallback.
  Keep an archived fallback in Archive rather than an inconsistent active view.
  Refresh same-board short-entry titles from freshly authorized metadata before
  canonicalization, including the empty-slug fallback after immediate rename.
  Verify native access/session/archive negatives, host path/method/query guards,
  twelve unchanged source schema/path comparisons and real route/history/privacy
  regressions. Final full local (54 host tests), complete packaged browser and
  focused source/packaged route/Home suites pass. Board-menu archive/restore and
  tile link/modified-click semantics remain explicit navigation follow-ups.
  Native SQL IDs, private membership and native cached forms remain the model;
  original public/card routes and full Meteor/FlowRouter/profile/DDP/Sandstorm
  integration remain pending. Thanks to xet7.

- Accept cross-document HTML5 single/group board drops on Home and Home-origin
  drops on the drag-only Remove bar. Read only protected MIME types during hover,
  distinguish board/workspace/file sources, keep Remove-only Home origin and
  Archive-multi refusal, and clear marks/bars after refused drops or cancellation.
  Parse the complete external payload before writes, accepting canonical native
  string IDs only. Keep changes on the current private profile through the locked
  Home transaction and fresh session/read/active checks; refuse forged non-Home
  targets and removal outside Home. Preserve the board, stars and placement,
  retain a refused multi-selection and clear it after successful grouped drops.
  Same-form drops retain their server-derived selection/revision transport.
  Expire visual state when a cancelled external drag stops its hover stream
  without delivering a recipient leave event; renew on hover and cancel stale
  timers before a new gesture. Verify native malformed/role/session/rollback
  negatives, event cleanup/renewal/no-mutation checks and real separate-document
  Chromium replacement/removal/Escape in source and packaged builds. Full local,
  final JavaScript and affected source/packaged gesture suites pass.
  Original Meteor/profile/DDP and other cross-document board targets remain
  pending. Thanks to xet7.

- Use real desktop HTML5 board drags with the original single/multi and
  Home/Remaining/workspace/Archive-multi MIME markers. Share native target,
  reorder and confirmation policy with touch, while keeping ordinary touch
  scrolling and handle pickup. Inspect only protected-store types on hover;
  validate the captured payload on drop and submit the existing server-bound
  visible origin/selection revision. Preserve native drag state through the
  browser's pointercancel and submit once, then clean up on drop/end/Escape.
  Refuse changed payloads, missing markers, detached origins, invalid selection
  snapshots and drags without a local mouse pickup. Verify event-level MIME,
  protected-store, tamper/cancel and detached-origin negatives, real Chromium
  MIME payloads and full source/packaged mouse/grouped/trusted-touch regressions.
  Full local and live suites pass. Cross-document and original Meteor/profile/DDP
  transport remain pending. Thanks to xet7.

- Add native mouse/touch drops onto Home as idempotent replacement, with one-board
  enforcement, retained multi-selection refusal and successful grouped reset.
  Draw a full-width Remove bar only during a Home-origin board drag; refuse every
  other board target, show red only under the pointer and confirm before clearing
  the matching private mark. Preserve the board, stars and workspace assignment.
  Restore workspace ordering in Home, prevent release-click navigation, show the
  source empty instruction and translate all three captions across 237 catalogs.
  Derive source context/visible origin/selection revision server-side, refuse
  Archive multi, malformed/reserved/stale commands and roll back write/session
  failures. Verify native policy/gesture negatives, 60 SQL outcomes/reset decisions
  against unchanged source callbacks through explicit DOM/DataTransfer/method
  adapters, and real grouped/cancel/Escape/Finnish trusted-touch behavior.
  Original production HTML5 MIME/Meteor, board URL/profile/DDP and Sandstorm
  transport remain pending. Thanks to xet7.

- Match source Home-first Starred presentation after raw paging, including an
  unstarred readable active Home, per-page deduplication and the source Unicode
  search guard. Preserve raw query totals, page bounds, stars, placement and
  ranks. Render the saved Home mark as a translated top-center accessible badge
  on visible tiles, including Archive, with live replacement and access changes.
  Compare 288 native outputs with the unchanged source withHomeFirst using
  explicit numeric-ID/private-cache adapters and verify read-only state/input
  stability. Test actual Custom/A-Z/Z-A pages, search, badge lifecycle, Finnish
  accessibility and mobile geometry in browsers. Import the existing badge
  caption verbatim across 237 catalogs. Home drag/Remove bar and original board
  URL/profile/DDP/Sandstorm transport remain pending. Thanks to xet7.

- Open the current user's readable active Home board on the first native root
  landing after login/full page reload. Rearm only for root HTML responses,
  because Gambas can retain forms across reloads; native event requests keep
  the one-time decision consumed. Avoid queuing an unchanged overview redraw
  during full-page rendering, which detached the first workspace drag target.
  Retain the native board reload state when no readable active Home is available.
  Keep All Boards usable and named section entries authoritative. Leave an open
  page in place when the Home preference changes.
  Reject malformed/replayed landing commands, accept no caller board ID and
  retain stale marks while falling back after archive/access loss. Verify
  readonly/private, zero/default, reload/new-login, named-section, replay,
  live clear and mobile behavior in source and packaged browsers. Native board
  navigation remains at its existing URL; original board routes/profile/DDP and
  Sandstorm single-board convenience remain pending. Thanks to xet7.

- Preserve the current workspace URI/history when a pending target disappears,
  including a redundant click on the selected workspace during deletion. Treat
  the safe native index fallback as an entry acknowledgement rather than a new
  menu navigation. Reproduce the race with a held native request and verify
  unchanged history/URI in source and packaged browsers. Thanks to xet7.

- Connect the native Home preference to an always-present Home sidebar/count,
  active readable catalog and one-board Multi-Selection toggle. Preserve stars,
  workspace placement and global search; retain multi-selection on refusal.
  Refresh Home after another session changes its mark or board visibility.
  Hide Add Board in Home and refuse generic Home-origin drag commands while
  the dedicated Remove gesture is pending. Add source-shaped /allboards/home
  GET entry, login handoff, guarded native section acknowledgement, menu/history
  and reload. Import the four captions verbatim from 237 source catalogs.
  Cover native paging/privacy and real browser live/archive/revocation/search/
  history/mobile flows. Login default opening, Home-first Starred presentation,
  badge and drag/Remove bar plus original profile/DDP transport remain pending.
  Thanks to xet7.

- Add a private native Home-board preference, independent of stars and workspace
  placement. Support idempotent replacement, selection-style toggle and conditional
  stale-ID clearing for the current principal. Require active readable targets
  when setting, retain archived/deleted IDs without exposing a visible board, and
  clean deleted accounts. Lock and recheck identity, membership, archive state and
  stored value; roll back injected write/access/session/value failures. Verify
  read-only member support and foreign/anonymous/site-admin denial. Native toggle
  validates access more strictly than the source toggle RPC. Home UI, routing,
  login opening, drag/Remove bar and original profile/DDP transport remain pending.
  Thanks to xet7.

- Add production nested workspace slug URLs with unchanged source URL helpers
  and the same limax slugifier, including Unicode, emoji fallback, duplicate-first
  matching and literal localized partial name trails. Validate canonical owned
  workspace IDs before native selection, carry private tree/ID acknowledgements
  through login/menu/history, and keep missing targets in the safe Workspaces
  index. Resolve late nodes reactively, preserve stale rename/move/delete paths
  and handle a deleted in-flight target without selecting foreign data. Preserve
  drag click suppression and reject malformed percent/UTF-8 entry paths before
  CGI. Verify 22 source URL oracle outputs, 136 viewer outputs, real private/
  malformed/stale/live/race/reload/mobile flows and source-compatible icon clicks.
  Home/Templates and original full route/DDP/profile transport remain pending.
  Thanks to xet7.

- Synchronize Remaining/Starred/Archive menu URLs and Back/Forward with guarded
  native section/token acknowledgements. Preserve the root frame, push only a
  changed source path and never add frames for popstate. Ignore older replies
  until the latest intent matches; fix the delayed Back/newer Forward race that
  added duplicate entries. Retain current identity/static section guards and
  reject malformed/forbidden commands. Test source paths, exact history lengths,
  delayed requests, reload and mobile in real browsers. Workspace and other-page
  routing/history remain pending. Thanks to xet7.

- Add production direct GET entry for source Remaining/Starred/Archive URLs with
  validated per-tab login handoff, authenticated reload and guarded native
  section dispatch and consumed-command clearing for repeat entry after manual
  navigation. Keep nested assets at the same-origin root. Whitelist only
  implemented HTML entries, strip CGI query commands, refuse non-GET/multiply
  encoded aliases and preserve existing host/native transport protections. Verify
  source path-helper agreement, real login/assets/mobile and forged-section denial
  in source/package browsers. Menu URL/history, workspace slug paths, Home/Templates
  and full original route/DDP integration remain pending. Thanks to xet7.

- Preserve and render private workspace iconColor metadata with an additive table,
  typed optional native edits, omission-versus-empty clearing, fresh final owner/
  session/value guards and atomic name/icon/color rollback. Keep color across
  ordinary source-style edits and reparenting; clean subtree/account deletion.
  Apply lossless row snapshots only through a single CSS color property on source
  Markdown/default-folder wrappers, rejecting extra declarations without requests.
  Verify native failures/privacy/lifecycle and real source-helper edit preservation,
  live/reload/mobile colors and malicious metadata. The source has no current
  color picker, so none is added. Original profile transport remains pending.
  Thanks to xet7.

- Connect workspace Markdown card-title resolution to private readable native
  navigation snapshots for the current active/archive context. Keep raw assigned-
  only, board access, deleted-list and session guards; add no title lookup API.
  Reuse unchanged source URL matching, existing-link protection, title escaping
  and sanitization; update renamed titles live and fall back after access loss.
  Verify private/unassigned isolation, read-only snapshots, archive/list/member/
  session clearing, hostile labels and real reload/fallback/recovery/mobile flows.
  Expand the source renderer oracle to 136 outputs. Icon color and original
  Meteor publications/card routing remain pending. Thanks to xet7.

- Persist the four external-tracker Markdown settings with typed atomic saves,
  private actor/time audit, source UTF-16 limits and locked/final identity/admin/
  value checks. Add Unicode-trimmed Security fields, lossless public live snapshots,
  clean group refresh, dirty group retention and demotion clearing. Reuse the
  unchanged source viewer for prefix/rule/alias links, protected existing links
  and unsafe URL sanitization. Verify native validation/write/late role-session-
  value rollback/retry and real live/reload/disable/forged/translated accessible
  mobile controls (170 keys/237 catalogs). Card-title/iconColor and full source
  transport remain pending. Thanks to xet7.

- Persist automaticLinkedUrlSchemes as exact typed admin-only text with private
  actor/time audit, locked/final identity/role/value checks and rollback/retry.
  Add translated accessible Security textarea with separate Save, live public
  snapshots with lossless multiline JSON encoding, clean-field refresh, dirty
  draft retention and demotion clearing.
  Bundle the unchanged source allowlist parser; preserve forbidden handler rules,
  normalization and 50-scheme cap. Test native write/late role/session/value
  failures and real two-session custom/forbidden links, reload, forged denial,
  mobile/Finnish controls (166 keys/237 catalogs). External-link settings,
  card-title/iconColor and full production transport remain pending. Thanks to xet7.

- Persist source-default-false alwaysShowCodeAsText with typed admin-only audited
  saves and actor/session/role/value transaction rechecks. Add Global Admin /
  Security controls and a live reader boolean snapshot applied before rendering.
  Preserve dirty settings drafts and clear denied panels. Verify write and late
  role/session/value rollback/retry, forged denial, live two-session/reload
  rendering and mobile/Finnish controls (165 keys/237 catalogs). Keep other
  Markdown setting/card-title/iconColor bridges and full source transport pending.
  Thanks to xet7.

- Render workspace icons through the unchanged source Markdown viewer/helper
  and sanitizer, with literal names, safe raw storage, default folders and native
  link selection. Retain all source plugins and local policy snapshots. Import
  exact source/dependency hashes, reproducible bundle tooling and license notices.
  Compare 112 outputs with the source and test real formatted/emoji/hidden-link/
  policy/default/XSS/form/clobber flows. Keep native settings/card-title/iconColor
  bridges, original transport and full original suites pending. Thanks to xet7.

- Add inline subworkspace form with source selectors, optional accessible name
  textarea and translated submit controls (163 keys/237 catalogs). Bind creation
  to the open native parent/revision/actor/session, ignoring DOM parent authority.
  Refuse stale, completed and legacy direct-button mutations; preserve stored
  parent values despite dirty edit drafts. Compare unchanged original helper
  empty/Unicode-whitespace/trimmed outcomes with real UI SQL mutations; close
  blank submissions without writes as in the source event. Keep Markdown
  icons, broader source popup/transport integration and full suites pending.
  Thanks to xet7.

- Serialize native GUI requests with the actual application-specific Gambas
  session cookies, preventing reloads from overlapping native command responses.
  Use bounded lock stripes, ordered multi-cookie acquisition and a shared queue/
  execution deadline; preserve API and anonymous dispatch. Verify 38 host tests
  and four source plus four packaged rounds of unchanged catalog callbacks.
  Thanks to xet7.


- Wait for complete CGI response output, including descendant writers, before
  serializing HTTP headers/body. Retain the request deadline, terminate the
  request process group on timeout, close capture pipes without waiting for
  detached writers and keep stderr private. Verify delayed bodies over actual
  HTTP and inherited/detached/exited-parent timeout cases. Thanks to xet7.


- Add native workspace edit form/required name/icon/submit semantics with source
  selectors, translated labels and preserved native drafts. Bind captured values
  to the open revision, actor/session and private target; refuse forged legacy
  Save events and stale, closed or completed packets. Preserve separate creation
  flows. Import the contextual edit-label key across 237 catalogs (162 total).
  Keep inline subworkspace forms, rendered Markdown icons, actual transport and
  full original suites pending. Thanks to xet7.

- Align native sort anchors, source data/active selectors and visible-only paging
  selector while preserving native events, text updates and layout. Support
  Enter/Space without fragment navigation. Execute the unchanged original sort
  UI callback with fresh native accounts and an explicit independent native
  preference/profile adapter.
  All six spec 39 callbacks now have adapter-backed execution; production
  DDP/routing/profile publications and full original suites remain pending.
  Thanks to xet7.

- Render native board catalogs as semantic lists with source board-name/search
  selectors and escaped literal titles. Preserve tile grid, selection and drag
  surfaces. Execute the unchanged original spec 39 search UI callback through
  actual native controls, without locator/assertion adapters. Keep the original
  sort UI callback, production transport and broader suites pending. Thanks to xet7.

- Execute three unchanged original spec 39 server callbacks and setup/cleanup
  hooks against actual native BoardCatalog.Page results. Cover disjoint sorted
  pages, exact search totals and private-board exclusion. Revalidate real API
  credentials before each test-only RPC request and refuse revoked tokens before
  native execution despite retained native login; explicitly adapt numeric IDs,
  fixture DB and verified identity to native session. Keep production DDP/routing,
  two original sort/search UI callbacks and full suites pending. Thanks to xet7.

- Add real workspace creation form/required textarea/submit semantics with
  actor/session/revision-bound native commands and fresh parent authorization.
  Preserve edit controls and translated submit values; expose the source
  Remaining selector. Run unchanged original spec 39 Latin callback with explicit
  native-session/client-locale adapters (1/6); retain five callbacks, edit-form
  parity and full original suites as pending. Thanks to xet7.

- Add native selected-attachment JSON export with readonly/full-board access,
  session generation and board/card/file binding. Share guarded serialization
  while preserving API token/cookie separation and independent native download
  limits. Hide denied/deleted/history actions and refuse stale/forged clicks.
  Verify native late-scope/session rollback, real exact/empty/binary-safe Unicode
  downloads without token issuance, live policies, cookie/API isolation and mobile/
  translated keyboard controls. Keep original UI/public/storage/field models and
  broader formats pending. Thanks to xet7.

- Add private single-attachment JSON export with source response/auth ordering,
  live-file/full-board scope, exact Unicode/binary/zero-byte fields and safe
  errors. Accept scoped query credentials through host-side hashing/scrubbing;
  preserve Bearer and cookie boundaries. Lock/recheck policy, token, scope and
  native byte limits. Verify CGI forwarding, actual HTTP negative/rollback paths
  and 126 unchanged source route/serializer/helper outcomes. Keep public/field/
  storage/impersonation models, native attachment-export UI, broader formats and
  full original suites pending. Thanks to xet7.

- Add independent default-off Global Admin import/export disable switches with
  typed/audited locked saves and live clean-field refresh/draft preservation.
  Gate native JSON transfers and whole-board copies with fresh policy/scope
  checks, clear stale forms and retain pending-copy retry. Hide denied actions
  and guard forged events. Verify native no-write/late-change rollback, nine
  unchanged source helper outcomes and real exact-download/upload/copy/mobile/
  translated/admin-loss browser flows. Keep avatars/anonymization, missing source
  formats/APIs, streaming, event reporting and full original suites open.
  Thanks to xet7.

- Generate source-style numbered single-copy titles inside the locked copy
  transaction and navigate to the destination only after commit. Preserve edited
  bases, failed-save source/form state and retry after child or late session
  failure. Verify native rollback/titles, repeated with/without-card browser
  copies and unchanged source uniqueTitle/clone callback outcomes with explicit
  adapters. Keep actual routing/subscriptions, destination placement/order,
  unsupported models and full original suites open. Thanks to xet7.

- Add the eight supported content choices to the single-board Copy dialog, with
  all/none, dependent keyboard checkbox controls, mobile layout and existing source
  translations. Bind private operation state to source/account/generation; reject
  source substitution, busy/completed/cancelled replay and hidden form submits.
  Preserve atomic failure retry and isolate selected-copy choices. Clear forms on
  role, raw assigned-scope or creation-policy loss. Verify native data/protocol
  guards and real mobile/translated/filter/replay/context/scope browser outcomes.
  Keep exact source clone title/placement/redirect, missing models and full original
  UI/API/DDP/security callbacks open. Thanks to xet7.

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
