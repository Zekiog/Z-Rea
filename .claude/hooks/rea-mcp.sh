#!/bin/bash
# Project MCP launcher: ensure a current build, then serve REA over stdio.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
"$dir/ensure-rea-build.sh"
exec node "$dir/../../scripts/rea.mjs" mcp
