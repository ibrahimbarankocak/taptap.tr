// Müşteri formu doğrulama / temizleme yardımcıları (sunucu ve istemcide kullanılabilir)

// Sitedeki gerçek yollarla çakışan slug'lar — bunlar profil adresi olamaz
const RESERVED_SLUGS = new Set([
  'admin', 'api', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'logo.jpeg', 'public', 'static', 'login', 'logout',
]);

export const SOCIAL_PLATFORMS = ['instagram', 'linkedin', 'twitter', 'youtube', 'website'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const MAX_PROFILE_IMAGE_BYTES = 1_500_000; // base64 data URI üst sınırı (~1.1MB görsel)

export function normalizeSlug(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

// Yazarken slug'ı geçerli biçime çevirir ("Ahmet Yılmaz" -> "ahmet-yilmaz"); sondaki tire korunur ki yazmak bölünmesin
// Yeni kart adresleri en fazla 15 karakter (eski kartlarda 16 karakterli adresler var; onlar değişmedikçe geçerli)
export const MAX_SLUG_LENGTH = 15;

export function toSlugInput(raw: string, max = MAX_SLUG_LENGTH): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u' };
  return raw
    .toLocaleLowerCase('tr')
    .replace(/i̇|[çğıöşü]/g, (c) => map[c] || c)
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/([-_]){2,}/g, '$1')
    .replace(/^[-_]/, '')
    .slice(0, max);
}

// Başlıktan otomatik slug — mevcut kartlardaki alışkanlığa göre: boşluksuz, küçük harf, Türkçe harfler
// dönüştürülmüş, "/ Banka" eki atılmış. "ENES ULU" -> "enesulu", "SARAN AVM / Kuveyttürk" -> "saranavm"
export function suggestSlug(title: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return title
    .split('/')[0]
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => map[c] || c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // kalan aksanlar (é -> e)
    .replace(/[^a-z0-9]/g, '')
    .slice(0, MAX_SLUG_LENGTH);
}

// allowLong: mevcut bir kartın zaten kullandığı (değişmeyen) adres — 15 sınırı uygulanmaz
export function slugError(slug: string, allowLong = false): string | null {
  if (!slug) return 'Slug zorunludur.';
  if (slug.length > (allowLong ? 60 : MAX_SLUG_LENGTH)) return `Adres en fazla ${MAX_SLUG_LENGTH} karakter olabilir (şu an ${slug.length}).`;
  // Alt çizgi (_) de serbest: canlıdaki eski kartlar (ör. baran_iban) bu adreslerle basıldı
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(slug)) return 'Slug sadece küçük harf, rakam, tire (-) ve alt çizgi (_) içerebilir. Örn: ahmet-yilmaz';
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" sistem tarafından kullanılıyor, başka bir slug seç.`;
  return null;
}

// Sadece http/https linklere izin ver; "javascript:" gibi tehlikeli şemaları engeller.
// Şemasız girilen linklere https:// ekler. Geçersizse null döner.
export function safeUrl(raw: unknown): string | null {
  const v = String(raw ?? '').trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v.replace(/^\/+/, '')}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// Link olarak render edilecek her dış değer için: güvenli değilse href verme
export const safeHref = (raw: unknown) => safeUrl(raw) ?? undefined;

