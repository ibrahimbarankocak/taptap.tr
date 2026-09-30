// Stok ve maliyet hesabı (saf fonksiyonlar, testlenebilir — import yok).
// Siparişten stok düşümü (gerçek Shopier verisinden):
//  - Kart boyutu: ürün adında "Cüzdan Boy" varsa kredi kartı boyu, yoksa 8x8 kare
//  - Kart sayısı: "3'lü / 5'li / 10'lu" paket boyutu × "+" ile birleşen tip sayısı × adet
//      "Google+Instagram NFC Kartı (1'er Adet …)" -> 2, "2'Li Google+Instagram (2'şer Adet)" -> 4, "4'lü Nfc Paketi" -> 4
//  - Renk: satırdaki "Renk" seçimi (Beyaz / Siyah); yoksa nottaki tema; o da yoksa "belirsiz" (stoktan düşülmez, uyarılır)
//  - Stand: "N Adet Şeffaf Stand" seçeneği × adet
//  - İade edilen siparişler sayılmaz

export type CardSize = '8x8' | 'cuzdan';
export type CardColor = 'beyaz' | 'siyah';

export const STAND = 'stand';
export const cardKey = (size: CardSize, color: CardColor) => `kart:${size}:${color}`;
export const BASE_ITEMS = [cardKey('8x8', 'siyah'), cardKey('8x8', 'beyaz'), cardKey('cuzdan', 'siyah'), cardKey('cuzdan', 'beyaz'), STAND];

const SIZE_LABEL: Record<CardSize, string> = { '8x8': '8x8 Kare Kart', cuzdan: 'Cüzdan Boy Kart' };
export function itemLabel(key: string): string {
  if (key === STAND) return 'Şeffaf Stand';
  const [, size, color] = key.split(':');
  const c = color === 'beyaz' ? 'Beyaz' : color === 'siyah' ? 'Siyah' : 'Renk belirsiz';
  return `${SIZE_LABEL[size as CardSize] ?? size} · ${c}`;
}

const decode = (s: string) =>
  s.replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&amp;|&quot;|"/g, '');

