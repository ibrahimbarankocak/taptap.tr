// Markanın imza görseli: kartlardaki parlayan NFC dalga halkaları (SVG, sunucuda çizilir, JS yok).
// Renk paleti kart tipine göre: IBAN turuncu, Google mavi-mor, WhatsApp yeşil, Instagram pembe.
export const PALETTES = {
  iban: ['#FDE68A', '#F59E0B', '#EA580C', '#9A3412'],
  google: ['#93C5FD', '#3B82F6', '#8B5CF6', '#4C1D95'],
  whatsapp: ['#BBF7D0', '#22C55E', '#15803D', '#14532D'],
  instagram: ['#FBCFE8', '#EC4899', '#A855F7', '#701A75'],
  mixed: ['#FDE68A', '#F97316', '#EC4899', '#8B5CF6'],
} as const;

export type Palette = keyof typeof PALETTES;

export default function NeonWaves({
  palette = 'mixed',
  className = '',
  rings = 7,
  id,
}: {
  palette?: Palette;
  className?: string;
  rings?: number;
  id: string; // aynı sayfada birden çok kullanım için benzersiz gradient id
}) {
  const colors = PALETTES[palette];
  return (
    <svg viewBox="0 0 600 600" className={`neon-spin ${className}`} aria-hidden fill="none">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          {colors.map((c, i) => (
            <stop key={c} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <radialGradient id={`r-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors[1]} stopOpacity="0.35" />
          <stop offset="70%" stopColor={colors[2]} stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="300" fill={`url(#r-${id})`} />
      <g stroke={`url(#g-${id})`} strokeLinecap="round">
        {Array.from({ length: rings }, (_, i) => {
          // en dıştaki halka da çizim alanının içinde kalsın (yoksa kenarda düz bir çizgi gibi kesiliyor)
          const r = 55 + i * (230 / Math.max(1, rings - 1));
          return (
            <g key={i}>
              {/* kalın, soluk hale + ince parlak çizgi = neon görünümü (blur filtresi olmadan, telefonda hızlı) */}
              <circle cx="300" cy="300" r={r} strokeWidth={10 - i * 0.6} opacity={0.12} />
              <circle cx="300" cy="300" r={r} strokeWidth={2.2} opacity={0.85 - i * 0.08} strokeDasharray={`${r * 2.2} ${r * 0.9}`} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
