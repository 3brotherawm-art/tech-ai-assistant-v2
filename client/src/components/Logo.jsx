// Flat Heera (diamond) logo mark — solid colours only, no gradients, no glow.
// Used in the header, sidebar and chat avatars. Transparent background.
export function DiamondMark({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <g>
        <path d="M14 26 L22 12 L32 12 L32 26 Z" fill="#d9a441" />
        <path d="M22 12 L42 12 L32 26 Z" fill="#f2c14e" />
        <path d="M42 12 L50 26 L32 26 Z" fill="#c9922e" />
        <path d="M14 26 L32 26 L32 52 Z" fill="#c9922e" />
        <path d="M50 26 L32 26 L32 52 Z" fill="#e8b84b" />
      </g>
    </svg>
  );
}

// Same mark on a solid navy tile (for avatars / app icon style use).
export function DiamondTile({ size = 36, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#0f2a4a" />
      <g>
        <path d="M14 26 L22 12 L32 12 L32 26 Z" fill="#d9a441" />
        <path d="M22 12 L42 12 L32 26 Z" fill="#f2c14e" />
        <path d="M42 12 L50 26 L32 26 Z" fill="#c9922e" />
        <path d="M14 26 L32 26 L32 52 Z" fill="#c9922e" />
        <path d="M50 26 L32 26 L32 52 Z" fill="#e8b84b" />
      </g>
    </svg>
  );
}
