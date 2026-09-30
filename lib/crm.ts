import db from '@/lib/db';
import { ensureTable } from '@/lib/schema';
import { parseOrderNote, decodeEntities } from '@/lib/parseOrderNote';
import type { ShopierOrder } from '@/lib/shopier';

export async function ensureCrmTables() {
  await ensureTable('shopier_orders', [
    ['id', 'TEXT PRIMARY KEY'],
    ['date_created', 'TEXT'],
    ['buyer_name', 'TEXT'],
    ['buyer_phone', 'TEXT'],
    ['buyer_email', 'TEXT'],
    ['city', 'TEXT'],
    ['total', 'REAL'],
    ['currency', 'TEXT'],
    ['note', 'TEXT'],
    ['card_type', 'TEXT'],
    ['extracted', 'TEXT'],
    ['warnings', 'TEXT'],
    ['status', "TEXT DEFAULT 'new'"],
    ['customer_id', 'INTEGER'],
    ['raw', 'TEXT'],
    // 1 = admin kart bilgilerini elle düzenledi (not yeniden okunmaz); 0 = otomatik; NULL = bu sütundan önceki kayıt
    ['edited', 'INTEGER'],
  ]);
}

// Siparişi kaydeder. Yeni siparişte notu ayrıştırır; var olan siparişte sadece Shopier
// alanlarını günceller — elle düzenlenen kart bilgileri / durum / bağlı profil korunur.
// Siparişi kaydeden SQL ifadesi (toplu kayıt için ayrı)
const AUTO = "shopier_orders.edited = 0 AND shopier_orders.customer_id IS NULL AND shopier_orders.status = 'new'";

export function upsertOrderStatement(order: ShopierOrder) {
  const ship = order.shippingInfo || {};
  const bill = order.billingInfo || {};
  const buyerName = [ship.firstName || bill.firstName, ship.lastName || bill.lastName].filter(Boolean).join(' ');
  const parsed = parseOrderNote(order.note, {
    productTitles: (order.lineItems || []).map((li) => li.title),
    buyerName,
  });

  return {
    sql: `INSERT INTO shopier_orders
            (id, date_created, buyer_name, buyer_phone, buyer_email, city, total, currency, note, card_type, extracted, warnings, status, raw, edited)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, 0)
          ON CONFLICT(id) DO UPDATE SET
            -- elle düzenlenmemiş siparişlerde not güncel okuyucuyla yeniden okunur
            card_type = CASE WHEN ${AUTO} THEN excluded.card_type ELSE shopier_orders.card_type END,
            extracted = CASE WHEN ${AUTO} THEN excluded.extracted ELSE shopier_orders.extracted END,
            warnings = CASE WHEN ${AUTO} THEN excluded.warnings ELSE shopier_orders.warnings END,
            date_created = excluded.date_created,
            buyer_name = excluded.buyer_name,
            buyer_phone = excluded.buyer_phone,
            buyer_email = excluded.buyer_email,
            city = excluded.city,
            total = excluded.total,
            currency = excluded.currency,
            note = excluded.note,
            raw = excluded.raw`,
    args: [
      String(order.id),
      order.dateCreated || '',
      buyerName,
      ship.phone || bill.phone || '',
      ship.email || bill.email || '',
      ship.city || bill.city || '',
      Number(order.totals?.total || 0),
      order.currency || 'TRY',
      order.note || '',
      parsed.card_type,
      JSON.stringify(parsed.fields),
      JSON.stringify(parsed.warnings),
      JSON.stringify(order),
    ],
  };
}

export async function upsertOrder(order: ShopierOrder) {
  await db.execute(upsertOrderStatement(order));
}

// Çok siparişi 50'şer toplu yazar (Vercel'de istek zaman aşımına düşmesin)
export async function upsertOrders(orders: ShopierOrder[]) {
  for (let i = 0; i < orders.length; i += 50) {
    await db.batch(orders.slice(i, i + 50).map(upsertOrderStatement), 'write');
  }
}

