import Link from "next/link";
import { SITE_NAME, SITE_SHORT_NAME } from "@/lib/constants";

/** `compact` shortens the name on phones, where the top bar has no room for all of it. */
export function Logo({ href = "/", size = "md", compact = false }: { href?: string; size?: "md" | "lg"; compact?: boolean }) {
  const big = size === "lg";
  return (
    <Link href={href} className="group inline-flex shrink-0 items-center gap-2" aria-label={SITE_NAME}>
      <span
        className={`inline-block animate-wiggle motion-reduce:animate-none ${big ? "text-5xl" : "text-2xl"}`}
        aria-hidden
      >
        🦐
      </span>
      <span className={`heading whitespace-nowrap ${big ? "text-3xl" : "text-lg"} group-hover:text-aqua transition`}>
        {compact ? (
          <>
            <span className="sm:hidden">{SITE_SHORT_NAME}</span>
            <span className="hidden sm:inline">{SITE_NAME}</span>
          </>
        ) : (
          SITE_NAME
        )}
      </span>
    </Link>
  );
}
