/** Decorative rising bubbles. Fixed values so server and client render identically. */
const BUBBLES = [
  { left: 4, size: 14, delay: 0, duration: 16 },
  { left: 12, size: 8, delay: 3, duration: 13 },
  { left: 21, size: 22, delay: 7, duration: 19 },
  { left: 33, size: 10, delay: 1, duration: 15 },
  { left: 44, size: 16, delay: 9, duration: 18 },
  { left: 55, size: 7, delay: 5, duration: 12 },
  { left: 63, size: 26, delay: 11, duration: 21 },
  { left: 72, size: 12, delay: 2, duration: 14 },
  { left: 81, size: 9, delay: 8, duration: 13 },
  { left: 90, size: 18, delay: 4, duration: 17 },
  { left: 96, size: 11, delay: 10, duration: 15 },
];

export function Bubbles() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="absolute bottom-0 block rounded-full border border-aqua/30 bg-aqua/10 animate-rise motion-reduce:hidden"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
