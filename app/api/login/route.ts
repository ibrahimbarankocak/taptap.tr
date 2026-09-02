import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Vercel'den şifreleri çekiyoruz
    const ADMIN_USER = process.env.ADMIN_USERNAME;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD;

    // Şifreler eşleşirse cookie oluştur ve onayla
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const cookieStore = await cookies();
      cookieStore.set('taptap_admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 gün
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    // Eşleşmezse hata döndür
    return NextResponse.json({ success: false, error: 'Kullanıcı adı veya şifre hatalı!' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}