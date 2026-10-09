import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addMember, deleteBoard, removeMember } from "@/app/actions/admin";
import { BoardForm } from "@/components/BoardForm";
import { ConfirmForm } from "@/components/ConfirmForm";
import { JoinRequestList, pairRequests } from "@/components/JoinRequests";
import { Avatar, EmptyState, Nick, Section } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { AdminUser } from "@/lib/types";

export const metadata: Metadata = { title: "Manage board" };

export default async function ManageBoardPage(props: PageProps<"/admin/boards/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();

  const [{ data: board }, { data: memberRows }, { data: users }, { data: requestRows }] = await Promise.all([
    supabase.from("krillion_boards").select("*").eq("id", id).maybeSingle(),
    supabase.from("krillion_board_members").select("user_id").eq("board_id", id),
    supabase.rpc("krillion_admin_list_users"),
    supabase.from("krillion_board_join_requests").select("*").eq("board_id", id),
  ]);
  if (!board) notFound();
  const pending = pairRequests(requestRows ?? [], users ?? [], [board]);

  const memberIds = new Set((memberRows ?? []).map((m) => m.user_id));
  const allUsers: AdminUser[] = users ?? [];
  const members = allUsers.filter((u) => memberIds.has(u.id));
  const others = allUsers.filter((u) => !memberIds.has(u.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-6xl" aria-hidden>
            {board.emoji}
          </span>
          <div>
            <p className="eyebrow">
              <Link href="/admin" className="hover:underline">
                Admin
              </Link>{" "}
              · Manage board
            </p>
            <h1 className="heading text-4xl sm:text-5xl">{board.name}</h1>
          </div>
        </div>
        <Link href={`/boards/${board.id}`} className="btn-ghost">
          View board →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Details" emoji="✏️">
          <BoardForm board={board} />
          <div className="mt-6 border-t border-white/10 pt-4">
            <ConfirmForm
              action={deleteBoard}
              message={`Delete "${board.name}"? Members keep their scores, but this board and its member list are gone for good.`}
            >
              <input type="hidden" name="id" value={board.id} />
              <button type="submit" className="btn-danger btn-sm">
                Delete board
              </button>
            </ConfirmForm>
          </div>
        </Section>

        <div className="space-y-6">
          {pending.length > 0 ? (
            <Section title="Join requests" emoji="🙋" subtitle={`${pending.length} diver${pending.length === 1 ? "" : "s"} asked to join this board.`}>
              <JoinRequestList items={pending} showBoard={false} />
            </Section>
          ) : null}

          <Section title="Members" emoji="🧜" subtitle={`${members.length} diver${members.length === 1 ? "" : "s"} on this board`}>
            {members.length === 0 ? (
              <EmptyState emoji="🐚">Nobody yet. Add divers below.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {members.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
                    <Avatar name={u.display_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display font-semibold">
                        <Nick nick={u.display_name} name={u.full_name} />
                      </div>
                      <div className="truncate text-xs text-mist">
                        {u.full_name ? `${u.full_name} · ` : ""}
                        {u.email}
                      </div>
                    </div>
                    <form action={removeMember}>
                      <input type="hidden" name="board_id" value={board.id} />
                      <input type="hidden" name="user_id" value={u.id} />
                      <button type="submit" className="btn-ghost btn-sm" title="Remove from board">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Add divers" emoji="➕" subtitle="Every registered account not yet on this board.">
            {others.length === 0 ? (
              <EmptyState emoji="🎉">Everyone is already on this board.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {others.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
                    <Avatar name={u.display_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display font-semibold">
                        <Nick nick={u.display_name} name={u.full_name} />
                      </div>
                      <div className="truncate text-xs text-mist">
                        {u.full_name ? `${u.full_name} · ` : ""}
                        {u.email}
                      </div>
                    </div>
                    <form action={addMember}>
                      <input type="hidden" name="board_id" value={board.id} />
                      <input type="hidden" name="user_id" value={u.id} />
                      <button type="submit" className="btn-aqua btn-sm">
                        Add
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
