@AGENTS.md

## Claude Code workspace

- Cloud sessions run `.claude/hooks/session-start.sh`, which installs locked
  dependencies and builds REA when needed. The project MCP server `rea`
  (`.mcp.json`) launches through `.claude/hooks/rea-mcp.sh` and waits for that
  build. If its tools are missing after a cold start, reconnect it with `/mcp`.
- `.claude/skills/onchain-strategy-extraction/` profiles traders and bot
  contracts with the StalkChain connector and REA's EVM tools. StalkChain is a
  claude.ai connector; its key never belongs in this repository.
