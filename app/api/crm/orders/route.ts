import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ensureCrmTables, rowToOrder } from '@/lib/crm';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await ensureCrmTables();
    const result = await db.execute(`
      SELECT o.*, c.slug AS customer_slug
      FROM shopier_orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      ORDER BY o.date_created DESC
    `);
    return NextResponse.json({ success: true, orders: result.rows.map(rowToOrder) });
  } catch (error) {
    console.error('CRM sipariş listesi hatası:', error);
    return NextResponse.json({ success: false, error: 'Siparişler alınamadı' }, { status: 500 });
  }
}
