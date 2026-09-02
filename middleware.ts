import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Sadece /admin ile başlayan sayfalara bakıyoruz (ama /admin/login hariç)
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const authCookie = request.cookies.get('taptap_admin_auth');

    // Eğer çerez (oturumu) yoksa doğrudan login sayfasına postalıyoruz
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

// Hangi yollarda bu kalkanın çalışacağını belirtiyoruz
export const config = {
  matcher: '/admin/:path*',
};