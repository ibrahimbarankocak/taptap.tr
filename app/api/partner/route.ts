import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ensureTable } from '@/lib/schema';
import { ensureCrmTables, rowToOrder } from '@/lib/crm';
import { countIbanCards, partnerSummary, DEFAULT_PARTNER_RATE } from '@/lib/partner';

// IBAN kartı ortaklık paneli: basılan kart (Shopier siparişlerinden), alınan ödemeler (elle girilir), bekleyen.
async function ensurePartnerTables() {
  await ensureTable('partner_payments', [
    ['id', 'INTEGER PRIMARY KEY AUTOINCREMENT'],
    ['paid_at', 'TEXT'],
    ['cards', 'INTEGER NOT NULL DEFAULT 0'],
    ['amount', 'REAL NOT NULL DEFAULT 0'],
    ['note', 'TEXT'],
    ['created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP'],
  ]);
  await ensureTable('app_settings', [
    ['key', 'TEXT PRIMARY KEY'],
    ['value', 'TEXT'],
  ]);
}

async function getRate() {
  const r = await db.execute({ sql: "SELECT value FROM app_settings WHERE key = 'partner_rate'", args: [] });
  const v = Number(r.rows[0]?.value);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_PARTNER_RATE;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await Promise.all([ensurePartnerTables(), ensureCrmTables()]);
    const [ordersRes, paymentsRes, rate] = await Promise.all([
      db.execute('SELECT id, date_created, extracted, raw, card_type, status, total, currency, note, buyer_name, buyer_phone, buyer_email, city, warnings, customer_id FROM shopier_orders'),
      db.execute('SELECT id, paid_at, cards, amount, note FROM partner_payments ORDER BY paid_at DESC, id DESC'),
      getRate(),
    ]);
    const counted = countIbanCards(ordersRes.rows.map(rowToOrder));
    const payments = paymentsRes.rows.map((p) => ({
      id: Number(p.id),
      paid_at: String(p.paid_at ?? ''),
      cards: Number(p.cards),
      amount: Number(p.amount),
      note: String(p.note ?? ''),
    }));
    return NextResponse.json({
      success: true,
      summary: partnerSummary(counted.total, payments, rate),
      fromNotes: counted.fromNotes,
      byMonth: counted.byMonth,
      rows: counted.rows,
      payments,
    });
  } catch (error) {
    console.error('Ortaklık paneli hatası:', error);
    return NextResponse.json({ success: false, error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST { cards, amount?, paid_at?, note? }  -> ödeme ekle
// POST { rate }                             -> kart başı ücreti değiştir
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensurePartnerTables();
    const body = await request.json();

    if (body.rate !== undefined) {
      const rate = Number(body.rate);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 100000) {
        return NextResponse.json({ success: false, error: 'Geçersiz ücret' }, { status: 400 });
      }
      await db.execute({
        sql: "INSERT INTO app_settings (key, value) VALUES ('partner_rate', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [String(rate)],
      });
      return NextResponse.json({ success: true });
    }

    const cards = Math.round(Number(body.cards));
    if (!Number.isFinite(cards) || cards <= 0 || cards > 100000) {
      return NextResponse.json({ success: false, error: 'Kart adedi 1 veya daha fazla olmalı' }, { status: 400 });
    }
    const rate = await getRate();
    const amount = body.amount === undefined || body.amount === '' ? cards * rate : Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: 'Geçersiz tutar' }, { status: 400 });
    }
    const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(String(body.paid_at || '')) ? String(body.paid_at) : new Date().toISOString().slice(0, 10);
    await db.execute({
      sql: 'INSERT INTO partner_payments (paid_at, cards, amount, note) VALUES (?, ?, ?, ?)',
      args: [paidAt, cards, amount, String(body.note || '').slice(0, 300)],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ödeme ekleme hatası:', error);
    return NextResponse.json({ success: false, error: 'Kaydedilemedi' }, { status: 500 });
  }
}

// DELETE ?id=5
export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^\d+$/.test(id)) return NextResponse.json({ success: false, error: 'Geçersiz ID' }, { status: 400 });
  await ensurePartnerTables();
  await db.execute({ sql: 'DELETE FROM partner_payments WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
