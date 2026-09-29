import { getProfileImage } from '@/lib/profile';

// Profil fotoğrafını (DB'de base64 data URI) gerçek görsel dosyası olarak, önbellekli servis eder.
// ?v=<sürüm> ile çağrılınca 1 yıl önbelleklenir; görsel değişince sürüm de değişir.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dataUri = await getProfileImage(slug);
  const match = dataUri?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return new Response('Görsel yok', { status: 404 });

  const versioned = new URL(request.url).searchParams.has('v');
  return new Response(Buffer.from(match[2], 'base64'), {
    headers: {
      'Content-Type': match[1],
      'Cache-Control': versioned
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
