import type { Metadata } from "next";
import Link from "next/link";
import { setAdmin } from "@/app/actions/admin";
import { BoardForm } from "@/components/BoardForm";
import { Avatar, EmptyState, Section } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { AdminUser } from "@/lib/types";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const { supabase, user } = await requireAdmin();

  const [{ data: boards }, { data: memberRows }, { data: users }] = await Promise.all([
    supabase.from("boards").select("*").order("created_at"),
    supabase.from("board_members").select("board_id, user_id"),
    supabase.rpc("admin_list_users"),
  ]);

  const memberCount = new Map<string, number>();
  const boardsPerUser = new Map<string, number>();
  for (const m of memberRows ?? []) {
    memberCount.set(m.board_id, (memberCount.get(m.board_id) ?? 0) + 1);
    boardsPerUser.set(m.user_id, (boardsPerUser.get(m.user_id) ?? 0) + 1);
  }
  const allUsers: AdminUser[] = users ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Captain&apos;s quarters</p>
        <h1 className="heading text-4xl sm:text-5xl">Admin</h1>
        <p className="mt-2 text-mist">Create score boards and decide who dives on which one.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Section title="New board" emoji="✨" subtitle="You'll be added to it automatically.">
          <BoardForm />
        </Section>

        <Section title="Boards" emoji="🏆" subtitle={`${boards?.length ?? 0} board${boards?.length === 1 ? "" : "s"}`}>
          {!boards?.length ? (
            <EmptyState emoji="🗺️">No boards yet. Create the first one on the left.</EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {boards.map((b) => (
                <li key={b.id} className="card-solid flex items-center gap-3 p-4">
                  <span className="text-3xl" aria-hidden>
                    {b.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="heading truncate text-lg">{b.name}</div>
                    <div className="text-xs text-mist">
                      {memberCount.get(b.id) ?? 0} member{memberCount.get(b.id) === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Link href={`/admin/boards/${b.id}`} className="btn-aqua btn-sm">
                      Manage
                    </Link>
                    <Link href={`/boards/${b.id}`} className="btn-ghost btn-sm">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Divers" emoji="🧜" subtitle={`${allUsers.length} account${allUsers.length === 1 ? "" : "s"}. Assign them to boards from a board's manage page.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-xs text-mist">
                <th className="font-semibold">Diver</th>
                <th className="font-semibold">Email</th>
                <th className="font-semibold">Boards</th>
                <th className="font-semibold">Joined</th>
                <th className="text-right font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td className="rounded-l-xl bg-white/5 py-2 pl-2 pr-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={u.display_name} size="sm" />
                      <span className="font-display font-semibold">{u.display_name}</span>
                      {u.id === user.id ? <span className="chip">you</span> : null}
                    </span>
                  </td>
                  <td className="bg-white/5 pr-3 text-mist">{u.email}</td>
                  <td className="bg-white/5 pr-3 text-mist">{boardsPerUser.get(u.id) ?? 0}</td>
                  <td className="bg-white/5 pr-3 text-mist">{u.created_at.slice(0, 10)}</td>
                  <td className="rounded-r-xl bg-white/5 pr-2 text-right">
                    {u.is_admin ? (
                      u.id === user.id ? (
                        <span className="chip border-sun/40 text-sun">⭐ admin</span>
                      ) : (
                        <form action={setAdmin} className="inline">
                          <input type="hidden" name="user_id" value={u.id} />
                          <input type="hidden" name="value" value="false" />
                          <button type="submit" className="chip border-sun/40 text-sun hover:bg-sun/10" title="Remove admin">
                            ⭐ admin ✕
                          </button>
                        </form>
                      )
                    ) : (
                      <form action={setAdmin} className="inline">
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="value" value="true" />
                        <button type="submit" className="chip hover:border-sun/40 hover:text-sun" title="Make admin">
                          make admin
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
