import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname }  = request.nextUrl;

  // Eğer kullanıcı /admin/login sayfasına gitmeye çalışıyorsa dokunma, geçsin
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Eğer yol /admin ile başlıyorsa (ve login değilse) güvenliği işlet
  if (pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('taptap_admin_auth');

    // Çerez yoksa veya 'authenticated' değilse şutla login'e
    if (!authCookie || authCookie.value !== 'authenticated') {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};