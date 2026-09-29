import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { searchPlaces, resolveGoogleLink, GoogleConfigError, type PlaceResult } from '@/lib/google';
import { googleReviewUrl } from '@/lib/parseOrderNote';
import { fitSummary } from '@/lib/ndef';

// GET /api/google/places?q=İşletme adı                    -> isimle arama
// GET /api/google/places?link=https://share.google/...&q=  -> müşterinin linkinden işletmeyi bul (q yedek)
// Dönen her sonuçta doğrudan yorum ekranı linki (reviewUrl) ve karttaki boyutu (size) var.
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim().slice(0, 200);
  const link = (params.get('link') || '').trim();

  let resolvedName: string | undefined;
  try {
    let places: PlaceResult[] = [];

    if (link) {
      const info = await resolveGoogleLink(link);
      resolvedName = info.name;
      if (info.placeId) {
        // Link zaten Place ID içeriyor: aramaya gerek yok
        const reviewUrl = googleReviewUrl(info.placeId);
        places = [{ id: info.placeId, name: info.name ?? '', address: '', reviewUrl, size: fitSummary(reviewUrl) }];
      } else if (info.name) {
        const near = info.lat !== undefined && info.lng !== undefined ? { lat: info.lat, lng: info.lng } : undefined;
        places = await searchPlaces(info.name, near);
      }
    }
    if (!places.length && q) places = await searchPlaces(q);

    return NextResponse.json({ success: true, places, resolvedName });
  } catch (error) {
    if (error instanceof GoogleConfigError) {
      // Anahtar yoksa bile linkten çıkan işletme adını döndür (admin elle arayabilsin)
      return NextResponse.json({ success: false, error: error.message, needsKey: true, resolvedName }, { status: 503 });
    }
    console.error('Google Places hatası:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Google araması başarısız', resolvedName },
      { status: 500 }
    );
  }
}
