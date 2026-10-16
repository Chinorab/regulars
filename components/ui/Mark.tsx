// The Regulars doorway mark (design/Favicon.dc.html). A brand mark, not an icon glyph.
export function Mark({ size = 30, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flex: "none" }}
    >
      <rect width="32" height="32" rx="7" fill="var(--clay)" />
      <path d="M10 26V14.5a6 6 0 0 1 12 0V26z" fill="var(--lamp)" />
    </svg>
  );
}
