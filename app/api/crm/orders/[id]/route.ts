import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ensureCrmTables, rowToOrder } from '@/lib/crm';

const STATUSES = ['new', 'ready', 'written', 'shipped'];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  await ensureCrmTables();
  const result = await db.execute({
    sql: `SELECT o.*, c.slug AS customer_slug FROM shopier_orders o
          LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`,
    args: [id],
  });
  if (!result.rows.length) {
    return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 });
  }
  return NextResponse.json({ success: true, order: rowToOrder(result.rows[0]) });
}

// Elle düzenlenebilir alanlar: extracted, card_type, status, customer_id
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const sets: string[] = [];
    const args: (string | number | null)[] = [];

    if (body.extracted !== undefined) { sets.push('extracted = ?'); args.push(JSON.stringify(body.extracted)); }
    if (body.card_type !== undefined) { sets.push('card_type = ?'); args.push(String(body.card_type)); }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Geçersiz durum' }, { status: 400 });
      }
      sets.push('status = ?'); args.push(body.status);
    }
    if (body.customer_id !== undefined) { sets.push('customer_id = ?'); args.push(body.customer_id); }

    // Kart bilgisi elle kaydedildi: senkronizasyon / toplu yeniden okuma bu siparişin notunu artık ezmez
    if (body.extracted !== undefined || body.card_type !== undefined) sets.push('edited = 1');

    if (!sets.length) return NextResponse.json({ success: false, error: 'Güncellenecek alan yok' }, { status: 400 });

    await ensureCrmTables();
    await db.execute({ sql: `UPDATE shopier_orders SET ${sets.join(', ')} WHERE id = ?`, args: [...args, id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CRM sipariş güncelleme hatası:', error);
    return NextResponse.json({ success: false, error: 'Güncellenemedi' }, { status: 500 });
  }
}
