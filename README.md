<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MyWorkoutTracker

## Local development

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local` with:
   - `VITE_GOOGLE_CLIENT_ID` (Google OAuth client ID)
   - `GEMINI_API_KEY` (Gemini API key; server-side only)
   - `DATABASE_URL` (Postgres connection string; used to record login/logout events)
3. Run the app (recommended):
   `vercel dev`

Note: this project relies on Vercel Serverless Functions under `/api` for:
- mandatory auth gating (`/api/auth/verify`)
- login/logout auditing (`/api/auth/event`)
- AI insights (`/api/analyze`)

`npm run dev` will start only the Vite frontend and those `/api/*` routes will not exist.

## Vercel deployment (recommended)

Set these Environment Variables in Vercel (Project → Settings → Environment Variables):
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GEMINI_API_KEY`: Gemini API key (kept secret on the server)
- `DATABASE_URL` (or `POSTGRES_URL`): Postgres connection string used to record login/logout events

Optional allow-listing:
- `ALLOWED_GOOGLE_DOMAIN`: only allow users from a given Google Workspace domain (checks the `hd` claim)
- `ALLOWED_GOOGLE_EMAILS`: comma-separated list of allowed emails

Security model:
- The browser never receives the Gemini API key.
- The browser must sign in before any app content renders.
- The browser sends a Google ID token (OAuth) to backend routes.
- `/api/analyze` verifies the token and then calls Gemini with `GEMINI_API_KEY`.
- `/api/auth/event` verifies the token and records login/logout events in Postgres.
