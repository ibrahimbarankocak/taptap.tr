import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { fetchAllOrders } from '@/lib/shopier';
import { ensureCrmTables, upsertOrders } from '@/lib/crm';

// Shopier'dan siparişleri çekip veritabanına işler.
// Body: { since?: 'yyyy-mm-dd' } — verilmezse son senkronize edilen siparişten 2 gün öncesi,
// hiç sipariş yoksa 1 yıl öncesi kullanılır.
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await ensureCrmTables();
    const body = await request.json().catch(() => ({}));

    let since: Date;
    if (body.since) {
      since = new Date(body.since);
    } else {
      const last = await db.execute('SELECT MAX(date_created) AS last FROM shopier_orders');
      const lastDate = last.rows[0]?.last as string | null;
      since = lastDate ? new Date(new Date(lastDate).getTime() - 2 * 86400000) : new Date(Date.now() - 365 * 86400000);
    }
    if (isNaN(since.getTime())) {
      return NextResponse.json({ success: false, error: 'Geçersiz başlangıç tarihi' }, { status: 400 });
    }

    const orders = await fetchAllOrders(since);
    await upsertOrders(orders);

    return NextResponse.json({ success: true, count: orders.length, since: since.toISOString() });
  } catch (error) {
    console.error('Shopier senkronizasyon hatası:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Senkronizasyon başarısız" }, { status: 500 });
  }
}
