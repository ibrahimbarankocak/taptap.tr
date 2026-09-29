// İstatistik hesaplamaları — saf fonksiyonlar (DB / ağ yok), hem API'de hem testte kullanılır.
// Bilerek import içermez; node testlerinde doğrudan çalışsın diye.

// rowToOrder çıktısının istatistik için gereken kısmı
export type StatsOrder = {
  date_created: string;
  total: number;
  discount?: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  city: string;
  card_type: string;
  status: string;
  refunded: boolean;
  warnings: string[];
  payment_method?: string;
  installments?: boolean;
  line_items: { title: string; quantity: number; total: number }[];
};

export type StatsProfile = { card_type?: string | null; created_at?: string | null };

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const WEEKDAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const STATUS_ORDER = ['new', 'ready', 'written', 'shipped'] as const;

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS_TR[Number(m) - 1]} ${y.slice(2)}`;
};

// İlk ve son ay arasındaki tüm ayları (boş olanlar dahil) sırayla döner
function monthRange(first: string, last: string): string[] {
  const out: string[] = [];
  let [y, m] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

const buyerKey = (o: StatsOrder) => o.buyer_phone || o.buyer_email || o.buyer_name;

// Gün sınırları Türkiye saatine göre (UTC+3, yaz saati yok)
const TR_OFFSET_MS = 3 * 3600000;
const trDayKey = (d: Date) => new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
const trHour = (d: Date) => new Date(d.getTime() + TR_OFFSET_MS).getUTCHours();
// Türkiye saatiyle bugünün başlangıcı (UTC Date olarak)
export const trStartOfDay = (now: Date) => new Date(Date.parse(trDayKey(now) + 'T00:00:00Z') - TR_OFFSET_MS);
// SQLite CURRENT_TIMESTAMP ("YYYY-MM-DD HH:MM:SS", UTC) veya ISO metni tarihe çevirir
const parseDbDate = (s: string) => new Date(/Z$|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z');

// Bugünün özeti ve dünle karşılaştırma — seçili tarih aralığından bağımsız
function computeToday(allOrders: StatsOrder[], profiles: StatsProfile[], now: Date) {
  const todayKey = trDayKey(now);
  const yesterdayKey = trDayKey(new Date(now.getTime() - 86400000));
  const today = allOrders.filter((o) => o.date_created && trDayKey(new Date(o.date_created)) === todayKey);
  const yesterday = allOrders.filter((o) => o.date_created && trDayKey(new Date(o.date_created)) === yesterdayKey);
  // Dünün aynı saatine kadarki sipariş (adil karşılaştırma: gün yarısında "dünden az" görünmesin)
  const nowHourMin = new Date(now.getTime() + TR_OFFSET_MS).toISOString().slice(11, 16);
  const yesterdaySoFar = yesterday.filter((o) => new Date(new Date(o.date_created).getTime() + TR_OFFSET_MS).toISOString().slice(11, 16) <= nowHourMin);

  const sum = (list: StatsOrder[]) => list.reduce((s, o) => s + o.total, 0);
  const units = (list: StatsOrder[]) => list.reduce((s, o) => s + o.line_items.reduce((a, li) => a + li.quantity, 0), 0);
  const byHour = Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), orders: 0, revenue: 0 }));
  for (const o of today) {
    const h = trHour(new Date(o.date_created));
    byHour[h].orders += 1;
    byHour[h].revenue += o.total;
  }

  return {
    date: todayKey,
    revenue: sum(today),
    orders: today.length,
    units: units(today),
    newProfiles: profiles.filter((p) => p.created_at && trDayKey(parseDbDate(p.created_at)) === todayKey).length,
    yesterday: { revenue: sum(yesterday), orders: yesterday.length, units: units(yesterday) },
    yesterdaySoFar: { revenue: sum(yesterdaySoFar), orders: yesterdaySoFar.length },
    byHour: byHour.slice(0, trHour(now) + 1), // henüz gelmemiş saatleri gösterme
    latest: [...today]
      .sort((a, b) => b.date_created.localeCompare(a.date_created))
      .slice(0, 6)
      .map((o) => ({
        time: new Date(new Date(o.date_created).getTime() + TR_OFFSET_MS).toISOString().slice(11, 16),
        buyer: o.buyer_name,
        products: o.line_items.map((li) => `${li.title} ×${li.quantity}`).join(', '),
        total: o.total,
        card_type: o.card_type,
      })),
  };
}

// rangeDays: gün sayısı, null = tümü, 'today' = Türkiye saatiyle bugün
export function computeStats(allOrders: StatsOrder[], profiles: StatsProfile[], rangeDays: number | null | 'today', now = new Date()) {
  const since = rangeDays === 'today' ? trStartOfDay(now) : rangeDays ? new Date(now.getTime() - rangeDays * 86400000) : null;
  const orders = allOrders.filter((o) => o.date_created && (!since || new Date(o.date_created) >= since));

  // --- Özet ---
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const units = orders.reduce((s, o) => s + o.line_items.reduce((a, li) => a + li.quantity, 0), 0);
  const buyerCounts = new Map<string, number>();
  for (const o of orders) buyerCounts.set(buyerKey(o), (buyerCounts.get(buyerKey(o)) || 0) + 1);
  const repeatBuyers = [...buyerCounts.values()].filter((n) => n > 1).length;

  // --- Aylık ciro / sipariş ---
  const monthMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const k = monthKey(new Date(o.date_created));
    const m = monthMap.get(k) || { revenue: 0, orders: 0 };
    m.revenue += o.total;
    m.orders += 1;
    monthMap.set(k, m);
  }
  const monthKeys = [...monthMap.keys()].sort();
  const byMonth = monthKeys.length
    ? monthRange(monthKeys[0], since ? monthKey(now) : monthKeys[monthKeys.length - 1]).map((k) => ({
        key: k,
        label: monthLabel(k),
        revenue: monthMap.get(k)?.revenue || 0,
        orders: monthMap.get(k)?.orders || 0,
      }))
    : [];

  // --- Kart tipine göre ---
  const typeMap = new Map<string, { orders: number; units: number; revenue: number }>();
  for (const o of orders) {
    const t = typeMap.get(o.card_type) || { orders: 0, units: 0, revenue: 0 };
    t.orders += 1;
    t.units += o.line_items.reduce((a, li) => a + li.quantity, 0);
    t.revenue += o.total;
    typeMap.set(o.card_type, t);
  }
  const byCardType = [...typeMap.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // --- Ürünler ---
  const productMap = new Map<string, { qty: number; revenue: number }>();
  for (const o of orders) {
    for (const li of o.line_items) {
      const p = productMap.get(li.title) || { qty: 0, revenue: 0 };
      p.qty += li.quantity;
      p.revenue += li.total;
      productMap.set(li.title, p);
    }
  }
  const topProducts = [...productMap.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);

  // --- Şehirler ---
  const cityMap = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const city = (o.city || 'Bilinmiyor').trim();
    const c = cityMap.get(city) || { orders: 0, revenue: 0 };
    c.orders += 1;
    c.revenue += o.total;
    cityMap.set(city, c);
  }
  const topCities = [...cityMap.entries()]
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.orders - a.orders);

  // --- Haftanın günü (Pazartesi başlangıçlı) ---
  const weekday = WEEKDAYS_TR.map((label) => ({ label, orders: 0 }));
  for (const o of orders) weekday[(new Date(o.date_created).getDay() + 6) % 7].orders += 1;

  // --- Operasyon durumu ---
  const status = STATUS_ORDER.map((key) => ({ key, count: orders.filter((o) => (o.status || 'new') === key).length }));

  // --- Ödeme ---
  const payment = {
    creditCard: orders.filter((o) => o.payment_method === 'creditCard').length,
    debitCard: orders.filter((o) => o.payment_method === 'debitCard').length,
    installments: orders.filter((o) => o.installments).length,
    discountTotal: orders.reduce((s, o) => s + (o.discount || 0), 0),
  };

  // --- Profiller (taptap müşterileri) ---
  const profileTypes = { premium: 0, iban: 0, google: 0 };
  const profileMonths = new Map<string, number>();
  for (const p of profiles) {
    if (p.card_type === 'iban') profileTypes.iban++;
    else if (p.card_type === 'google') profileTypes.google++;
    else profileTypes.premium++;
    if (p.created_at) {
      const d = parseDbDate(p.created_at);
      if (!isNaN(d.getTime())) profileMonths.set(monthKey(d), (profileMonths.get(monthKey(d)) || 0) + 1);
    }
  }
  const pmKeys = [...profileMonths.keys()].sort();
  const profilesByMonth = pmKeys.length
    ? monthRange(pmKeys[0], pmKeys[pmKeys.length - 1]).map((k) => ({ key: k, label: monthLabel(k), count: profileMonths.get(k) || 0 }))
    : [];

  return {
    range: rangeDays,
    today: computeToday(allOrders, profiles, now),
    summary: {
      revenue,
      orders: orders.length,
      avgOrder: orders.length ? revenue / orders.length : 0,
      units,
      buyers: buyerCounts.size,
      repeatBuyers,
      repeatRate: buyerCounts.size ? repeatBuyers / buyerCounts.size : 0,
      refunded: orders.filter((o) => o.refunded).length,
      needsAttention: orders.filter((o) => o.warnings.length > 0 && o.status === 'new').length,
    },
    byMonth,
    byCardType,
    topProducts,
    topCities,
    weekday,
    status,
    payment,
    profiles: { total: profiles.length, ...profileTypes, byMonth: profilesByMonth },
  };
}

export type Stats = ReturnType<typeof computeStats>;
