import { SNORKEL_DUCK } from "@/lib/constants";

/** A board's mascot at the surrounding font size: its emoji, or the drawing for a picture mascot key. */
export function BoardMascot({ mascot }: { mascot: string }) {
  return mascot === SNORKEL_DUCK ? <SnorkelDuck /> : <>{mascot}</>;
}

/** A rubber duck in a diving mask, snorkelling. Sized to sit in a line of text like an emoji. */
function SnorkelDuck() {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Duck with a diving mask and snorkel"
      className="inline-block h-[1.25em] w-[1.25em] align-[-0.25em]"
    >
      <path d="M5 37c2-2 5-1 8 1 4-6 11-8 19-8h5c10 0 17 6 17 14 0 9-9 14-24 14C13 58 5 52 5 44z" fill="#FFD166" />
      <path d="M17 42c5-5 15-5 20-1-2 6-11 9-18 6-3-1-3-3-2-5z" fill="#F0B23F" />
      <circle cx="39" cy="23" r="13" fill="#FFD166" />
      <path d="M49 26c6-1 12 0 13 3 0 3-5 4-9 4h-5z" fill="#FF8A3D" />
      <path d="M49 29.5h7" stroke="#E0662A" strokeWidth="1.2" strokeLinecap="round" />
      {/* mask strap, frame, glass and eye */}
      <path d="M38 17c-6-2-9-1-12 3" stroke="#16A89A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="37" y="12" width="17" height="13" rx="5" fill="#16A89A" />
      <rect x="39.5" y="14.5" width="12" height="8" rx="3" fill="#BFF4EC" />
      <circle cx="46" cy="18.5" r="2.3" fill="#071B36" />
      <circle cx="46.8" cy="17.7" r="0.8" fill="#FFFFFF" />
      <path d="M41 16.2l2.5-0.6" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
      {/* snorkel from the bill up past the strap, with its clip, top and bubbles */}
      <path
        d="M49 31c-3 4-9 4-12 1-2-2-3-6-3.5-10L33 6"
        stroke="#FF6F61"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="30.5" y="2.5" width="5" height="5" rx="1.5" fill="#3EE6C7" />
      <rect x="31" y="17.5" width="5" height="3" rx="1" fill="#0B6E66" />
      <circle cx="40" cy="5" r="2" fill="none" stroke="#3EE6C7" strokeWidth="1.2" />
      <circle cx="44" cy="1.8" r="1.3" fill="none" stroke="#3EE6C7" strokeWidth="1" />
      {/* water */}
      <ellipse cx="31" cy="55" rx="29" ry="6.5" fill="#3EE6C7" opacity="0.3" />
      <path
        d="M9 55.5c3-2 6-2 9 0M44 56c3-2 6-2 9 0"
        stroke="#3EE6C7"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
