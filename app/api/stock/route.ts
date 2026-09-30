import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ensureTable } from '@/lib/schema';
import { ensureCrmTables } from '@/lib/crm';
import { decodeEntities } from '@/lib/parseOrderNote';
import { ibanUnitsForItem, DEFAULT_PARTNER_RATE } from '@/lib/partner';
import type { ShopierOrder } from '@/lib/shopier';
import {
  BASE_ITEMS, itemLabel, orderUsage, orderProfit, monthlyReport, cleanSettings, emptySettings, dayKeyTR,
  type CostSettings, type Usage, type ProfitBreakdown,
} from '@/lib/inventory';

// Stok & maliyet: stok hareketleri (elle), siparişlerden otomatik düşüm, sipariş başı kâr ve aylık rapor.
async function ensureStockTables() {
  await ensureTable('stock_moves', [
    ['id', 'INTEGER PRIMARY KEY AUTOINCREMENT'],
    ['item', 'TEXT NOT NULL'],
    ['qty', 'INTEGER NOT NULL'], // + giriş, - çıkış (sayımda fark yazılır)
    ['kind', 'TEXT'], // in | out | count
    ['note', 'TEXT'],
    ['created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP'],
  ]);
  await ensureTable('app_settings', [
    ['key', 'TEXT PRIMARY KEY'],
    ['value', 'TEXT'],
  ]);
}

async function getSetting(key: string) {
  const r = await db.execute({ sql: 'SELECT value FROM app_settings WHERE key = ?', args: [key] });
  return r.rows[0]?.value as string | undefined;
}
const putSetting = (key: string, value: string) =>
  db.execute({
    sql: 'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [key, value],
  });

async function getCostSettings(): Promise<CostSettings> {
  const raw = await getSetting('cost_settings');
  try {
    return raw ? cleanSettings(JSON.parse(raw)) : emptySettings();
  } catch {
    return emptySettings();
  }
}

const todayTR = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);

