import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { reparseOrders } from '@/lib/crm';

// Notları güncel okuyucuyla yeniden okur (elle düzenlenen / profili oluşturulan siparişlere dokunmaz)
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ success: true, ...(await reparseOrders()) });
  } catch (error) {
    console.error('Not yeniden okuma hatası:', error);
    return NextResponse.json({ success: false, error: 'Notlar yeniden okunamadı' }, { status: 500 });
  }
}
