// IBAN kartı ortaklığı: Shopier siparişlerinden kaç IBAN kartı basıldığını sayar (saf fonksiyonlar, testlenebilir).
// Kurallar (gerçek ürün adlarından):
//  - "IBAN Nfc Kartı", "IBAN NFC Kartvizit (Cüzdan Boy)"        -> 1 × adet
//  - "3'lü / 5'li / 10'lu IBAN Nfc Kartı"                          -> 3 / 5 / 10 × adet
//  - "IBAN+Whatsapp Nfc Kartı - Avantaj Paket" (1'er adet)          -> 1 × adet
//  - Genel paketler ("3'Lü NFC Paketi", "4'lü Nfc Paketi"): içerik müşterinin notuna göre;
//    notta kaç IBAN varsa o kadar (paket boyutunu geçmez). Bunlar ayrıca "nottan" diye işaretlenir.
//  - İade edilmiş siparişler sayılmaz.

export const DEFAULT_PARTNER_RATE = 90; // TL / IBAN kartı

type LineItem = { title: string; quantity: number };
type OrderLike = {
  id: string;
  date_created: string;
  refunded: boolean;
  line_items: LineItem[];
  extracted: { ibans?: unknown[]; iban?: string; card_types?: string[] };
};

const decode = (s: string) => s.replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');

// "3'lü", "10'lu", "5'li", "2'Li" -> 3, 10, 5, 2 (yoksa 1)
export function packSize(title: string): number {
  const m = decode(title).match(/(\d+)\s*['’]?\s*[lL][ıiuüIİ]/);
  return m ? Number(m[1]) : 1;
}

export type IbanCount = { units: number; source: 'product' | 'note' | 'none' };

export function ibanUnitsForItem(item: LineItem, extracted: OrderLike['extracted']): IbanCount {
  const title = decode(item.title);
  const qty = Math.max(0, Number(item.quantity) || 0);
  if (/iban/i.test(title)) {
    // "IBAN+Whatsapp" gibi karma paketlerde her tipten 1'er adet
    const perPack = title.includes('+') ? 1 : packSize(title);
    return { units: perPack * qty, source: 'product' };
  }
  // Genel paket: nottaki IBAN sayısı (paket boyutunu geçmez)
  if (/paket/i.test(title) && !/google|instagram|whats/i.test(title.split('-')[0])) {
    const inNote = Array.isArray(extracted.ibans) ? extracted.ibans.length : extracted.iban ? 1 : 0;
    if (inNote) return { units: Math.min(inNote, packSize(title)) * qty, source: 'note' };
  }
  return { units: 0, source: 'none' };
}

export type PartnerOrderRow = { id: string; date: string; title: string; units: number; source: 'product' | 'note' };

// Tüm siparişlerden IBAN kartı dökümü
export function countIbanCards(orders: OrderLike[]) {
  const rows: PartnerOrderRow[] = [];
  for (const o of orders) {
    if (o.refunded) continue;
    for (const li of o.line_items) {
      const c = ibanUnitsForItem(li, o.extracted || {});
      if (c.units > 0 && c.source !== 'none') rows.push({ id: o.id, date: o.date_created, title: decode(li.title), units: c.units, source: c.source });
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((s, r) => s + r.units, 0);
  const fromNotes = rows.filter((r) => r.source === 'note').reduce((s, r) => s + r.units, 0);

  // Aylık döküm (Türkiye saatiyle ay)
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const k = new Date(new Date(r.date).getTime() + 3 * 3600000).toISOString().slice(0, 7);
    byMonth.set(k, (byMonth.get(k) || 0) + r.units);
  }
  return {
    total,
    fromNotes,
    rows,
    byMonth: [...byMonth.entries()].sort().map(([month, units]) => ({ month, units })),
  };
}

// Ödeme özeti: basılan - ödemesi alınan = bekleyen
export function partnerSummary(totalCards: number, payments: { cards: number; amount: number }[], rate: number) {
  const paidCards = payments.reduce((s, p) => s + p.cards, 0);
  const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
  const pendingCards = Math.max(0, totalCards - paidCards);
  return {
    rate,
    totalCards,
    earned: totalCards * rate,
    paidCards,
    paidAmount,
    pendingCards,
    pendingAmount: pendingCards * rate,
    overpaidCards: Math.max(0, paidCards - totalCards), // fazla ödeme girildiyse
    progress: totalCards ? Math.min(1, paidCards / totalCards) : 0,
  };
}