async function buildReport() {
  const [settings, rateRaw, movesRes, ordersRes] = await Promise.all([
    getCostSettings(),
    getSetting('partner_rate'),
    db.execute('SELECT id, item, qty, kind, note, created_at FROM stock_moves ORDER BY id DESC'),
    db.execute('SELECT id, date_created, buyer_name, total, extracted, raw FROM shopier_orders ORDER BY date_created DESC'),
  ]);
  const rate = Number(rateRaw) > 0 ? Number(rateRaw) : DEFAULT_PARTNER_RATE;

  const moves = movesRes.rows.map((m) => ({
    id: Number(m.id),
    item: String(m.item),
    qty: Number(m.qty),
    kind: String(m.kind ?? ''),
    note: String(m.note ?? ''),
    created_at: String(m.created_at ?? ''),
  }));

  const orders: {
    id: string; date: string; buyer: string; items: string[]; usage: Usage; ibanUnits: number; p: ProfitBreakdown; tracked: boolean;
  }[] = [];
  for (const r of ordersRes.rows) {
    const raw: ShopierOrder = JSON.parse(String(r.raw || '{}'));
    if ((raw.refunds || []).some((x) => x.status === 'succeeded')) continue; // iade: ne stok ne kâr
    const extracted = JSON.parse(String(r.extracted || '{}'));
    const lines = (raw.lineItems || []).map((li) => ({
      title: decodeEntities(li.title),
      quantity: Number(li.quantity || 0),
      selection: (li.selection || []).map((s) => s.title || ''),
      options: (li.options || []).map((o) => o.title || ''),
    }));
    const usage = orderUsage(lines, extracted.theme);
    const ibanUnits = lines.reduce((s, l) => s + ibanUnitsForItem(l, extracted).units, 0);
    const date = String(r.date_created || '');
    orders.push({
      id: String(r.id),
      date,
      buyer: String(r.buyer_name || ''),
      items: lines.map((l) => `${l.quantity > 1 ? l.quantity + ' × ' : ''}${l.title}${l.selection.length ? ' · ' + l.selection.join('/') : ''}${l.options.length ? ' · ' + l.options.join(', ') : ''}`),
      usage,
      ibanUnits,
      p: orderProfit(Number(r.total || 0), usage, ibanUnits, settings, rate),
      tracked: !!settings.tracking_start && dayKeyTR(date) >= settings.tracking_start,
    });
  }

  // Stok = hareketler − takip başlangıcından sonraki siparişler
  const keys = [...BASE_ITEMS, ...new Set(moves.map((m) => m.item).filter((k) => !BASE_ITEMS.includes(k)))];
  const used: Record<string, number> = {};
  const unknown: Record<string, number> = {};
  let trackedOrders = 0;
  for (const o of orders) {
    if (!o.tracked) continue;
    trackedOrders++;
    for (const [k, n] of Object.entries(o.usage.items)) used[k] = (used[k] || 0) + n;
    for (const u of o.usage.unknownColor) unknown[u.size] = (unknown[u.size] || 0) + u.qty;
  }
  const items = keys.map((key) => {
    const inQty = moves.filter((m) => m.item === key).reduce((s, m) => s + m.qty, 0);
    const stock = inQty - (used[key] || 0);
    const low = settings.low_stock[key];
    return { key, label: itemLabel(key), moved: inQty, used: used[key] || 0, stock, low: low ?? null, unit_cost: settings.unit_costs[key] ?? null };
  });

  const missing = [...new Set(orders.flatMap((o) => o.p.missing))];
  return {
    settings,
    partnerRate: rate,
    items,
    unknownColor: Object.entries(unknown).map(([size, qty]) => ({ size, qty })),
    trackedOrders,
    moves: moves.slice(0, 100),
    monthly: monthlyReport(orders.map((o) => ({ date: o.date, p: o.p }))),
    orders: orders.slice(0, 150).map(({ usage, ...o }) => ({ ...o, usage: usage.items, unknownColor: usage.unknownColor })),
    missing,
  };
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await Promise.all([ensureStockTables(), ensureCrmTables()]);
    return NextResponse.json({ success: true, ...(await buildReport()) });
  } catch (error) {
    console.error('Stok raporu hatası:', error);
    return NextResponse.json({ success: false, error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST { action: 'move', item, qty, kind: 'in'|'out'|'count', note? }
// POST { action: 'delete_move', id }
// POST { action: 'settings', settings }
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await Promise.all([ensureStockTables(), ensureCrmTables()]);
    const body = await request.json();

    if (body.action === 'settings') {
      const s = cleanSettings(body.settings);
      await putSetting('cost_settings', JSON.stringify(s));
      return NextResponse.json({ success: true, settings: s });
    }

    if (body.action === 'delete_move') {
      const id = Number(body.id);
      if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Geçersiz kayıt' }, { status: 400 });
      await db.execute({ sql: 'DELETE FROM stock_moves WHERE id = ?', args: [id] });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'move') {
      const item = String(body.item || '');
      const kind = String(body.kind || '');
      const qty = Math.round(Number(body.qty));
      if (!BASE_ITEMS.includes(item)) return NextResponse.json({ success: false, error: 'Geçersiz ürün' }, { status: 400 });
      if (!['in', 'out', 'count'].includes(kind) || !Number.isFinite(qty) || qty < 0 || qty > 1000000 || (kind !== 'count' && qty === 0)) {
        return NextResponse.json({ success: false, error: 'Geçersiz adet' }, { status: 400 });
      }
      const note = String(body.note || '').slice(0, 200);

      // İlk stok girişinde takip başlangıcı bugün olur: eski siparişler yeni stoktan düşülmez
      const settings = await getCostSettings();
      if (!settings.tracking_start) {
        settings.tracking_start = todayTR();
        await putSetting('cost_settings', JSON.stringify(settings));
      }

      let delta = kind === 'in' ? qty : -qty;
      if (kind === 'count') {
        // Sayım: elde sayılan adet yazılır, fark hareket olarak kaydedilir
        const current = (await buildReport()).items.find((i) => i.key === item)?.stock ?? 0;
        delta = qty - current;
        if (delta === 0) return NextResponse.json({ success: true, unchanged: true });
      }
      await db.execute({
        sql: 'INSERT INTO stock_moves (item, qty, kind, note, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [item, delta, kind, note, new Date().toISOString()],
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    console.error('Stok işlemi hatası:', error);
    return NextResponse.json({ success: false, error: 'İşlem yapılamadı' }, { status: 500 });
  }
}
