// Google Places (sunucu tarafı): işletme adından ya da müşterinin gönderdiği Google linkinden Place ID bulur.
// Places API (New) — https://developers.google.com/maps/documentation/places/web-service/text-search
// Gerekli: GOOGLE_MAPS_API_KEY (Google Cloud → Places API (New) etkin).
import { googleReviewUrl } from '@/lib/parseOrderNote';
import { fitSummary } from '@/lib/ndef';

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviews?: number;
  mapsUrl?: string;
  reviewUrl: string;
  size: ReturnType<typeof fitSummary>;
};

const API = 'https://places.googleapis.com/v1/places:searchText';

export class GoogleConfigError extends Error {}

export async function searchPlaces(query: string, near?: { lat: number; lng: number }): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new GoogleConfigError('GOOGLE_MAPS_API_KEY tanımlı değil (.env / Vercel ortam değişkeni)');

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'tr',
      regionCode: 'TR',
      maxResultCount: 5,
      ...(near ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 1000 } } } : {}),
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    places?: { id: string; displayName?: { text: string }; formattedAddress?: string; rating?: number; userRatingCount?: number; googleMapsUri?: string }[];
  };
  return (data.places ?? []).map((p) => {
    const reviewUrl = googleReviewUrl(p.id);
    return {
      id: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      rating: p.rating,
      reviews: p.userRatingCount,
      mapsUrl: p.googleMapsUri,
      reviewUrl,
      size: fitSummary(reviewUrl),
    };
  });
}

// Sadece Google'a ait adreslere gidilir (başka siteye istek atılmasın — SSRF koruması)
const ALLOWED_HOST = /(^|\.)(google\.[a-z.]+|goo\.gl|share\.google|g\.co|g\.page)$/i;

export type LinkInfo = { placeId?: string; name?: string; lat?: number; lng?: number; finalUrl: string };

// share.google / maps.app.goo.gl gibi kısa linkleri takip eder, son adresten işletme bilgisini çıkarır
export async function resolveGoogleLink(raw: string): Promise<LinkInfo> {
  let url = new URL(raw);
  for (let hop = 0; hop < 6; hop++) {
    if (url.protocol !== 'https:' || !ALLOWED_HOST.test(url.hostname)) throw new Error('Sadece Google linkleri çözülebilir');
    const info = parseGoogleUrl(url);
    if (info.placeId || (info.name && info.lat !== undefined)) return { ...info, finalUrl: url.toString() };
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'tr' }, cache: 'no-store' });
    const next = res.headers.get('location');
    if (!next || res.status < 300 || res.status >= 400) return { ...info, finalUrl: url.toString() };
    url = new URL(next, url);
  }
  return { ...parseGoogleUrl(url), finalUrl: url.toString() };
}

// Google adresinden: place_id, işletme adı, koordinat
export function parseGoogleUrl(url: URL): Omit<LinkInfo, 'finalUrl'> {
  // Çerez onay sayfası: asıl adres "continue" içinde
  const cont = url.searchParams.get('continue');
  if (url.hostname.startsWith('consent.') && cont) {
    try {
      return parseGoogleUrl(new URL(cont));
    } catch {
      /* bozuk */
    }
  }
  const s = decodeURIComponent(url.toString());
  const placeId = url.searchParams.get('placeid') || url.searchParams.get('query_place_id') || s.match(/place_id[:=]([\w-]{20,})/)?.[1];
  const nameFromPath = url.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
  const name = (nameFromPath ? decodeURIComponent(nameFromPath).replace(/\+/g, ' ') : url.searchParams.get('q')) || undefined;
  const coords = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  return {
    placeId: placeId || undefined,
    name: name?.trim() || undefined,
    lat: coords ? Number(coords[1]) : undefined,
    lng: coords ? Number(coords[2]) : undefined,
  };
}
