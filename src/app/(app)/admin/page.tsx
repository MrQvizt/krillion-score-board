import type { Metadata } from "next";
import Link from "next/link";
import { setAdmin, setFullName } from "@/app/actions/admin";
import { BoardForm } from "@/components/BoardForm";
import { BoardMascot } from "@/components/BoardMascot";
import { JoinRequestList, pairRequests } from "@/components/JoinRequests";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { Avatar, EmptyState, Nick, Section } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { AdminUser } from "@/lib/types";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const { supabase, user } = await requireAdmin();

  const [{ data: boards }, { data: memberRows }, { data: users }, { data: requestRows }] = await Promise.all([
    supabase.from("krillion_boards").select("*").order("created_at"),
    supabase.from("krillion_board_members").select("board_id, user_id"),
    supabase.rpc("krillion_admin_list_users"),
    supabase.from("krillion_board_join_requests").select("*"),
  ]);
  const pending = pairRequests(requestRows ?? [], users ?? [], boards ?? []);

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

      <Section
        title="Join requests"
        emoji="🙋"
        subtitle={pending.length ? `${pending.length} diver${pending.length === 1 ? "" : "s"} waiting for a yes.` : "Divers can ask to join a board from their dashboard; the requests land here."}
      >
        <JoinRequestList items={pending} />
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section title="New board" emoji="✨" subtitle="You'll be added to it automatically.">
          <BoardForm />
        </Section>

        <Section title="Boards" emoji="🏆" subtitle={`${boards?.length ?? 0} board${boards?.length === 1 ? "" : "s"}`}>
          {!boards?.length ? (
            <EmptyState emoji="🗺️">No boards yet. Create the first one on the left.</EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {boards.map((b) => (
                <li key={b.id} className="card-solid flex items-center gap-3 p-4">
                  <span className="text-3xl" aria-hidden>
                    <BoardMascot mascot={b.emoji} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="heading text-lg leading-snug break-words">{b.name}</div>
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

      <Section title="Divers" emoji="🧜" subtitle={`${allUsers.length} account${allUsers.length === 1 ? "" : "s"}. Add a real name to show it on hover over the nick. Setting a password here also sets it for Arena Tracker, since accounts are shared.`}>
        {/* Up to xl: one card per diver, since the table needs ~1000px. */}
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:hidden">
          {allUsers.map((u) => {
            const boardCount = boardsPerUser.get(u.id) ?? 0;
            return (
              <li key={u.id} className="space-y-3 rounded-2xl bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={u.display_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display font-semibold">
                        <Nick nick={u.display_name} name={u.full_name} />
                      </span>
                      {u.id === user.id ? <span className="chip">you</span> : null}
                    </div>
                    <div className="truncate text-xs text-mist">{u.email}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-mist">
                  <span>
                    {boardCount} board{boardCount === 1 ? "" : "s"} · joined{" "}
                    <span className="whitespace-nowrap">{u.created_at.slice(0, 10)}</span>
                  </span>
                  <RoleToggle u={u} self={u.id === user.id} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-mist">Real name</p>
                  <FullNameForm u={u} inputClassName="min-w-0 flex-1" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-mist">Password</p>
                  <SetPasswordForm userId={u.id} nick={u.display_name} inputClassName="min-w-0 flex-1" />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[980px] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-xs text-mist">
                <th className="font-semibold">Nick</th>
                <th className="font-semibold">Name</th>
                <th className="font-semibold">Email</th>
                <th className="font-semibold">Password</th>
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
                      <span className="font-display font-semibold">
                        <Nick nick={u.display_name} name={u.full_name} />
                      </span>
                      {u.id === user.id ? <span className="chip">you</span> : null}
                    </span>
                  </td>
                  <td className="bg-white/5 pr-3">
                    <FullNameForm u={u} inputClassName="w-44" />
                  </td>
                  <td className="bg-white/5 pr-3 text-mist">{u.email}</td>
                  <td className="bg-white/5 pr-3">
                    <SetPasswordForm userId={u.id} nick={u.display_name} />
                  </td>
                  <td className="bg-white/5 pr-3 text-mist">{boardsPerUser.get(u.id) ?? 0}</td>
                  <td className="bg-white/5 pr-3 text-mist">{u.created_at.slice(0, 10)}</td>
                  <td className="rounded-r-xl bg-white/5 pr-2 text-right">
                    <RoleToggle u={u} self={u.id === user.id} />
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

function FullNameForm({ u, inputClassName }: { u: AdminUser; inputClassName: string }) {
  return (
    <form action={setFullName} className="flex items-center gap-1">
      <input type="hidden" name="user_id" value={u.id} />
      <input
        name="full_name"
        className={`input ${inputClassName}`}
        placeholder="Add name"
        maxLength={80}
        defaultValue={u.full_name ?? ""}
        aria-label={`Real name for ${u.display_name}`}
        autoComplete="off"
      />
      <button type="submit" className="btn-ghost btn-sm">
        Save
      </button>
    </form>
  );
}

/** Admin badge, or the button that grants or revokes admin. You cannot demote yourself. */
function RoleToggle({ u, self }: { u: AdminUser; self: boolean }) {
  if (u.is_admin && self) return <span className="chip border-sun/40 text-sun">⭐ admin</span>;
  return (
    <form action={setAdmin} className="inline">
      <input type="hidden" name="user_id" value={u.id} />
      <input type="hidden" name="value" value={u.is_admin ? "false" : "true"} />
      {u.is_admin ? (
        <button type="submit" className="chip border-sun/40 text-sun hover:bg-sun/10" title="Remove admin">
          ⭐ admin ✕
        </button>
      ) : (
        <button type="submit" className="chip hover:border-sun/40 hover:text-sun" title="Make admin">
          make admin
        </button>
      )}
    </form>
  );
}