// "3'lü", "10'lu", "5'li", "2'Li" -> 3, 10, 5, 2 (yoksa 1)
function packSize(title: string): number {
  const m = title.match(/(\d+)\s*['’]?\s*[lL][ıiuüIİ]/);
  return m ? Number(m[1]) : 1;
}

export const cardSize = (title: string): CardSize => (/c[üu]zdan/i.test(decode(title)) ? 'cuzdan' : '8x8');

// Bir ürün satırındaki (1 adet için) kart sayısı; NFC kartı olmayan ürünlerde 0
export function cardsPerUnit(title: string): number {
  const t = decode(title);
  if (!/nfc|kart/i.test(t)) return 0;
  const head = t.replace(/\(.*$/, ''); // "(1'er Adet …)", "(8x8 Kare)" gibi açıklamalar
  const types = head.split('+').length;
  return packSize(head) * types;
}

export function colorOf(selection: string[], theme?: string): CardColor | undefined {
  const s = selection.join(' ').toLocaleLowerCase('tr');
  if (/beyaz/.test(s) && !/siyah/.test(s)) return 'beyaz';
  if (/siyah/.test(s) && !/beyaz/.test(s)) return 'siyah';
  if (!s.trim() || /klasik/.test(s)) {
    if (theme === 'white') return 'beyaz';
    if (theme === 'black') return 'siyah';
  }
  return undefined;
}

// "2 Adet Şeffaf Stand" -> 2, "Şeffaf Stand" -> 1, başka seçenek -> 0
export function standsInOption(option: string): number {
  const t = decode(option);
  if (!/stand/i.test(t)) return 0;
  const m = t.match(/(\d+)\s*adet/i);
  return m ? Number(m[1]) : 1;
}

export type UsageLine = { title: string; quantity: number; selection: string[]; options: string[] };
export type Usage = { items: Record<string, number>; unknownColor: { size: CardSize; qty: number }[] };

export function orderUsage(lines: UsageLine[], theme?: string): Usage {
  const items: Record<string, number> = {};
  const unknownColor: Usage['unknownColor'] = [];
  const add = (k: string, n: number) => n > 0 && (items[k] = (items[k] || 0) + n);
  for (const l of lines) {
    const qty = Math.max(0, Number(l.quantity) || 0);
    const cards = cardsPerUnit(l.title) * qty;
    if (cards > 0) {
      const size = cardSize(l.title);
      const color = colorOf(l.selection, theme);
      if (color) add(cardKey(size, color), cards);
      else unknownColor.push({ size, qty: cards });
    }
    for (const o of l.options) add(STAND, standsInOption(o) * qty);
  }
  return { items, unknownColor };
}

// ---------------------------------------------------------------------------------------------
// Maliyet

export type CostSettings = {
  commission_pct?: number; // Shopier komisyonu (% — sipariş toplamı üzerinden)
  commission_fixed?: number; // sipariş başı sabit kesinti (varsa)
  shipping?: number; // sipariş başı kargo
  packaging?: number; // sipariş başı paketleme / diğer
  unit_costs: Record<string, number>; // kalem -> birim maliyet (TL)
  low_stock: Record<string, number>; // kalem -> uyarı eşiği
  tracking_start?: string; // yyyy-mm-dd — bu tarihten itibaren siparişler stoktan düşer
};

export const emptySettings = (): CostSettings => ({ unit_costs: {}, low_stock: {} });

const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e7 ? n : undefined;
};

// İstemciden gelen ayarları doğrular (bilinmeyen alanlar atılır)
export function cleanSettings(input: unknown): CostSettings {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = emptySettings();
  for (const k of ['commission_pct', 'commission_fixed', 'shipping', 'packaging'] as const) {
    const v = o[k] === '' || o[k] == null ? undefined : num(o[k]);
    if (v !== undefined) out[k] = k === 'commission_pct' ? Math.min(v, 100) : v;
  }
  for (const map of ['unit_costs', 'low_stock'] as const) {
    const m = (o[map] && typeof o[map] === 'object' ? o[map] : {}) as Record<string, unknown>;
    for (const key of BASE_ITEMS) {
      const v = m[key] === '' || m[key] == null ? undefined : num(m[key]);
      if (v !== undefined) out[map][key] = map === 'low_stock' ? Math.round(v) : v;
    }
  }
  if (typeof o.tracking_start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.tracking_start)) out.tracking_start = o.tracking_start;
  return out;
}

export type ProfitBreakdown = {
  revenue: number;
  commission: number;
  shipping: number;
  packaging: number;
  material: number;
  partner: number;
  profit: number;
  missing: string[]; // girilmemiş gider kalemleri (0 sayıldı)
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function orderProfit(revenue: number, usage: Usage, ibanUnits: number, s: CostSettings, partnerRate: number): ProfitBreakdown {
  const missing = new Set<string>();
  const need = (v: number | undefined, label: string) => {
    if (v === undefined) missing.add(label);
    return v ?? 0;
  };
  const commission = (revenue * need(s.commission_pct, 'Shopier komisyonu')) / 100 + (s.commission_fixed ?? 0);
  const shipping = need(s.shipping, 'Kargo');
  const packaging = s.packaging ?? 0;
  let material = 0;
  for (const [k, n] of Object.entries(usage.items)) material += n * need(s.unit_costs[k], `${itemLabel(k)} maliyeti`);
  // Rengi belirsiz kartlar: aynı boydaki kartların maliyeti (siyah, yoksa beyaz)
  for (const u of usage.unknownColor) {
    const c = s.unit_costs[cardKey(u.size, 'siyah')] ?? s.unit_costs[cardKey(u.size, 'beyaz')];
    material += u.qty * need(c, `${SIZE_LABEL[u.size]} maliyeti`);
  }
  const partner = ibanUnits * partnerRate;
  const profit = revenue - commission - shipping - packaging - material - partner;
  return {
    revenue: round2(revenue),
    commission: round2(commission),
    shipping: round2(shipping),
    packaging: round2(packaging),
    material: round2(material),
    partner: round2(partner),
    profit: round2(profit),
    missing: [...missing],
  };
}

// Türkiye saatine göre "yyyy-mm"
export const monthKeyTR = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(0, 7) : new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 7);
};
export const dayKeyTR = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(0, 10) : new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 10);
};

export type MonthRow = Omit<ProfitBreakdown, 'missing'> & { month: string; orders: number };

export function monthlyReport(rows: { date: string; p: ProfitBreakdown }[]): MonthRow[] {
  const map = new Map<string, MonthRow>();
  for (const { date, p } of rows) {
    const k = monthKeyTR(date);
    const m = map.get(k) ?? { month: k, orders: 0, revenue: 0, commission: 0, shipping: 0, packaging: 0, material: 0, partner: 0, profit: 0 };
    m.orders += 1;
    for (const f of ['revenue', 'commission', 'shipping', 'packaging', 'material', 'partner', 'profit'] as const) m[f] = round2(m[f] + p[f]);
    map.set(k, m);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}
