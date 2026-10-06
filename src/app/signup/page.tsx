import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell title="Join the shoal" subtitle="Email, password, a name. That's it. No confirmation email.">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
