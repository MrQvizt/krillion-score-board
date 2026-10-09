"use client";

import { useEffect, useRef } from "react";

/** The top bar's secondary links folded into a dropdown, for narrow screens. */
export function NavMenu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  // A <details> only closes from its own summary; also close it on a tap outside or Escape.
  useEffect(() => {
    function close(e: PointerEvent | KeyboardEvent) {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className={`group relative ${className}`}>
      <summary
        className="btn-ghost btn-sm cursor-pointer list-none px-2.5 [&::-webkit-details-marker]:hidden"
        aria-label="Menu"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" className="group-open:hidden" />
          <path d="M5 5l10 10M15 5L5 15" className="hidden group-open:block" />
        </svg>
      </summary>
      <div
        className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-deep/95 p-2 shadow-xl shadow-black/40 backdrop-blur-md"
        onClick={(e) => {
          // Following a link keeps this layout mounted, so close the menu by hand.
          if ((e.target as HTMLElement).closest("a") && ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
