import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { MAX_DAILY_SCORE, SITE_TAGLINE } from "@/lib/constants";

const FEATURES = [
  {
    emoji: "📝",
    title: "Log your dive",
    text: `Finished today's seven prompts? Type in your score (0–${MAX_DAILY_SCORE}) and it goes straight on the board.`,
  },
  {
    emoji: "🏆",
    title: "Climb the board",
    text: "Deepest single dive and biggest weekly total, with a fresh race every Monday.",
  },
  {
    emoji: "🔥",
    title: "Keep the streak",
    text: "Play every day and watch the flames stack up. Miss one and it's back to dry land.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost btn-sm">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary btn-sm">
            Join
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="animate-float text-8xl drop-shadow-[0_0_30px_rgba(62,230,199,0.4)] motion-reduce:animate-none">
          🦐
        </div>
        <p className="eyebrow mt-8">Daily dives · Weekly glory</p>
        <h1 className="heading mt-3 max-w-3xl text-5xl leading-[1.05] sm:text-7xl">
          Out-krill your <span className="text-krill-light">friends</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-mist">
          {SITE_TAGLINE} The obvious answer loses in Krillion, but the obvious choice for bragging
          rights is right here.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary text-lg">
            Create an account
          </Link>
          <Link href="/login" className="btn-ghost text-lg">
            I already have one
          </Link>
        </div>
        <p className="mt-4 text-sm text-mist/70">Email and password. No confirmation emails, no fuss.</p>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <div className="text-4xl">{f.emoji}</div>
            <h2 className="heading mt-3 text-xl">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="pb-6 text-center text-xs text-mist/60">
        A fan-made score board. Play the actual game at{" "}
        <a href="https://krillion.io/" className="text-aqua hover:underline" rel="noreferrer">
          krillion.io
        </a>
        . Not affiliated with Krillion.
      </footer>
    </main>
  );
}
