'use client';
// Bağımlılıksız grafik bileşenleri (SVG/HTML). Admin paneli koyu temalı; renkler koyu yüzey
// (#171717) için doğrulanmış kategorik paletten geliyor.
import { useState, useRef, useLayoutEffect, type ReactNode } from 'react';
import { Table2, BarChart3 } from 'lucide-react';

export const VIZ = {
  series: ['#3987e5', '#d95926', '#199e70', '#c98500'], // mavi, turuncu, aqua, sarı — bu sırayla
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#898781',
  text2: '#c3c2b7',
  surface: '#171717',
};

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
export const fmtCompactMoney = (n: number) =>
  '₺' + new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const fmtInt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n));
export const fmtPct = (n: number) => `%${Math.round(n * 100)}`;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// 0'dan başlayan, "yuvarlak" eksen değerleri
// integer: sayım verisinde 0.25 gibi ara değerler olmasın (eksen "0, 0, 1, 1" göstermesin)
function niceTicks(max: number, count = 4, integer = false) {
  if (max <= 0) return [0, 1];
  const raw = integer ? Math.max(1, max / count) : max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const multipliers = integer && mag < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]; // 2.5 adım tam sayı vermez
  const step = multipliers.map((m) => m * mag).find((s) => s >= raw) || raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

// Üstü 4px yuvarlatılmış, tabanı düz sütun
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export type TableSpec = { columns: string[]; rows: (string | number)[][] };

// Başlık + grafik/tablo geçişi olan kart
export function ChartCard({
  title, subtitle, table, actions, children,
}: { title: string; subtitle?: string; table?: TableSpec; actions?: ReactNode; children: ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="font-bold text-neutral-100">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable(!showTable)}
              className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              title={showTable ? 'Grafiği göster' : 'Tabloyu göster'}
              aria-label={showTable ? 'Grafiği göster' : 'Tabloyu göster'}
            >
              {showTable ? <BarChart3 size={14} /> : <Table2 size={14} />}
            </button>
          )}
        </div>
      </div>
      {showTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-800">
                {table.columns.map((c, i) => (
                  <th key={c} className={`p-2 ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-neutral-800/60 last:border-0">
                  {r.map((v, j) => (
                    <td key={j} className={`p-2 ${j === 0 ? 'text-left text-neutral-200' : 'text-right text-neutral-300'}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 min-w-0">
      <p className="text-xs text-neutral-400 flex items-center gap-1.5">{tone}{label}</p>
      <p className="text-2xl font-semibold text-white mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// Dikey sütun grafiği (tek seri) — hover'da ipucu, son sütunda değer etiketi
export function ColumnChart({
  data, format, color = VIZ.series[0], height = 220, tooltip,
}: {
  data: { label: string; value: number }[];
  format: (n: number) => string;
  color?: string;
  height?: number;
  tooltip?: (i: number) => ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { top: 22, right: 8, bottom: 26, left: 52 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max, 4, data.every((d) => Number.isInteger(d.value)));
  const top = ticks[ticks.length - 1] || 1;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 44))));
  const last = data.length - 1;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Sütun grafiği" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? VIZ.axis : VIZ.grid} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={VIZ.muted} className="tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + band * i + band / 2;
            const h = (d.value / top) * innerH;
            return (
              <g key={d.label}>
                {hover === i && <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill="#ffffff" opacity={0.04} />}
                {h > 0 && <path d={columnPath(cx - barW / 2, y(d.value), barW, h)} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />}
                {/* Son etiketi her zaman göster; bir önceki etiketle çakışacaksa onu atla */}
                {((i % labelEvery === 0 && !(i !== last && last - i < labelEvery)) || i === last) && (
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={VIZ.muted}>{d.label}</text>
                )}
                {i === last && d.value > 0 && hover === null && (
                  <text x={cx} y={y(d.value) - 6} textAnchor="middle" fontSize={11} fill={VIZ.text2} fontWeight={600}>{format(d.value)}</text>
                )}
                {/* Geniş hover hedefi */}
                <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <div
          className="absolute pointer-events-none bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap z-10"
          style={{
            left: Math.min(Math.max(pad.left + band * hover + band / 2, 70), width - 70),
            top: Math.max(0, y(data[hover].value) - 8),
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="text-neutral-400">{data[hover].label}</p>
          {tooltip ? tooltip(hover) : <p className="font-semibold text-white">{format(data[hover].value)}</p>}
        </div>
      )}
    </div>
  );
}

// Yatay sıralı çubuk listesi (tek seri) — değer çubuk ucunda
export function BarList({
  data, format, color = VIZ.series[0], sub, limit = 8,
}: {
  data: { label: string; value: number }[];
  format: (n: number) => string;
  color?: string;
  sub?: (i: number) => string;
  limit?: number;
}) {
  // Uzun listelerde fazlası "Diğer" olarak toplanır
  const rows = data.length > limit
    ? [...data.slice(0, limit - 1), { label: `Diğer (${data.length - limit + 1})`, value: data.slice(limit - 1).reduce((s, d) => s + d.value, 0) }]
    : data;
  const max = Math.max(1, ...rows.map((d) => d.value));
  if (!rows.length) return <p className="text-sm text-neutral-500">Veri yok.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((d, i) => (
        <li key={d.label} className="group" title={sub && i < data.length ? `${d.label}: ${format(d.value)} · ${sub(i)}` : `${d.label}: ${format(d.value)}`}>
          <div className="flex justify-between gap-3 text-sm mb-1">
            <span className="text-neutral-200 truncate">{d.label}</span>
            <span className="text-neutral-400 whitespace-nowrap tabular-nums">
              <b className="text-white font-semibold">{format(d.value)}</b>
              {sub && i < data.length && !d.label.startsWith('Diğer (') && <span className="text-neutral-500"> · {sub(i)}</span>}
            </span>
          </div>
          <div className="h-3 rounded-r bg-neutral-800/50">
            <div
              className="h-full transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max(1, (d.value / max) * 100)}%`, background: color, borderRadius: '0 4px 4px 0' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Tek yatay yığılmış çubuk + lejant (parçalar arası 2px yüzey boşluğu)
export function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const [hover, setHover] = useState<number | null>(null);
  if (!total) return <p className="text-sm text-neutral-500">Veri yok.</p>;
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div>
      <div className="flex h-6 gap-[2px] rounded overflow-hidden" onMouseLeave={() => setHover(null)}>
        {visible.map((s, i) => (
          <div
            key={s.label}
            onMouseEnter={() => setHover(i)}
            title={`${s.label}: ${fmtInt(s.value)} (${fmtPct(s.value / total)})`}
            style={{
              flexGrow: s.value, flexBasis: 0, background: s.color, opacity: hover === null || hover === i ? 1 : 0.55,
              borderRadius: i === visible.length - 1 ? '0 4px 4px 0' : undefined,
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-neutral-300">{s.label}</span>
            <span className="text-neutral-500 tabular-nums">{fmtInt(s.value)} · {fmtPct(s.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
