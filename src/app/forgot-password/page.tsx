import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage(props: PageProps<"/forgot-password">) {
  const { error } = await props.searchParams;
  return (
    <AuthShell title="Forgot your password?" subtitle="Type your email and we'll send a link to set a new one.">
      <ForgotPasswordForm linkError={error === "link"} />
    </AuthShell>
  );
}
