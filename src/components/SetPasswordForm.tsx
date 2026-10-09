"use client";

import { useActionState } from "react";
import { setUserPassword } from "@/app/actions/admin";
import { idle } from "@/app/actions/types";
import { SubmitButton } from "./SubmitButton";

/** Inline "give this diver a new password" control for the admin's divers table. */
export function SetPasswordForm({
  userId,
  nick,
  inputClassName = "w-40",
}: {
  userId: string;
  nick: string;
  inputClassName?: string;
}) {
  const [state, action] = useActionState(setUserPassword, idle);
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input type="hidden" name="user_id" value={userId} />
        <input
          name="password"
          type="password"
          className={`input ${inputClassName}`}
          placeholder="New password"
          minLength={8}
          required
          autoComplete="new-password"
          aria-label={`New password for ${nick}`}
        />
        <SubmitButton className="btn-ghost btn-sm" pendingText="Saving…">
          Set
        </SubmitButton>
      </div>
      {state.error ? (
        <span role="alert" className="text-xs text-krill-light">
          {state.error}
        </span>
      ) : state.success ? (
        <span role="status" className="text-xs text-aqua">
          {state.success}
        </span>
      ) : null}
    </form>
  );
}
