@AGENTS.md

## Claude Code

The Superpowers plugin is enabled for this repo in `.claude/settings.json`. Use its skills; they are how the principles in AGENTS.md get applied.

- Before building a feature or changing behaviour, invoke `superpowers:brainstorming`. A small change gets a short design in chat and a yes from the owner before any code.
- Before writing logic, invoke `superpowers:test-driven-development`. Before fixing a bug or chasing a failing check, invoke `superpowers:systematic-debugging`.
- Before saying a task is done, invoke `superpowers:verification-before-completion` and run the checks listed under "Done means" in AGENTS.md.
- For prose, invoke the `humanizer` skill as AGENTS.md says. Superpowers skills do not replace the Writing rules.

AGENTS.md wins when a skill disagrees with it. Skills never override "External actions": ask before anything that leaves this machine, even when a skill says to commit, push or open a pull request.
