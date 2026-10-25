#!/bin/bash
# SessionStart: prepare REA in cloud sessions so its MCP server, CLI and tests
# work without manual setup. Local sessions keep their own workflow.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
"$(dirname "$0")/ensure-rea-build.sh"
echo "REA build ready (node $(node -v))."
