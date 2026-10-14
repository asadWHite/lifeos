# LIFEOS

A personal life-management system that adapts to the person — not the other way around.
Plan your days, sleep on a rhythm, and move toward your goals with an interface designed
around calm, clarity, and honesty about what the data can (and cannot) say.

**Stack:** Next.js (App Router, Turbopack) · TypeScript (strict) · Tailwind CSS v4 ·
PostgreSQL + Drizzle ORM · Zod · Vitest

## Sections

| Area | What it does |
| --- | --- |
| Home | Greeting, today's prioritized tasks, sleep summary, goal progress, quick add, assistant entry |
| Brain | Assistant chat. Uses a real AI model when `OPENAI_API_KEY` is set; otherwise transparent built-in rules (always labelled). Task proposals require your confirmation before anything is written. |
| Health | Sleep tracking (Start → I woke up), target vs actual with age-aware guidance, daily energy check-in, activity minutes, weekly overview, session history with corrections |
| Goals | Goals with real progress: from linked task completion or an explicit measurable target |
| Progress | 7-day trends computed only from stored data — no invented streaks or stats |
| Settings | Profile, sleep schedule, planning style, Home sections, theme, assistant memory (full, editable list of what LIFEOS stores), JSON export, profile deletion |

## Run locally

```bash
# 1. PostgreSQL: create a database (e.g. app_db)
createdb app_db

# 2. Configure environment
cp .env.example .env
# edit DATABASE_URL inside .env

# 3. Install + push schema
npm install
npx drizzle-kit push --config drizzle.config.json

# 4. Develop
npm run dev          # http://localhost:3000

# 5. Quality gates
npx vitest run       # unit tests: sleep math, goals, personalization, onboarding, assistant
npm exec tsc -- --noEmit
npm run build
npx next start
```

First launch creates a **local profile** (name only, no password) — an explicit
development identity, clearly labelled as such. To enable real authentication
later, swap the adapter in `src/server/session.ts` for Supabase Auth and add RLS
policies; every query is already scoped by `profile_id`.

## AI configuration (optional)

Brain works without any key via built-in rules. To connect a real model, set
server-side environment variables (never exposed to the browser):

```bash
OPENAI_API_KEY="sk-..."
# optional:
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o-mini"
```

Replies from a model are labelled “AI model”; rule-based replies are labelled
“built-in rules”. The assistant only receives a minimal summarized context
(today's tasks, goal progress, sleep totals, explicit preferences), and it
cannot mutate data directly — proposed tasks are applied only after you confirm
them, through validated server actions.

## Honesty guarantees (by design)

- Sleep durations are self-reported estimates, never sensor data; guidance is
  informational, not medical advice.
- Progress is computed only from real records; empty states say so instead of
  fabricating trends.
- Under-13 onboarding is gated: guardian-consent and child-privacy safeguards
  must exist before such accounts can be enabled.
- Personalization is explicit rules over your onboarding answers — the full
  list is visible and editable in Settings (“What LIFEOS knows about you”).

## Architecture

```
src/
  db/schema.ts          Drizzle tables (profiles, preferences, tasks, goals,
                        sleep_sessions, daily_checkins, assistant_messages)
  lib/                  Pure, unit-tested domain logic (sleep math, goal
                        progress, personalization rules, onboarding contract,
                        assistant rules engine, zod validation)
  server/session.ts     Local-profile session adapter (swap for Supabase)
  server/data.ts        Profile-scoped data access
  server/actions/*      Validated server actions (the only write boundary)
  app/api/assistant     AI integration boundary (server-only keys)
  app/api/export        Full JSON data export
tests/                  Vitest unit tests for the domain logic
```

The data contracts are deliberately framework-stable so a future Flutter
client can consume the same backend.
