# Claude vs Codex: The AI Troll-Off

Two AIs were each asked to build a 10-level web game that breaks every rule of UX while keeping the UI clean. Play it at **[claude-codex.anshkapuriya.in](https://claude-codex.anshkapuriya.in)**.

| Folder | What it is |
| --- | --- |
| `index.html` | Home screen where you pick your opponent |
| `made-by-claude/` | The 10-level game made by Claude |
| `codex/` | The 10-level game made by Codex |
| `shared/` | Feedback and X-sharing flow (made by Codex), home screen styles and assets |

Everything is static HTML, CSS and JS with no build step and no backend. Progress and feedback stay in the player's browser.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
