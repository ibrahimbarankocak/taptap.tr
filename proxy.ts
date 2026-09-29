import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export async function proxy(request: NextRequest) {
  const { pathname }  = request.nextUrl;

  // Eğer kullanıcı /admin/login sayfasına gitmeye çalışıyorsa dokunma, geçsin
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Eğer yol /admin ile başlıyorsa (ve login değilse) güvenliği işlet
  if (pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get(SESSION_COOKIE);

    // Çerez yoksa veya imzası geçersizse şutla login'e
    if (!(await verifySessionToken(authCookie?.value))) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};