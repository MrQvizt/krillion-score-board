# 🦐 Krillion Score Board

A fun little site for logging your daily [Krillion](https://krillion.io/) score and racing your friends.

- **Accounts** with email + password. No confirmation email. Everyone picks a nick and gives their real name; the name shows when you hover over a nick, and admins can fill it in for older accounts.
- **Admin** creates score boards and assigns accounts to them. Divers can also ask to join a board from their dashboard; admins approve or decline.
- **Every board** shows the weekly podium, deepest single dive, total depth, hot streakers, today's dives, and a day-by-day heat grid. Browse back through previous weeks.
- **Scores** are 0–700 (7 prompts × up to 100 points). 1 point = 10 metres of depth, just like in the game. Days follow UTC, matching Krillion's reset.

Built with Next.js 16 (App Router), Tailwind v4 and Supabase (Postgres + Auth). Deploys to Vercel in a couple of clicks.

## 1. Supabase: one project shared with Arena Tracker

Krillion runs in the **same Supabase project as [Arena Tracker](https://github.com/MrQvizt/ArenaTracker)** (project ref `jogqfqzhsoxomuozxasd`). The two apps share `auth.users`, so anyone with an Arena Tracker account logs in here with the same email and password, and vice versa. Everything else is kept apart:

- every Krillion table, function, trigger and policy is prefixed `krillion_` (`krillion_profiles`, `krillion_boards`, `krillion_board_members`, `krillion_scores`), so nothing collides with Arena Tracker's `profiles`, `leaderboard_groups`, `app_admins`, ...;
- nothing is attached to `auth.users`. Arena Tracker's `on_auth_user_created` trigger stays the only one. A Krillion profile is created by `krillion_ensure_profile()` the first time someone opens this site, so Arena Tracker players are untouched until then;
- the migration is re-runnable. Pasting it into the SQL editor a second time is a no-op, not an error.

Two small, optional links to Arena Tracker's data. Both are guarded, so the migration also works in a project without those tables:

- a new Krillion profile takes its **display name** from the player's Arena Tracker Riot name (or legacy gamer tag) when they have one, instead of the local part of their email;
- anyone in Arena Tracker's `public.app_admins` table is a **Krillion admin** from their first visit.

One side effect to know about: Arena Tracker's trigger creates an Arena Tracker `profiles` row for every new auth user, including people who sign up here. That row has no Riot name or gamer tag, so it never shows up on Arena Tracker's leaderboards. It is harmless.

### Apply the schema

1. Supabase dashboard → **SQL Editor** → paste and run every file in [`supabase/migrations`](supabase/migrations), in filename order, each as its own query. This is how Arena Tracker's migrations were applied too. The editor appends its own `enable row level security` statements for the new tables; that is fine, the file already enables it. (The function bodies deliberately avoid `select ... into`, which that editor helper misreads as table creation.)
   - Or with the Supabase CLI, from this repo: `supabase link --project-ref jogqfqzhsoxomuozxasd` then `supabase db push`.
2. **Settings → API**: the project URL is already in `.env.example`. The publishable (anon) key is the same value Arena Tracker uses as `VITE_SUPABASE_ANON_KEY`. The `service_role` key is the secret one, server-only.

### Accounts without email confirmation

Put the project's `service_role` key in `SUPABASE_SERVICE_ROLE_KEY`. Sign-ups are then created server-side as already-confirmed users, and the key never reaches the browser.

Do **not** turn off **Confirm email** under Authentication → Providers → Email instead. Auth settings are project-wide, so that would also switch off confirmation for Arena Tracker sign-ups. (Without the service role key the app falls back to a normal sign-up, which in this project means a confirmation email.)

### Passwords

There is no "forgot password" flow. An admin gives a diver a new password from the **Admin** page (the Password column in the divers table). This needs `SUPABASE_SERVICE_ROLE_KEY` on the server. Accounts are shared with Arena Tracker, so the new password applies there as well.

### Who is admin?

- The **first Krillion profile ever created** is admin. That is the first person to sign up or log in on this site, so do that yourself right after deploying.
- Anyone in Arena Tracker's **`app_admins`** table is a Krillion admin on first visit. The site owner is already in there.
- Any email listed in `ADMIN_EMAILS` (comma-separated) is made admin when it signs up (needs the service role key).
- Admins can promote or demote others on the **Admin** page.
- Manual fallback, in the SQL editor: `update public.krillion_profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');`

### If the dashboard is blank

Open `/setup` on the deployed site (for example https://krillionscore.click/setup). It runs the same database calls as the dashboard with your own session and prints the exact error, with the fix next to it. Nearly always it means the migration above has not been run yet.

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
| `supabase/migrations` | Database schema + RLS, all prefixed `krillion_` (tested in `tests/schema.test.ts`; the Arena Tracker links and re-runnability in `tests/shared-project.test.ts`) |

### Security model

All data access goes through Supabase with the signed-in user's session, so Postgres row-level security is the real gatekeeper:

- Users see only boards they are on, the members of those boards, and those members' scores.
- Users can only insert, edit and delete their own scores.
- Only admins can create or edit boards, assign members, or change admin flags. Nobody can make themselves admin.

### Scoring rules in one place

`src/lib/constants.ts` holds `MAX_DAILY_SCORE` (700) and `METRES_PER_POINT` (10). The database check constraint in the migration also caps scores at 700, so change both if Krillion ever changes its rules.

---

Fan-made. Not affiliated with Krillion.
