# 🦐 Krillion Score Board

A fun little site for logging your daily [Krillion](https://krillion.io/) score and racing your friends.

- **Accounts** with email + password. No confirmation email.
- **Admin** creates score boards and assigns accounts to them.
- **Every board** shows the weekly podium, deepest single dive, total depth, hot streakers, today's dives, and a day-by-day heat grid. Browse back through previous weeks.
- **Scores** are 0–700 (7 prompts × up to 100 points). 1 point = 4 metres of depth, just like in the game. Days follow UTC, matching Krillion's reset.

Built with Next.js 16 (App Router), Tailwind v4 and Supabase (Postgres + Auth). Deploys to Vercel in a couple of clicks.

## 1. Set up Supabase

The schema is built to live in a Supabase project that is **shared with other apps**:

- every table and function is prefixed `krillion_` (`krillion_profiles`, `krillion_boards`, `krillion_board_members`, `krillion_scores`), so nothing collides;
- nothing is attached to `auth.users`: no trigger, no changes. Users of the other apps are untouched until they open this site, at which point `krillion_ensure_profile()` creates their Krillion profile.

Steps:

1. Open the project's **SQL Editor** and run [`supabase/migrations/20261006000000_krillion_init.sql`](supabase/migrations/20261006000000_krillion_init.sql).
   - Or with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
2. Grab your keys from **Settings → API**.

Because auth is shared, anyone with an account in one of the other apps can log in here with the same email and password. They won't see anything until an admin puts them on a board.

### Accounts without email confirmation

Pick one of these:

- **Recommended:** put the project's `service_role` key in `SUPABASE_SERVICE_ROLE_KEY`. Sign-ups are then created server-side as already-confirmed users. The key never reaches the browser.
- **Or:** in the Supabase dashboard go to **Authentication → Providers → Email** and turn off **Confirm email**. Then the service role key is not needed.

### Who is admin?

- The **first Krillion profile ever created** is admin. That is the first person to sign up or log in on this site, so do that yourself right after deploying.
- Any email listed in `ADMIN_EMAILS` (comma-separated) is made admin when it signs up (needs the service role key). Set this too, to be safe.
- Admins can promote or demote others on the **Admin** page.
- Manual fallback, in the SQL editor: `update public.krillion_profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');`

## 2. Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm test          # unit tests for the leaderboard maths + RLS tests against an in-process Postgres (PGlite)
npm run lint
npm run typecheck
npm run build
```

## 3. Deploy to Vercel

1. Import this repository in Vercel.
2. Add the same environment variables as in `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optionally `ADMIN_EMAILS`).
3. Deploy. No other config needed.

## How it fits together

| Path | What |
| --- | --- |
| `src/app/page.tsx` | Public landing page |
| `src/app/login`, `src/app/signup` | Auth pages |
| `src/app/(app)/dashboard` | Log a dive, your stats, your boards |
| `src/app/(app)/boards/[id]` | A score board (`?w=YYYY-MM-DD` picks a week) |
| `src/app/(app)/admin` | Create boards, manage admins |
| `src/app/(app)/admin/boards/[id]` | Edit a board, add/remove members |
| `src/app/actions/*` | Server actions (auth, scores, admin) |
| `src/lib/stats.ts` | Pure leaderboard maths (tested in `tests/stats.test.ts`) |
| `src/lib/week.ts` | UTC date and ISO-week helpers |
| `src/proxy.ts` | Refreshes the Supabase session cookie and guards private routes |
| `supabase/migrations` | Database schema + RLS, all prefixed `krillion_` (tested in `tests/schema.test.ts`) |

### Security model

All data access goes through Supabase with the signed-in user's session, so Postgres row-level security is the real gatekeeper:

- Users see only boards they are on, the members of those boards, and those members' scores.
- Users can only insert, edit and delete their own scores.
- Only admins can create or edit boards, assign members, or change admin flags. Nobody can make themselves admin.

### Scoring rules in one place

`src/lib/constants.ts` holds `MAX_DAILY_SCORE` (700) and `METRES_PER_POINT` (4). The database check constraint in the migration also caps scores at 700, so change both if Krillion ever changes its rules.

---

Fan-made. Not affiliated with Krillion.
