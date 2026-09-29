import { NextResponse } from 'next/server';
import { verifyWebhookSignature, type ShopierOrder } from '@/lib/shopier';
import { ensureCrmTables, upsertOrder } from '@/lib/crm';

const ORDER_EVENTS = ['order.created', 'order.addressUpdated', 'order.fulfilled'];

// Shopier webhook alıcısı — 5 sn içinde 200 dönmeliyiz, yoksa Shopier tekrar dener
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, request.headers.get('shopier-signature'))) {
    return NextResponse.json({ success: false, error: 'Geçersiz imza' }, { status: 401 });
  }

  const event = request.headers.get('shopier-event') || '';
  if (!ORDER_EVENTS.includes(event)) return NextResponse.json({ success: true, ignored: event });

  try {
    const body = JSON.parse(rawBody);
    const order: ShopierOrder = body?.data ?? body;
    await ensureCrmTables();
    await upsertOrder(order);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shopier webhook hatası:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
