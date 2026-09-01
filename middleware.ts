import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Sadece /admin ve alt yollarını koruyoruz, /admin/login serbest
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const authCookie = request.cookies.get('taptap_admin_auth');

    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};