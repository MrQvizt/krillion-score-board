import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <span
        className={`inline-block animate-wiggle motion-reduce:animate-none ${big ? "text-5xl" : "text-2xl"}`}
        aria-hidden
      >
        🦐
      </span>
      <span className={`heading ${big ? "text-3xl" : "text-lg"} group-hover:text-aqua transition`}>
        {SITE_NAME}
      </span>
    </Link>
  );
}
