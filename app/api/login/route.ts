import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/lib/session';

// Kaba kuvvet (şifre deneme) koruması: IP başına 15 dakikada en fazla 8 hatalı deneme.
// Bellekte tutulur; sunucusuz ortamda her örnek kendi sayacını tutar ama yine de denemeleri ciddi yavaşlatır.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const failures = new Map<string, { count: number; first: number }>();

const clientIp = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';

// Sabit süreli karşılaştırma (şifrenin harf harf tahmin edilmesini engeller)
const safeEqual = (a: string, b: string) => {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  const now = Date.now();
  const entry = failures.get(ip);
  if (entry && now - entry.first < WINDOW_MS && entry.count >= MAX_FAILS) {
    const minutes = Math.ceil((WINDOW_MS - (now - entry.first)) / 60000);
    return NextResponse.json(
      { success: false, error: `Çok fazla hatalı deneme. ${minutes} dakika sonra tekrar dene.` },
      { status: 429 }
    );
  }

  try {
    const { username, password } = await request.json();

    // Şifreleri ortam değişkenlerinden (Vercel) çekiyoruz
    const ADMIN_USER = process.env.ADMIN_USERNAME;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD;

    // Kullanıcı adı ve şifre ikisi de her zaman kontrol edilir (hangisinin yanlış olduğu sızmasın)
    const userOk = !!ADMIN_USER && safeEqual(String(username ?? ''), ADMIN_USER);
    const passOk = !!ADMIN_PASS && safeEqual(String(password ?? ''), ADMIN_PASS);

    if (userOk && passOk) {
      failures.delete(ip);
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, await createSessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE, // 1 gün
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    const next = entry && now - entry.first < WINDOW_MS ? { count: entry.count + 1, first: entry.first } : { count: 1, first: now };
    failures.set(ip, next);
    if (failures.size > 10000) failures.clear(); // bellek şişmesin

    return NextResponse.json({ success: false, error: 'Kullanıcı adı veya şifre hatalı!' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}
