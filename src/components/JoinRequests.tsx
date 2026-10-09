import Link from "next/link";
import { approveJoinRequest, declineJoinRequest } from "@/app/actions/admin";
import type { AdminUser, Board, JoinRequest } from "@/lib/types";
import { BoardMascot } from "./BoardMascot";
import { Avatar, EmptyState, Nick } from "./ui";

export type PendingRequest = { request: JoinRequest; user: AdminUser; board: Board };

/** Pairs raw request rows with the diver and board they refer to, newest first. */
export function pairRequests(requests: JoinRequest[], users: AdminUser[], boards: Board[]): PendingRequest[] {
  const byUser = new Map(users.map((u) => [u.id, u]));
  const byBoard = new Map(boards.map((b) => [b.id, b]));
  return requests
    .flatMap((request) => {
      const user = byUser.get(request.user_id);
      const board = byBoard.get(request.board_id);
      return user && board ? [{ request, user, board }] : [];
    })
    .sort((a, b) => b.request.created_at.localeCompare(a.request.created_at));
}

/** Admin inbox: who wants to join which board, with Approve / Decline. */
export function JoinRequestList({ items, showBoard = true }: { items: PendingRequest[]; showBoard?: boolean }) {
  if (items.length === 0) {
    return <EmptyState emoji="📭">No pending requests.</EmptyState>;
  }
  return (
    <ul className="space-y-2">
      {items.map(({ request, user, board }) => (
        <li
          key={`${request.board_id}:${request.user_id}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-sun/30 bg-sun/10 px-3 py-2"
        >
          <Avatar name={user.display_name} size="sm" />
          <div className="min-w-0 flex-1 basis-48">
            <div className="font-display font-semibold break-words">
              <Nick nick={user.display_name} name={user.full_name} />
              {showBoard ? (
                <>
                  <span className="font-normal text-mist"> wants to join </span>
                  <Link href={`/admin/boards/${board.id}`} className="hover:underline">
                    <BoardMascot mascot={board.emoji} /> {board.name}
                  </Link>
                </>
              ) : null}
            </div>
            <div className="truncate text-xs text-mist">
              {user.full_name ? `${user.full_name} · ` : ""}
              {user.email} · asked {request.created_at.slice(0, 10)}
            </div>
          </div>
          <div className="ml-auto flex gap-1">
            <form action={approveJoinRequest}>
              <input type="hidden" name="board_id" value={request.board_id} />
              <input type="hidden" name="user_id" value={request.user_id} />
              <button type="submit" className="btn-aqua btn-sm">
                Approve
              </button>
            </form>
            <form action={declineJoinRequest}>
              <input type="hidden" name="board_id" value={request.board_id} />
              <input type="hidden" name="user_id" value={request.user_id} />
              <button type="submit" className="btn-ghost btn-sm">
                Decline
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
