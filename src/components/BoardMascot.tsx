import { useId } from "react";
import { SNORKEL_DUCK } from "@/lib/constants";

/** A board's mascot at the surrounding font size: its emoji, or the drawing for a picture mascot key. */
export function BoardMascot({ mascot }: { mascot: string }) {
  return mascot === SNORKEL_DUCK ? <SnorkelDuck /> : <>{mascot}</>;
}

// Shapes used more than once: as fills and as clip paths.
const BODY = "M10 43C10 35.5 16 32 23 32.5L38 33.5C44 34 50 31 55 26.5C57.5 24.2 60.5 25 60.6 28.5C60.8 42 55 55 38 56L23 56C15 56 10 51 10 43Z";
const NECK = "M31 28C34 31.6 38.5 33.4 45 33.4L45 35L30 35Z"; // blends the back of the head into the back
const LENS =
  "M15.6 13.5C15.8 13 16.3 12.8 16.9 12.85L23 13.3C23.7 13.35 24.1 13.8 24.1 14.6L24.1 21.1C24.1 22.2 23.4 22.6 22.3 22.5L17.6 22.1C15.8 23.1 13.8 23.8 12.2 23.5C11.6 23.4 11.4 22.9 11.6 22.3Z";
const TUBE = "M31.6 3L30.4 22C30.1 27 27.4 30 22.5 30.3C19.5 30.5 17.2 30 15.2 29.2";

/** A rubber duck in profile, wearing a diving mask and snorkel. Sized to sit in a line of text like an emoji. */
function SnorkelDuck() {
  // Clip path ids must be unique when several ducks share a page.
  const id = useId().replace(/[^\w-]/g, "");
  const duck = `${id}-duck`;
  const head = `${id}-head`;
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Duck with a diving mask and snorkel"
      className="inline-block h-[1.25em] w-[1.25em] align-[-0.25em]"
    >
      <defs>
        <clipPath id={duck}>
          <path d={BODY} />
          <path d={NECK} />
          <circle cx="23.5" cy="20.5" r="13" />
        </clipPath>
        <clipPath id={head}>
          <circle cx="23.5" cy="20.5" r="13" />
        </clipPath>
      </defs>

      {/* one yellow silhouette, shaded inside its outline */}
      <path d={BODY} fill="#FFC93C" />
      <circle cx="23.5" cy="20.5" r="13" fill="#FFC93C" />
      <path d={NECK} fill="#FFC93C" />
      <g clipPath={`url(#${duck})`}>
        <ellipse cx="36" cy="62" rx="30" ry="10" fill="#EFA21B" />
        <ellipse cx="44" cy="31" rx="9" ry="2.6" fill="#FFE07A" opacity="0.8" transform="rotate(-22 44 31)" />
      </g>
      <path d="M32.5 44C35.5 38.5 46 37 53 39.5C52 46 45 51 37.5 50.5C34 50.2 32 47.4 32.5 44Z" fill="#F4B02A" />

      {/* head highlight and the mask strap, wrapped round the head */}
      <g clipPath={`url(#${head})`}>
        <ellipse cx="29.5" cy="9.4" rx="4.2" ry="1.8" fill="#FFE07A" transform="rotate(18 29.5 9.4)" />
        <path d="M25 13.4C29.5 12.8 33.5 13.6 36.6 16L36.6 21C33.5 18.6 29.5 17.9 25 18.3Z" fill="#0F7F75" />
      </g>

      {/* snorkel: clipped to the strap, its mouthpiece tucked under the bill */}
      <ellipse cx="15.4" cy="29.6" rx="1.4" ry="1.8" fill="#3EE6C7" />
      <path d={TUBE} stroke="#D44E45" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={TUBE} stroke="#FF6F61" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="28.6" y="13.9" width="4.4" height="3.4" rx="1.1" fill="#0B6E66" transform="rotate(4 30.8 15.6)" />
      <rect x="29" y="0.9" width="5.2" height="3.8" rx="1.5" fill="#3EE6C7" transform="rotate(4 31.6 2.8)" />

      {/* bill */}
      <path d="M14.5 22.2C8.5 21.5 2.6 23.4 1.8 26.4C1.3 28.6 4.6 30.1 9 29.8L15 28.8Z" fill="#FF8A1F" />
      <path d="M2.8 28.3C4.9 31.4 10 32.3 15 30.7L15 28.8L9 29.8C6.2 29.9 4.1 29.4 2.8 28.3Z" fill="#E5650F" />

      {/* mask: frame following the face, the eye seen through tinted glass, a glint */}
      <path
        d="M14 12.6C14.4 11.4 15.3 10.9 16.6 11L23.6 11.5C25 11.6 25.9 12.6 25.9 14.1L25.9 21.3C25.9 23.2 24.6 24.3 22.6 24.1L18 23.7C16 25 13.4 26 11.2 25.6C9.8 25.3 9.2 24.2 9.5 22.9Z"
        fill="#16A89A"
      />
      <path d={LENS} fill="#FFE39B" />
      <circle cx="19.8" cy="17.6" r="2.5" fill="#071B36" />
      <circle cx="20.6" cy="16.8" r="0.9" fill="#FFFFFF" />
      <path d={LENS} fill="#BFF4EC" opacity="0.3" />
      <path d="M14.6 20.6L17.2 15.8" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />

      {/* bubbles and ripples */}
      <circle cx="38" cy="6.5" r="1.9" fill="none" stroke="#3EE6C7" strokeWidth="1.1" />
      <circle cx="42.2" cy="2.8" r="1.3" fill="none" stroke="#3EE6C7" strokeWidth="1" />
      <path
        d="M2 59.5C5 58 8 58 11 59.5M53 59.8C56 58.3 59 58.3 62 59.8"
        stroke="#3EE6C7"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
