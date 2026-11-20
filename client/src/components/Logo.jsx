// New Asad Tech logo (option 2, picked 2026-11-20): simple solid navy "A"
// (Meta-style), replacing the old gold Heera diamond. Served as images
// from /public so the mark stays pixel-identical everywhere.
// DiamondMark = navy A on white (white backgrounds: sidebar, login, admin,
// upgrade modal). DiamondTile = white A on navy #0F2A4A tile (topbar and
// chat avatars, as the old navy tile was). Export names are unchanged so no
// call site needed editing; only this file renders the mark.
export function DiamondMark({ size = 40, className = "" }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      className={className}
      alt="Asad Tech logo"
      draggable={false}
    />
  );
}

export function DiamondTile({ size = 36, className = "" }) {
  return (
    <img
      src="/logo-mark-navy.png"
      width={size}
      height={size}
      className={className}
      alt="Asad Tech logo"
      draggable={false}
      style={{ borderRadius: Math.max(6, Math.round(size * 0.22)) }}
    />
  );
}
