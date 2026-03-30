<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MyWorkoutTracker

A mobile-first PWA for tracking strength and conditioning workouts. Built with Vite + React + TypeScript, deployed on Vercel, data stored in Postgres.

## Features

### Workouts
- **Circuits** — build reusable exercise groups with custom sets per exercise
- **Matrix logging** — active workout view shows exercises as rows and sets as columns; weight exercises show side-by-side LBS | REPS inputs
- **Last session pre-fill** — previous set values shown as placeholders so you can beat your last performance
- **Custom exercises** — add exercises not in the built-in library, grouped by muscle

### Programs
- **CSV import** — upload a `.csv` to create a single-day workout or a structured multi-week program
- **Program view** — week-tab navigation with day cards; auto-advances to the next incomplete week
- **Completion tracking** — finishing a program day marks it done (sky header + checkmark); shows overall progress bar and per-week counts
- **Suggested weights/reps** — optional `suggested_weight` and `suggested_reps` columns in the CSV pre-fill workout inputs

#### CSV formats

Single day:
```
circuit_name, exercise_name, type, sets[, suggested_weight, suggested_reps]
Upper Body, Bench Press, weight, 3, 135, 8
```

Multi-week program:
```
week, day, circuit_name, exercise_name, type, sets[, suggested_weight, suggested_reps]
1, 1, Upper Body A, Bench Press, weight, 3, 135, 8
1, 2, Lower Body A, Squat, weight, 4, 185, 5
```

`type` must be `weight`, `reps`, or `duration`.

### Dashboard
- **Today card** — shows date, workout streak, last session summary, and one-tap “Start Again”
- **Workout calendar** — monthly grid with completed days highlighted; prev/next month navigation
- **Circuit cards** — show last-used recency (e.g. “3d ago” / “Never”)
- **Quick Stats** — total sessions and this-month count

### History & Stats
- **History** — expandable session cards showing full set detail per exercise
- **Stats** — total volume chart; per-exercise progress with scrollable exercise picker and personal-record banner

### Auth & sync
- Google OAuth sign-in (One Tap supported)
- All data synced to Postgres on every change; localStorage used as fallback
- Sessions saved locally first — if the token expires mid-workout the session is preserved and synced automatically on next login
- Allow-list support for restricting access to specific Google accounts or domains

---

## Local development

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Create `.env.local`:
   ```
   VITE_GOOGLE_CLIENT_ID=   # Google OAuth client ID
   GEMINI_API_KEY=          # Server-side only
   DATABASE_URL=            # Postgres connection string
   ```
3. Run:
   ```
   npm run dev
   ```

For full end-to-end testing of serverless functions (auth, data sync, AI analysis), use the Vercel dev server instead:
```
npm i -g vercel
vercel dev
```

## Vercel deployment

Set these in **Project → Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `GEMINI_API_KEY` | Yes | Gemini API key (server-side only) |
| `DATABASE_URL` or `POSTGRES_URL` | Yes | Postgres connection string |
| `ALLOWED_GOOGLE_DOMAIN` | No | Restrict to a Google Workspace domain |
| `ALLOWED_GOOGLE_EMAILS` | No | Comma-separated list of allowed emails |

The database schema is created automatically on first request (`CREATE TABLE IF NOT EXISTS`). No manual migration needed.

## Security model

- The browser never receives `GEMINI_API_KEY`.
- All app content is behind Google sign-in.
- Every API request verifies the Google ID token server-side before acting.
- `/api/auth/event` records login/logout audit events in Postgres.
- `/api/data/save` and `/api/data/get` handle all user data persistence.
- `/api/analyze` calls Gemini server-side after token verification.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React 19, TypeScript, Tailwind CSS (CDN) |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Google OAuth via `@react-oauth/google` |
| Backend | Vercel Serverless Functions |
| Database | Postgres (`postgres` driver; works with Vercel Postgres / Neon / any provider) |
| AI | Google Gemini (`@google/genai`) |
