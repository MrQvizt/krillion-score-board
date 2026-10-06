/**
 * The Supabase project is shared with Arena Tracker. These tests run the
 * migration against an in-process Postgres (PGlite) that ALSO carries stubs of
 * Arena Tracker's tables, and check the soft links between the two apps plus
 * that the migration can be re-run safely against a live project.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readdirSync } from "node:fs";

const MIGRATIONS_DIR = path.resolve(__dirname, "../supabase/migrations");
/** Every migration, in filename order, as one script. */
const MIGRATION = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
  .join("\n");

const FIRST = "a1111111-1111-4111-8111-111111111111";
const RIOT = "a2222222-2222-4222-8222-222222222222";
const LEGACY = "a3333333-3333-4333-8333-333333333333";
const ARENA_ADMIN = "a4444444-4444-4444-8444-444444444444";
const PLAIN = "a5555555-5555-4555-8555-555555555555";

let db: PGlite;

async function as(userId: string, sql: string, params: unknown[] = []) {
  await db.query("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  try {
    return await db.query(sql, params);
  } finally {
    await db.query("reset role");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;

    -- Arena Tracker's tables, as far as Krillion looks at them. RLS is on with
    -- no policies, like the real project for anything but the owner's own row:
    -- the security-definer function must still be able to read them.
    create table public.profiles (
      id uuid primary key references auth.users (id) on delete cascade,
      gamer_tag text,
      riot_game_name text
    );
    alter table public.profiles enable row level security;
    create table public.app_admins (
      user_id uuid primary key references auth.users (id) on delete cascade
    );
    alter table public.app_admins enable row level security;
  `);
  await db.exec(MIGRATION);

  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'first@example.com', '{}'),
      ($2, 'riot@example.com', '{}'),
      ($3, 'legacy@example.com', '{}'),
      ($4, 'owner@example.com', '{}'),
      ($5, 'plain@example.com', '{"display_name":"Plain Jane"}')`,
    [FIRST, RIOT, LEGACY, ARENA_ADMIN, PLAIN],
  );
  await db.query(
    `insert into public.profiles (id, gamer_tag, riot_game_name) values
      ($1, 'OldTag', 'Mrqvist'),
      ($2, 'JustATag', null),
      ($3, null, 'Owner Riot')`,
    [RIOT, LEGACY, ARENA_ADMIN],
  );
  await db.query("insert into public.app_admins (user_id) values ($1)", [ARENA_ADMIN]);
});

afterAll(async () => {
  await db?.close();
});

describe("migration is re-runnable", () => {
  it("applies a second time without errors and keeps the data", async () => {
    await as(FIRST, "select krillion_ensure_profile()");
    await db.exec(MIGRATION);
    const n = await db.query<{ n: number }>("select count(*)::int as n from krillion_profiles");
    expect(n.rows[0].n).toBe(1);
    const policies = await db.query<{ n: number }>(
      "select count(*)::int as n from pg_policies where tablename like 'krillion_%'",
    );
    expect(policies.rows[0].n).toBe(12); // 3 profiles + 2 boards + 2 members + 5 scores, no duplicates
  });
});

describe("links to Arena Tracker", () => {
  it("names a new profile after the Arena Tracker Riot name", async () => {
    const r = await as(RIOT, "select (krillion_ensure_profile()).display_name as n");
    expect((r.rows[0] as { n: string }).n).toBe("Mrqvist");
  });

  it("falls back to the legacy gamer tag, then the email", async () => {
    const r = await as(LEGACY, "select (krillion_ensure_profile()).display_name as n");
    expect((r.rows[0] as { n: string }).n).toBe("JustATag");
  });

  it("prefers the name the sign-up form stored over the Arena Tracker name", async () => {
    const r = await as(PLAIN, "select (krillion_ensure_profile()).display_name as n");
    expect((r.rows[0] as { n: string }).n).toBe("Plain Jane");
  });

  it("prefers an explicit display name over everything", async () => {
    const ONE_OFF = "a6666666-6666-4666-8666-666666666666";
    await db.query("insert into auth.users (id, email) values ($1, 'oneoff@example.com')", [ONE_OFF]);
    await db.query("insert into public.profiles (id, riot_game_name) values ($1, 'Ignored')", [ONE_OFF]);
    const r = await as(ONE_OFF, "select (krillion_ensure_profile('Chosen')).display_name as n");
    expect((r.rows[0] as { n: string }).n).toBe("Chosen");
  });

  it("makes Arena Tracker site admins Krillion admins even when they are not first", async () => {
    const r = await as(ARENA_ADMIN, "select (krillion_ensure_profile()).* ");
    expect(r.rows[0]).toMatchObject({ display_name: "Owner Riot", is_admin: true });
    const first = await db.query<{ is_admin: boolean }>(
      "select is_admin from krillion_profiles where id = $1",
      [FIRST],
    );
    expect(first.rows[0].is_admin).toBe(true);
    const others = await db.query<{ n: number }>(
      "select count(*)::int as n from krillion_profiles where is_admin",
    );
    expect(others.rows[0].n).toBe(2);
  });

  it("does not write to Arena Tracker's tables", async () => {
    const profiles = await db.query<{ n: number }>("select count(*)::int as n from public.profiles");
    expect(profiles.rows[0].n).toBe(4);
    const admins = await db.query<{ n: number }>("select count(*)::int as n from public.app_admins");
    expect(admins.rows[0].n).toBe(1);
  });
});

describe("without Arena Tracker's tables", () => {
  it("still creates profiles when public.profiles has a different shape", async () => {
    const other = new PGlite();
    try {
      await other.exec(`
        create schema auth;
        create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
        create function auth.uid() returns uuid language sql stable as $$
          select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
        create role anon nologin; create role authenticated nologin; create role service_role nologin;
        grant usage on schema public to anon, authenticated;
        grant usage on schema auth to authenticated;
        alter default privileges in schema public grant all on tables to anon, authenticated;
        alter default privileges in schema public grant all on functions to anon, authenticated;
        -- Some other app's profiles table: no Riot columns at all.
        create table public.profiles (id uuid primary key, bio text);
      `);
      await other.exec(MIGRATION);
      await other.query("insert into auth.users (id, email) values ($1, 'solo@example.com')", [PLAIN]);
      await other.query("set role authenticated");
      await other.query("select set_config('request.jwt.claim.sub', $1, false)", [PLAIN]);
      const r = await other.query("select (krillion_ensure_profile()).* ");
      expect(r.rows[0]).toMatchObject({ display_name: "solo", is_admin: true });
    } finally {
      await other.close();
    }
  });
});
