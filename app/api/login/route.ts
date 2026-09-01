import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Admin bilgileri (İleride veritabanına da bağlayabiliriz)
    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'taptap123';

    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set('taptap_admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 gün
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Kullanıcı adı veya şifre hatalı!' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}