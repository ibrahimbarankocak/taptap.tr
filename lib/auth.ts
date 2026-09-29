import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

// /api/* rotaları middleware ile korunmuyor; admin verisi dönen / değiştiren rotalarda bunu çağır.
// Yetkisizse 401 response döner, yetkiliyse null.
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  if (await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)) return null;
  return NextResponse.json({ success: false, error: 'Yetkisiz' }, { status: 401 });
}
