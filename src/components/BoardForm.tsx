"use client";

import { useActionState, useState } from "react";
import { createBoard, updateBoard } from "@/app/actions/admin";
import { idle } from "@/app/actions/types";
import { BOARD_EMOJIS } from "@/lib/constants";
import type { Board } from "@/lib/types";
import { Flash } from "./ui";
import { SubmitButton } from "./SubmitButton";

export function BoardForm({ board }: { board?: Board }) {
  const editing = Boolean(board);
  const [state, action] = useActionState(editing ? updateBoard : createBoard, idle);
  const v = state.values ?? {};
  const [emoji, setEmoji] = useState(v.emoji ?? board?.emoji ?? BOARD_EMOJIS[0]);

  return (
    <form action={action} className="space-y-4">
      {board ? <input type="hidden" name="id" value={board.id} /> : null}

      <div>
        <span className="label">Mascot</span>
        <div className="flex flex-wrap gap-2">
          {BOARD_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              aria-pressed={emoji === e}
              className={`h-11 w-11 rounded-2xl text-2xl transition ${
                emoji === e ? "bg-aqua/30 ring-2 ring-aqua" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <input type="hidden" name="emoji" value={emoji} />
      </div>

      <div>
        <label className="label" htmlFor="name">
          Board name
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="Office Divers"
          maxLength={60}
          required
          defaultValue={v.name ?? board?.name ?? ""}
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description <span className="font-normal text-mist/60">(optional)</span>
        </label>
        <input
          id="description"
          name="description"
          className="input"
          placeholder="Loser buys Friday coffee."
          maxLength={300}
          defaultValue={v.description ?? board?.description ?? ""}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Flash state={state} />
        <SubmitButton className={editing ? "btn-aqua" : "btn-primary"} pendingText="Saving…">
          {editing ? "Save changes" : "Create board"}
        </SubmitButton>
      </div>
    </form>
  );
}
