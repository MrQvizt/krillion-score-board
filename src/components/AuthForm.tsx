"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { idle } from "@/app/actions/types";
import { SubmitButton } from "./SubmitButton";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const isSignup = mode === "signup";
  const [state, action] = useActionState(isSignup ? signUp : signIn, idle);
  const v = state.values ?? {};

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {isSignup ? (
        <>
          <div>
            <label className="label" htmlFor="full_name">
              Name
            </label>
            <input
              id="full_name"
              name="full_name"
              className="input"
              placeholder="Anna Andersson"
              maxLength={80}
              required
              defaultValue={v.full_name ?? ""}
              autoComplete="name"
            />
            <p className="mt-1 text-xs text-mist">Only shown when someone hovers over your nick.</p>
          </div>
          <div>
            <label className="label" htmlFor="display_name">
              Nick name
            </label>
            <input
              id="display_name"
              name="display_name"
              className="input"
              placeholder="Captain Taleggio"
              maxLength={40}
              required
              defaultValue={v.display_name ?? ""}
              autoComplete="nickname"
            />
          </div>
        </>
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
          defaultValue={v.email ?? ""}
          autoComplete="email"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          required
          minLength={isSignup ? 8 : 1}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-2xl border border-krill/40 bg-krill/10 px-4 py-3 text-sm text-krill-light">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-2xl border border-aqua/40 bg-aqua/10 px-4 py-3 text-sm text-aqua">
          {state.success}
        </p>
      ) : null}

      <SubmitButton className="btn-primary w-full text-lg" pendingText={isSignup ? "Diving in…" : "Logging in…"}>
        {isSignup ? "Dive in 🦐" : "Log in"}
      </SubmitButton>

      <p className="text-center text-sm text-mist">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-aqua hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-aqua hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