// DB satırını istemciye gidecek biçime çevirir
export function rowToOrder(row: Record<string, unknown>) {
  const raw: ShopierOrder = JSON.parse(String(row.raw || '{}'));
  return {
    id: row.id as string,
    date_created: row.date_created as string,
    buyer_name: row.buyer_name as string,
    buyer_phone: row.buyer_phone as string,
    buyer_email: row.buyer_email as string,
    city: row.city as string,
    address: [raw.shippingInfo?.address, raw.shippingInfo?.district, raw.shippingInfo?.city].filter(Boolean).join(', '),
    total: Number(row.total || 0),
    currency: row.currency as string,
    note: row.note as string,
    card_type: row.card_type as string,
    extracted: JSON.parse(String(row.extracted || '{}')),
    warnings: JSON.parse(String(row.warnings || '[]')) as string[],
    status: (row.status || 'new') as string,
    customer_id: row.customer_id as number | null,
    customer_slug: (row.customer_slug ?? null) as string | null,
    shopier_status: raw.status,
    payment_method: raw.paymentMethod || '',
    installments: !!raw.installments,
    discount: Number(raw.totals?.discount || 0),
    refunded: (raw.refunds || []).some((r) => r.status === 'succeeded'),
    line_items: (raw.lineItems || []).map((li) => ({
      title: decodeEntities(li.title), // Shopier ürün adlarında &#039; gibi HTML kodları var
      quantity: Number(li.quantity || 0),
      total: Number(li.total || 0),
      variant: [...(li.selection || []).map((s) => s.variationTitle || s.title), ...(li.options || []).map((o) => o.title)]
        .filter(Boolean)
        .join(', '),
    })),
  };
}

export type CrmOrder = ReturnType<typeof rowToOrder>;

type Extracted = ReturnType<typeof parseOrderNote>['fields'] & {
  google_review?: string;
  card_link?: string;
  ibans?: { customer_id?: number; slug?: string }[];
};

// Yeniden okunan nota adminin eklediklerini taşır: seçilen Google yorum linki, elle link, IBAN profil bağlantıları
export function mergeReparsed(old: Extracted, fresh: Extracted): Extracted {
  const ibans = fresh.ibans?.map((e, i) => ({ ...e, customer_id: old.ibans?.[i]?.customer_id, slug: old.ibans?.[i]?.slug }));
  const out: Extracted = { ...fresh, ...(ibans ? { ibans } : {}) };
  if (old.google_review) out.google_review = old.google_review;
  if (old.card_link) out.card_link = old.card_link;
  return out;
}

// Toplu yeniden okuma: elle düzenlenmemiş, profili oluşturulmamış, durumu "yeni" olan siparişler
export async function reparseOrders(): Promise<{ checked: number; changed: number }> {
  await ensureCrmTables();
  const rows = (
    await db.execute(
      "SELECT id, note, raw, extracted, warnings, card_type FROM shopier_orders WHERE COALESCE(edited, 0) = 0 AND customer_id IS NULL AND COALESCE(status, 'new') = 'new'"
    )
  ).rows;
  const stmts = [];
  for (const r of rows) {
    const raw: ShopierOrder = JSON.parse(String(r.raw || '{}'));
    const ship = raw.shippingInfo || {};
    const bill = raw.billingInfo || {};
    const buyerName = [ship.firstName || bill.firstName, ship.lastName || bill.lastName].filter(Boolean).join(' ');
    const p = parseOrderNote(String(r.note || ''), { productTitles: (raw.lineItems || []).map((li) => li.title), buyerName });
    const extracted = JSON.stringify(mergeReparsed(JSON.parse(String(r.extracted || '{}')), p.fields));
    const warnings = JSON.stringify(p.warnings);
    if (extracted === r.extracted && warnings === r.warnings && p.card_type === r.card_type) continue;
    stmts.push({
      sql: 'UPDATE shopier_orders SET extracted = ?, warnings = ?, card_type = ? WHERE id = ? AND COALESCE(edited, 0) = 0',
      args: [extracted, warnings, p.card_type, String(r.id)],
    });
  }
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50), 'write');
  return { checked: rows.length, changed: stmts.length };
}
