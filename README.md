# Prompt Injection Competition Game

Full web app for a Gandalf-style prompt-injection game.

## Requirements

- Node.js 18+ (for built-in `fetch`)
- A Groq API key
- Python 3.9+ (optional, for leak-audit script)

## Setup

1) Configure secrets (local only)

- Set Groq key in `.env.local` (recommended)
	- `GROQ_API_KEY=...`
	- Optional: `GROQ_MODEL=llama-3.1-8b-instant`

- Level secrets live in `data/levels.secret.json` (not committed)
	- Must contain exactly 8 levels with: `id`, `password`, `systemPrompt`
	- `password` must be letters-only (A-Z, a-z), no spaces/numbers/symbols

The UI also shows a non-secret “level word” (codename) per level (defined in backend).

2) Run

Single command (recommended):

`npm run boot`

This runs: `npm install`, `npm --prefix client install`, `npm run build`, `npm start`.

Open `http://localhost:3000`.

## Roles

- Admin login: `admin` / `admin123` (leaderboard only)
- Any other credentials: user (plays levels 1–8)

## Notes

- Session data is stored locally in `data/sessions.json`.
- Level passwords + system prompts are backend-only and loaded from `data/levels.secret.json`.

## Dev

- `npm start` runs the backend on `http://localhost:3000`
- `npm --prefix client run dev` runs the React dev server on `http://localhost:5173`

For the simplest workflow, build the client and use `npm start` to serve it.

## Security Testing (Defensive)

Use `password_tester.py` to audit whether the model leaks the level password in responses (full leaks or partial metadata leaks). The script does not print passwords; any detected leak output is password-redacted.

Run the leak-audit script (does not print passwords):

`py -3 password_tester.py --suite advanced --shuffle --seed 123 --detect-metadata`

Reports:

- `leak_audit_summary.csv`
- `leak_audit_report.jsonl` (password-redacted)