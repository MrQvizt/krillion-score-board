import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <AuthShell title="Welcome back, diver" subtitle="Log in to record today's dive.">
      <AuthForm mode="login" next={nextPath} />
    </AuthShell>
  );
}
