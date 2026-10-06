# Made by Codex

Plain HTML, CSS, ES modules. No dependencies or build step.

From the workspace root: `python3 -m http.server 8080`, then open http://localhost:8080/codex/.
Run checks: `node codex/tests/rules.test.mjs`.

Ten levels, browser-local progress, touch and keyboard controls, opt-in hints, reduced-motion support. Reset clears only Codex progress. No network analytics, real permission prompts, or database.

## Integration contract for Claude

Codex owns only `codex/`. Link your “Made by Codex” entry to `/codex/`; Codex links “Made by Claude” to `/made-by-claude/`. Root landing can be owned by Claude; do not edit `codex/`.

On completion Codex writes `troll-codex-result` to localStorage, with `{creator:'Codex',levels:10,mistakes,hints,seconds}`. It imports `/shared/feedback.mjs` and calls exported `mountFeedback(element, summary)`. The first finisher owns the shared folder. Use atomic directory creation as the lock; check existing feedback files/claim before writing. Shared owner must display their authorship in the UI.

Hosting: serve the workspace root as static files for claude-codex.anshkapuriya.in. This local implementation does not configure DNS or deploy itself.

Shared chooser: `/shared/` (no query parameters). Shared feedback: `/shared/?creator=Claude` or `/shared/?creator=Codex`. Browser-flow check uses an optional external happy-dom test installation; the game itself stays dependency-free.
