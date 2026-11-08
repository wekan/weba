#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
# Standalone clone and parent WeKan checkout both keep scratch under .tools.
TOOLS="${WEBA_TOOLS_DIR:-$ROOT/.tools}"
if [[ -z "${WEBA_TOOLS_DIR:-}" ]]; then
  # Companion clones live in either .tools/weba or .tools/w/weba.
  for tools_parent in "$ROOT/.." "$ROOT/../.."; do
    if [[ -d "$tools_parent/bin" && -f "$tools_parent/../AGENTS.md" ]]; then
      TOOLS="$(cd "$tools_parent" && pwd)"
      break
    fi
  done
fi
export TMPDIR="${TMPDIR:-$TOOLS/tmp}"
mkdir -p "$TMPDIR"
GAMBAS_PREFIX="${GAMBAS_PREFIX:-$TOOLS/bin/gambas}"
if [[ ! -d "$GAMBAS_PREFIX" && -d "$TOOLS/bin/gambas3" ]]; then GAMBAS_PREFIX="$TOOLS/bin/gambas3"; fi
if [[ -d "$GAMBAS_PREFIX/usr/bin" ]]; then export PATH="$GAMBAS_PREFIX/bin:$GAMBAS_PREFIX/usr/bin:$PATH"; fi
if [[ -d "$GAMBAS_PREFIX/usr/lib/gambas3" ]]; then
  export GB_PATH="$GAMBAS_PREFIX/usr/lib/gambas3"
  export LD_LIBRARY_PATH="$GAMBAS_PREFIX/usr/lib/host-deps${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi
GBC="${GBC:-gbc3}"; GBX="${GBX:-gbx3}"; GBA="${GBA:-gba3}"
export GBC GBX GBA
compile() {
  if [[ -n "${GAMBAS_ROOT:-}" ]]; then "$GBC" -r "$GAMBAS_ROOT" -j 1 -a "$ROOT/WeKan"
  else "$GBC" -j 1 -a "$ROOT/WeKan"; fi
}
build() {
  compile
  mkdir -p "$ROOT/dist"
  "$GBA" -o "$ROOT/dist/weba.gambas" "$ROOT/WeKan"
}
run() {
  build
  python3 runtime/server.py --app "$ROOT/dist/weba.gambas" --runner "${GBR:-gbr3}" "$@"
}
tests() {
  tests/run-store.sh
  python3 tests/run-http.py
  python3 tests/run-http.py --archive
  python3 tests/run-http.py --api
  python3 tests/run-http.py --api --archive
  python3 tests/run-http.py --members
  python3 tests/run-http.py --members --archive
  python3 tests/run-http.py --sessions
  python3 tests/run-http.py --sessions --archive
  python3 -m unittest discover -s tests -p '*_test.py'
  "${NODE:-node}" tests/reports.test.cjs
  "${NODE:-node}" tests/i18n.test.cjs
  "${NODE:-node}" tests/popup.test.cjs
  "${NODE:-node}" tests/roles.test.cjs
  "${NODE:-node}" tests/transport.test.cjs
  "${NODE:-node}" tests/drag.test.cjs
}
release() {
  local workflow="$1" version="${2:-v$(sed -n 's/^Version=//p' WeKan/.project)}"
  python3 releases/release.py dispatch "$workflow" "$version" --ref "${WEBA_RELEASE_REF:-main}"
}
copy_gambas() {
  local dest="${GAMBAS_COPY_DEST:-$TOOLS/bin/gambas}"
  if [[ ( -n "${FLATPAK_ID:-}" || -f /.flatpak-info ) && "${GAMBAS_SOURCE_ROOT:-/}" == / ]]; then
    flatpak-spawn --host python3 "$ROOT/releases/copy-gambas.py" --destination "$dest" "$@"
  else
    python3 releases/copy-gambas.py --source-root "${GAMBAS_SOURCE_ROOT:-/}" --destination "$dest" "$@"
  fi
}
menu() {
  while true; do
    cat <<'MENU'

WeBa — Gambas Web Kanban
 1) Build locally
 2) Build and run locally
 3) Run all tests
 4) Package this Linux target
 5) Release All
 6) Release All Missing
 7) Copy Gambas to Flatpak Sandbox
 8) Show release targets
 9) Check Gambas toolchain
 0) Exit
MENU
    read -r -p 'Choice: ' choice || return 0
    case "$choice" in
      1) build ;; 2) run ;; 3) tests ;; 4) python3 releases/package.py ;;
      5|6) read -r -p 'Existing release tag (e.g. v1.0.0): ' tag
        if [[ "$choice" == 5 ]]; then release release-all.yml "$tag"; else release release-all-missing.yml "$tag"; fi ;;
      7) copy_gambas ;; 8) python3 releases/release.py targets ;; 9) doctor ;; 0) return ;; *) printf 'Unknown choice\n' ;;
    esac
  done
}
doctor() {
  printf 'Gambas prefix: %s\nTemporary files: %s\n' "$GAMBAS_PREFIX" "$TMPDIR"
  for tool in "$GBC" "$GBX" "$GBA" "${GBR:-gbr3}"; do
    command -v "$tool" || return 1
    "$tool" -V
  done
}
case "${1:-}" in
  '') menu ;; build) build ;; run) shift; run "$@" ;; test) tests ;;
  package) shift; python3 releases/package.py "$@" ;;
  release-all) shift; release release-all.yml "${1:-}" ;;
  release-all-missing) shift; release release-all-missing.yml "${1:-}" ;;
  copy-gambas) shift; copy_gambas "$@" ;; targets) python3 releases/release.py targets ;; doctor) doctor ;;
  *) printf 'Usage: %s [build|run|test|package|release-all|release-all-missing|copy-gambas|targets|doctor]\n' "$0" >&2; exit 2 ;;
esac
