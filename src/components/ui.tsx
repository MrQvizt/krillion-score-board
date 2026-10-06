import { MAX_DAILY_SCORE } from "@/lib/constants";

const AVATAR_COLORS = [
  "from-krill to-krill-light",
  "from-aqua to-aqua-deep",
  "from-sun to-bronze",
  "from-shelf to-aqua",
  "from-krill-light to-sun",
  "from-aqua-deep to-shelf",
];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const color = AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-14 w-14 text-xl" : "h-9 w-9 text-sm";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-abyss ${color} ${dims}`}
    >
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

/** A diver's nick, with their real name as the hover title when it is known. */
export function Nick({ nick, name, className }: { nick: string; name?: string | null; className?: string }) {
  return (
    <span className={className} title={name ?? undefined}>
      {nick}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = "aqua",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "aqua" | "krill" | "sun";
}) {
  const ring = {
    aqua: "from-aqua/20 to-transparent",
    krill: "from-krill/20 to-transparent",
    sun: "from-sun/20 to-transparent",
  }[accent];
  return (
    <div className={`card bg-gradient-to-br p-4 sm:p-5 ${ring}`}>
      <p className="eyebrow">{label}</p>
      <p className="heading mt-2 text-3xl sm:text-4xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-mist">{hint}</p> : null}
    </div>
  );
}

export function Section({
  title,
  emoji,
  subtitle,
  children,
  action,
}: {
  title: string;
  emoji?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="heading flex items-center gap-2 text-xl sm:text-2xl">
            {emoji ? <span aria-hidden>{emoji}</span> : null}
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-sm text-mist">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Horizontal bar scaled to a max. */
export function DepthBar({
  value,
  max = MAX_DAILY_SCORE,
  color = "from-aqua to-aqua-deep",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ emoji = "🫧", children }: { emoji?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-mist">
      <div className="mb-2 text-3xl">{emoji}</div>
      {children}
    </div>
  );
}

export function Flash({ state }: { state: { error?: string; success?: string } }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-2xl border border-krill/40 bg-krill/10 px-4 py-3 text-sm text-krill-light">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="animate-pop rounded-2xl border border-aqua/40 bg-aqua/10 px-4 py-3 text-sm text-aqua">
        {state.success}
      </p>
    );
  }
  return null;
}
