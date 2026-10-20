# LifeOS — TimeFlow Edition

A personal operating system for your day. The **TimeFlow timeline** is the core concept:
your schedule, tasks, sleep, habits and goals render as one chronological, interactive flow.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript (strict)
- **PostgreSQL** via **Drizzle ORM**
- **Tailwind CSS 4** with a token-based **Liquid Glass** design system
- **Vitest** for unit-tested business logic
- Lucide icons (no emoji-as-icon, no stock imagery)

## Quick start

```bash
cp .env.example .env        # fill in DATABASE_URL at minimum
npx drizzle-kit push        # create tables
npm run dev
```

Production:

```bash
npm run build && npm run start
```

Tests & checks:

```bash
npx vitest run              # 55 unit tests: dates, streaks, sleep, stats, challenges, achievements
npm run typecheck
```

## Vercel deployment

The Vercel project (`lifeos`) is linked to the GitHub repo `asadWHite/lifeos`
and auto-deploys `main`. No `vercel.json` is needed — Next.js is detected
automatically (build: `next build`, output handled by the framework).

Environment variables required in
**Vercel Dashboard → project lifeos → Settings → Environment Variables**
(enable for Production, Preview and Development):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web config (public by design) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `lifeos-8bac1.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `lifeos-8bac1` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `lifeos-8bac1.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `1005467052289` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | web app id |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | optional |
| `DATABASE_URL` | **hosted Postgres** connection string |

IMPORTANT — `DATABASE_URL` on Vercel: `localhost`/sandbox databases are not
reachable from Vercel's servers. Create a hosted Postgres (Vercel → Storage →
Create Database → Postgres, or Neon), set `DATABASE_URL`, then apply the schema:

```bash
DATABASE_URL="<hosted-url>" npx drizzle-kit push
```

Until a reachable `DATABASE_URL` exists, the deployed site renders but sign-in
returns a clear "database can't be reached" 503 instead of crashing.
After changing any env var, trigger a new deployment (push to `main` or
Vercel → Deployments → Redeploy).

## Authentication

Two real, server-side mechanisms — no fake auth anywhere:

1. **Email + password** — scrypt-hashed credentials, 30-day httpOnly cookie
   sessions stored in `auth_sessions`. Works out of the box.
2. **Google sign-in via Firebase Authentication** (project `lifeos-8bac1`):
   - Client: `src/lib/firebase.ts` — singleton init from `NEXT_PUBLIC_FIREBASE_*`
     vars, `GoogleAuthProvider`, popup first with `signInWithRedirect` fallback
     on `auth/popup-blocked`, `getRedirectResult` on return,
     `onAuthStateChanged` session restoration, duplicate-click prevention,
     and mapped errors (`popup-closed-by-user`, `unauthorized-domain`,
     `operation-not-allowed`, `network-request-failed`, missing config).
   - Server: `POST /api/auth/firebase` — verifies the Firebase ID token with
     Google's public securetoken X.509 certificates (`src/lib/firebase-token.ts`,
     RS256 + iss/aud/exp checks). **No service-account private key exists or is
     required anywhere in this codebase.**
   - On success a normal LifeOS session cookie is created; the Postgres profile
     is created once and never overwritten by later sign-ins (onboarding data
     is preserved). Sign-out ends both the LifeOS session and the Firebase
     session.

### Required Firebase Console steps (manual, cannot be coded)

Firebase Console → project **lifeos-8bac1**:
1. **Authentication → Sign-in method → Google** → enable (set a support email).
2. **Authentication → Settings → Authorized domains** → ensure your deployment
   hostnames are listed, e.g.:
   - `localhost` (enabled by default)
   - your production Vercel domain (e.g. `lifeos-iota-topaz.vercel.app`)
   - any other Vercel/preview domains you actually use
3. Firestore is **not required**: LifeOS persists profiles and all data in
   PostgreSQL (single source of truth — no second data store). If you enable
   Firestore for other features later, start from these rules and never ship
   open access:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```
   Firebase Analytics is optional and never initialized by this app.

First sign-in routes to a 9-step **onboarding** (profile, life situation,
responsibilities, interests, goals, daily rhythm, sleep/phone habits, style).
Every step persists immediately (`users.onboardingStep`), so interrupted flows
resume; completion is stored so it never repeats unnecessarily.

## Modules

| Area | Highlights |
| --- | --- |
| **Today** | Live clock in your timezone, TimeFlow timeline with *now* marker, current/next activity, quick-add, day progress, habit strip, sleep summary |
| **Sleep** | Target schedule (cross-midnight safe), live sessions surviving reload, manual logs, history with G/Y/R compliance (green: within tolerance, yellow: ≤60 min late, red: >60 min late or <2 h), honest scope — no sleep-stage claims |
| **Plan** | Tasks (validation, reschedule, priorities, goal links, overdue/completed views), Habits (streaks with documented rest-day rules, archive), Goals (measurable targets auto-complete when truly reached) |
| **Progress** | 7-day task chart with accessible summaries, 28-day habit consistency, real streaks, achievements verified against a stats snapshot (idempotent awards), 10-day + monthly challenges (leap-year safe) |
| **Profile** | Personal info, light/dark theme (real effect), reminder style/permission flow, all onboarding answers editable, sign out |

## Reminders — honest scope

While LifeOS is open, reminders fire at task start times (10 min early for the
"firm" style) as in-app toasts or browser Notifications (with permission).
**Closed-browser push** requires a service worker, push subscription and a server
scheduler — that infrastructure is documented here, not simulated.

## Conventions

- Money rules: no fabricated data anywhere — empty states instead of invented statistics.
- Timezone default `Asia/Tashkent`; per-user override; day math via `Intl`.
- All mutations are server-validated with zod; every write returns success only
  after persistence, and clients keep your input on failure.
- One-time achievements insert with `onConflictDoNothing` — duplicates impossible.
