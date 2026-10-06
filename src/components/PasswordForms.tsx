"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "@/app/actions/auth";
import { idle } from "@/app/actions/types";
import { SubmitButton } from "./SubmitButton";
import { Flash } from "./ui";

export function ForgotPasswordForm({ linkError }: { linkError?: boolean }) {
  const [state, action] = useActionState(requestPasswordReset, idle);
  return (
    <form action={action} className="space-y-4">
      {linkError && !state.error && !state.success ? (
        <p role="alert" className="rounded-2xl border border-krill/40 bg-krill/10 px-4 py-3 text-sm text-krill-light">
          That link has expired or was opened in a different browser than the one that asked for it. Request a new one
          below and open it here.
        </p>
      ) : null}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          placeholder="you@example.com"
          required
          defaultValue={state.values?.email ?? ""}
          autoComplete="email"
        />
      </div>
      <Flash state={state} />
      <SubmitButton className="btn-primary w-full text-lg" pendingText="Sending…">
        Email me a reset link
      </SubmitButton>
      <p className="text-center text-sm text-mist">
        Remembered it?{" "}
        <Link href="/login" className="text-aqua hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, idle);
  if (state.success) {
    return (
      <div className="space-y-4">
        <Flash state={state} />
        <Link href="/dashboard" className="btn-primary w-full text-lg">
          Go to the dashboard
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Repeat it
        </label>
        <input id="confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
      </div>
      <Flash state={state} />
      <SubmitButton className="btn-primary w-full text-lg" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
