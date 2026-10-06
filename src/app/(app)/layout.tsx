import { Nav } from "@/components/Nav";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession();
  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-mist/60">
        Game days follow UTC, just like Krillion&apos;s daily reset. 1 point = 4 metres of depth.
      </footer>
    </>
  );
}
