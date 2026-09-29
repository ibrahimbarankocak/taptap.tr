import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ensureCrmTables, rowToOrder } from '@/lib/crm';
import { computeStats, type StatsProfile } from '@/lib/stats';

// GET /api/crm/stats?range=today|30|90|365|all
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const range = new URL(request.url).searchParams.get('range') || '365';
    const rangeDays = range === 'all' ? null : range === 'today' ? 'today' : Math.max(1, Number(range) || 365);

    await ensureCrmTables();
    const orders = (await db.execute('SELECT * FROM shopier_orders')).rows.map(rowToOrder);

    // created_at eski tablolarda olmayabilir; yoksa sadece kart tipiyle devam et
    // (SELECT * kullanmıyoruz: profile_image base64 olduğu için çok büyük)
    let profiles: StatsProfile[];
    try {
      profiles = (await db.execute('SELECT card_type, created_at FROM customers')).rows as unknown as StatsProfile[];
    } catch {
      profiles = (await db.execute('SELECT card_type FROM customers')).rows as unknown as StatsProfile[];
    }

    return NextResponse.json({ success: true, stats: computeStats(orders, profiles, rangeDays) });
  } catch (error) {
    console.error('İstatistik hatası:', error);
    return NextResponse.json({ success: false, error: 'İstatistikler alınamadı' }, { status: 500 });
  }
}
