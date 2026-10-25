#!/bin/bash
# Install locked dependencies and build REA when the checkout lacks a current
# build. Serialized with flock so the SessionStart hook and the MCP launcher
# never build concurrently. Progress goes to stderr; stdout stays clean for
# MCP stdio.
set -euo pipefail
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$root"
mkdir -p .cache
exec 9>.cache/claude-bootstrap.lock
flock 9

if [ ! -f node_modules/.package-lock.json ] ||
  [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "rea bootstrap: npm ci" >&2
  npm ci --no-audit --no-fund >.cache/claude-npm-ci.log 2>&1 ||
    { echo "rea bootstrap: npm ci failed, see .cache/claude-npm-ci.log" >&2; exit 1; }
fi

if [ ! -f dist/mcp/main.js ] || [ -n "$(find src -newer dist/mcp/main.js -print -quit)" ]; then
  echo "rea bootstrap: build" >&2
  npm run build:cached >.cache/claude-build.log 2>&1 ||
    { echo "rea bootstrap: build failed, see .cache/claude-build.log" >&2; exit 1; }
fi
