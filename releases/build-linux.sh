#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
mkdir -p "$PWD/.tools/tmp"
export TMPDIR="$PWD/.tools/tmp"
apt-get update
apt-get install -y --no-install-recommends python3 python3-yaml nodejs node-jsdom \
  gambas3-devel gambas3-runtime gambas3-gb-crypt gambas3-gb-db gambas3-gb-db-sqlite3 \
  gambas3-gb-signal gambas3-gb-util gambas3-gb-util-web gambas3-gb-web gambas3-gb-web-gui gambas3-gb-httpd
./build.sh test
python3 releases/package.py "$@"
