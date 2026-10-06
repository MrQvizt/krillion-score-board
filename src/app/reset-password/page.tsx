import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/PasswordForms";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "New password" };

/** Reached from the reset email (the callback signs the visitor in first) or from the footer while logged in. */
export default async function ResetPasswordPage() {
  const { user } = await requireSession();
  return (
    <AuthShell title="Set a new password" subtitle={`For ${user.email ?? "your account"}.`}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
