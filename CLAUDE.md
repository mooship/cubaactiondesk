@AGENTS.md

## Claude Code

For prose, invoke the `humanizer` skill as AGENTS.md says.

AGENTS.md wins when a skill disagrees with it. Skills never override "External actions": ask before anything that leaves this machine, even when a skill says to commit, push or open a pull request.

The Playwright planner, generator and healer agents are in `.claude/agents/`. Plans go in `specs/` and generated tests in `tests/e2e/`, starting from `tests/e2e/seed.spec.ts`. They use the Playwright test MCP server in `.mcp.json`, which runs it with `cmd /c` for Windows; on macOS or Linux use `"command": "npx"` with the same arguments.