// Google yorum kartı: yapıştırılan linki doğrudan "yorum yaz" ekranını açan linke çevirir.
// Desteklenen: g.page/r/.../review, g.page/r/... (sonuna /review eklenir),
// search.google.com/local/writereview?placeid=..., çıplak Place ID (ChIJ...).
export function toGoogleReviewUrl(raw: unknown): { url: string; warning?: string } | { error: string } {
  const v = String(raw ?? '').trim();
  if (!v) return { error: 'Google yorum linki zorunludur.' };

  // Çıplak Place ID
  if (/^ChIJ[\w-]{10,}$/.test(v)) return { url: `https://search.google.com/local/writereview?placeid=${v}` };

  const url = safeUrl(v);
  if (!url) return { error: 'Geçersiz link.' };
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');

  // g.page/r/<kod>[/review]
  const gpage = host === 'g.page' && u.pathname.match(/^\/r\/([\w-]+)(\/review)?\/?$/);
  if (gpage) return { url: `https://g.page/r/${gpage[1]}/review` };

  // search.google.com/local/writereview?placeid=...
  const placeid = u.searchParams.get('placeid');
  if (host === 'search.google.com' && placeid) {
    return { url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeid)}` };
  }

  // Google linki ama yorum ekranını doğrudan açtığından emin olamadıklarımız (maps paylaşım linki vb.)
  if (/(^|\.)google\.[a-z.]+$|goo\.gl$|g\.co$|g\.page$/.test(host)) {
    return {
      url,
      warning: 'Bu link yorum ekranını doğrudan açmayabilir. Google İşletme Profili → "Yorum iste" bölümündeki linki (g.page/r/.../review) kullanmak en iyisi.',
    };
  }
  return { error: 'Bu bir Google linki değil. Google İşletme Profili → "Yorum iste" linkini yapıştır.' };
}

export function profileImageError(img: unknown): string | null {
  if (!img) return null;
  const s = String(img);
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(s)) return 'Profil fotoğrafı geçersiz formatta.';
  if (s.length > MAX_PROFILE_IMAGE_BYTES) return 'Profil fotoğrafı çok büyük.';
  return null;
}

const clip = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export type CustomerInput = {
  full_name: string;
  slug: string;
  card_type: 'premium' | 'iban' | 'google';
  account_holder: string;
  job_title: string;
  company: string;
  phone: string;
  email: string;
  iban: string;
  address: string;
  profile_image: string;
  // Kart teması (kartın rengi): beyaz kart -> açık ekran. DB'de theme_color: '#ffffff' beyaz, diğer her şey siyah
  theme_color: '#ffffff' | '#000000';
  // IBAN kartında ilk IBAN dışındaki ek IBAN'lar (her biri kendi hesap sahibiyle). Tek IBAN'da boş.
  extra_ibans: { iban: string; holder: string }[];
  socials: { platform: SocialPlatform | 'google_review'; url: string }[];
  warning?: string;
};

// İstek gövdesini doğrular; hata varsa { error }, yoksa temizlenmiş veriyi döner
// currentSlug: düzenlemede kartın mevcut adresi — değişmediyse uzunluk sınırı uygulanmaz
export function parseCustomerInput(body: Record<string, unknown>, currentSlug?: string): { error: string } | { data: CustomerInput } {
  const full_name = clip(body.full_name, 120);
  const slug = normalizeSlug(body.slug);
  if (!full_name) return { error: 'Ad Soyad / İşletme Adı zorunludur.' };
  const sErr = slugError(slug, !!currentSlug && slug === currentSlug);
  if (sErr) return { error: sErr };
  const iErr = profileImageError(body.profile_image);
  if (iErr) return { error: iErr };

  const card_type: CustomerInput['card_type'] = body.card_type === 'iban' || body.card_type === 'google' ? body.card_type : 'premium';

  // Ek IBAN'lar (sadece IBAN kartında). Boş satırlar atlanır; en fazla 10.
  const extra_ibans: CustomerInput['extra_ibans'] = [];
  if (card_type === 'iban' && Array.isArray(body.extra_ibans)) {
    for (const raw of body.extra_ibans.slice(0, 10)) {
      const item = (raw ?? {}) as Record<string, unknown>;
      const iban = clip(item.iban, 42);
      const holder = clip(item.holder, 120);
      if (!iban && !holder) continue;
      if (!iban) return { error: 'Ek IBAN satırlarından birinde IBAN boş.' };
      extra_ibans.push({ iban, holder });
    }
  }
  const socials: CustomerInput['socials'] = [];
  let warning: string | undefined;

  // Google yorum kartı: yorum linki zorunlu, doğrudan yorum ekranı linkine çevrilir
  if (card_type === 'google') {
    const review = toGoogleReviewUrl(body.google_review);
    if ('error' in review) return { error: review.error };
    socials.push({ platform: 'google_review', url: review.url });
    warning = review.warning;
  }

  for (const platform of SOCIAL_PLATFORMS) {
    if (!body[platform]) continue;
    const url = safeUrl(body[platform]);
    if (!url) return { error: `${platform} linki geçersiz. http(s):// ile başlayan bir link gir.` };
    socials.push({ platform, url });
  }

  return {
    data: {
      full_name,
      slug,
      card_type,
      account_holder: clip(body.account_holder, 120),
      job_title: clip(body.job_title, 120),
      company: clip(body.company, 120),
      phone: clip(body.phone, 40),
      email: clip(body.email, 160),
      iban: clip(body.iban, 42),
      address: clip(body.address, 500),
      profile_image: body.profile_image ? String(body.profile_image) : '',
      extra_ibans,
      theme_color: body.theme === 'white' || body.theme_color === '#ffffff' ? '#ffffff' : '#000000',
      socials,
      warning,
    },
  };
}
