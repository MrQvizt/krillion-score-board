/**
 * Runs the Supabase migration against an in-process Postgres (PGlite) with a
 * stubbed `auth` schema, then checks the row level security rules behave.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const MIGRATION = path.resolve(
  __dirname,
  "../supabase/migrations/20261006000000_init.sql",
);

const ADMIN = "11111111-1111-4111-8111-111111111111";
const ANNA = "22222222-2222-4222-8222-222222222222";
const BOB = "33333333-3333-4333-8333-333333333333";
const OUTSIDER = "44444444-4444-4444-8444-444444444444";

let db: PGlite;

async function as(userId: string | null, sql: string, params: unknown[] = []) {
  // Emulate PostgREST: switch to the `authenticated` role and set the JWT sub.
  await db.query("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId ?? "",
  ]);
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
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  await db.exec(readFileSync(MIGRATION, "utf8"));

  // Sign up three users (the auth trigger creates their profiles).
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'admin@example.com', '{"display_name":"Captain"}'),
      ($2, 'anna@example.com', '{"display_name":"Anna"}'),
      ($3, 'bob@example.com', '{}'),
      ($4, 'outsider@example.com', '{"display_name":"Outsider"}')`,
    [ADMIN, ANNA, BOB, OUTSIDER],
  );
});

afterAll(async () => {
  await db?.close();
});

describe("profiles trigger", () => {
  it("creates a profile per user and makes the first one admin", async () => {
    const rows = await db.query<{
      id: string;
      display_name: string;
      is_admin: boolean;
    }>("select id, display_name, is_admin from profiles order by created_at, id");
    expect(rows.rows).toHaveLength(4);
    const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r]));
    expect(byId[ADMIN].is_admin).toBe(true);
    expect(byId[ANNA].is_admin).toBe(false);
    expect(byId[BOB].display_name).toBe("bob"); // falls back to email local part
    expect(byId[ANNA].display_name).toBe("Anna");
  });
});

describe("boards and membership", () => {
  let boardId: string;

  it("lets the admin create a board and assign members", async () => {
    const created = await as(
      ADMIN,
      "insert into boards (name, emoji, created_by) values ('Office Divers', '🐙', $1) returning id",
      [ADMIN],
    );
    boardId = (created.rows[0] as { id: string }).id;
    await as(
      ADMIN,
      "insert into board_members (board_id, user_id) values ($1, $2), ($1, $3)",
      [boardId, ANNA, BOB],
    );
    const members = await as(ADMIN, "select count(*)::int as n from board_members");
    expect((members.rows[0] as { n: number }).n).toBe(2);
  });

  it("refuses board creation by a non-admin", async () => {
    await expect(
      as(ANNA, "insert into boards (name) values ('Sneaky')"),
    ).rejects.toThrow(/row-level security/);
  });

  it("refuses membership changes by a non-admin", async () => {
    await expect(
      as(ANNA, "insert into board_members (board_id, user_id) values ($1, $2)", [
        boardId,
        OUTSIDER,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("shows boards only to their members (and admins)", async () => {
    const anna = await as(ANNA, "select name from boards");
    expect(anna.rows).toHaveLength(1);
    const outsider = await as(OUTSIDER, "select name from boards");
    expect(outsider.rows).toHaveLength(0);
    const admin = await as(ADMIN, "select name from boards");
    expect(admin.rows).toHaveLength(1);
  });

  it("lets members see their board mates' profiles but not strangers", async () => {
    const anna = await as(ANNA, "select display_name from profiles order by display_name");
    expect(anna.rows.map((r) => (r as { display_name: string }).display_name)).toEqual([
      "Anna",
      "bob",
    ]);
    const outsider = await as(OUTSIDER, "select display_name from profiles");
    expect(outsider.rows).toHaveLength(1);
  });
});

describe("scores", () => {
  it("lets a user log, update and read their own dive", async () => {
    await as(
      ANNA,
      "insert into scores (user_id, played_on, score, note) values ($1, '2026-10-05', 410, 'taleggio!')",
      [ANNA],
    );
    await as(
      ANNA,
      "update scores set score = 455 where user_id = $1 and played_on = '2026-10-05'",
      [ANNA],
    );
    const rows = await as(ANNA, "select score, updated_at > created_at as touched from scores");
    expect(rows.rows[0]).toMatchObject({ score: 455, touched: true });
  });

  it("refuses logging a dive for someone else", async () => {
    await expect(
      as(ANNA, "insert into scores (user_id, played_on, score) values ($1, '2026-10-05', 100)", [
        BOB,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("rejects scores outside 0..700 and duplicate days", async () => {
    await expect(
      as(BOB, "insert into scores (user_id, played_on, score) values ($1, '2026-10-05', 701)", [
        BOB,
      ]),
    ).rejects.toThrow(/check constraint/);
    await expect(
      as(ANNA, "insert into scores (user_id, played_on, score) values ($1, '2026-10-05', 1)", [
        ANNA,
      ]),
    ).rejects.toThrow(/duplicate key/);
  });

  it("lets board mates read each other's scores but hides them from outsiders", async () => {
    await as(BOB, "insert into scores (user_id, played_on, score) values ($1, '2026-10-05', 300)", [
      BOB,
    ]);
    await as(
      OUTSIDER,
      "insert into scores (user_id, played_on, score) values ($1, '2026-10-05', 700)",
      [OUTSIDER],
    );
    const bobSees = await as(BOB, "select score from scores order by score");
    expect(bobSees.rows.map((r) => (r as { score: number }).score)).toEqual([300, 455]);
    const outsiderSees = await as(OUTSIDER, "select score from scores");
    expect(outsiderSees.rows).toHaveLength(1);
    const adminSees = await as(ADMIN, "select count(*)::int as n from scores");
    expect((adminSees.rows[0] as { n: number }).n).toBe(3);
  });

  it("cannot edit a board mate's score", async () => {
    const res = await as(ANNA, "update scores set score = 0 where user_id = $1", [BOB]);
    expect(res.affectedRows ?? 0).toBe(0);
    const bob = await as(BOB, "select score from scores where user_id = $1", [BOB]);
    expect((bob.rows[0] as { score: number }).score).toBe(300);
  });
});

describe("admin helpers", () => {
  it("admin_list_users returns emails only for admins", async () => {
    const admin = await as(ADMIN, "select email from admin_list_users() order by email");
    expect(admin.rows).toHaveLength(4);
    const anna = await as(ANNA, "select email from admin_list_users()");
    expect(anna.rows).toHaveLength(0);
  });

  it("a user cannot promote themselves to admin", async () => {
    await expect(
      as(ANNA, "update profiles set is_admin = true where id = $1", [ANNA]),
    ).rejects.toThrow(/row-level security/);
    const ok = await as(ANNA, "update profiles set display_name = 'Anna K' where id = $1", [
      ANNA,
    ]);
    expect(ok.affectedRows).toBe(1);
  });

  it("a user can create their own profile, but never as admin", async () => {
    const GHOST = "55555555-5555-4555-8555-555555555555";
    await db.query("insert into auth.users (id, email) values ($1, 'ghost@example.com')", [GHOST]);
    await db.query("delete from profiles where id = $1", [GHOST]); // pretend the trigger never ran
    await expect(
      as(GHOST, "insert into profiles (id, display_name, is_admin) values ($1, 'Ghost', true)", [GHOST]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(GHOST, "insert into profiles (id, display_name) values ($1, 'Someone else')", [ANNA]),
    ).rejects.toThrow(/row-level security|duplicate key/);
    const ok = await as(GHOST, "insert into profiles (id, display_name) values ($1, 'Ghost')", [GHOST]);
    expect(ok.affectedRows).toBe(1);
  });

  it("an admin can promote others", async () => {
    const res = await as(ADMIN, "update profiles set is_admin = true where id = $1", [BOB]);
    expect(res.affectedRows).toBe(1);
    const bobIsAdmin = await as(BOB, "select is_admin() as a");
    expect((bobIsAdmin.rows[0] as { a: boolean }).a).toBe(true);
    await as(ADMIN, "update profiles set is_admin = false where id = $1", [BOB]);
  });
});
