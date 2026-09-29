import { unstable_cache, revalidateTag, revalidatePath } from 'next/cache';
import { createHash } from 'crypto';
import db from '@/lib/db';
import { safeUrl } from '@/lib/validate';

// Herkese açık profil sayfasının ihtiyaç duyduğu alanlar.
// profile_image (base64) bilerek dışarıda: görsel /{slug}/avatar adresinden, önbellekli servis edilir.
export type PublicProfile = {
  id: number;
  slug: string;
  full_name: string;
  card_type: 'premium' | 'iban' | 'google';
  account_holder: string;
  job_title: string;
  company: string;
  phone: string;
  email: string;
  iban: string;
  address: string;
  theme: 'black' | 'white'; // IBAN kartı rengi: beyaz kartın ekranı açık tema
  extra_ibans: { iban: string; holder: string }[]; // IBAN kartındaki ek IBAN'lar (çoğu kartta boş)
  avatar_version: string | null; // görsel yoksa null; varsa içerik özeti (önbellek kırıcı)
  socials: { id: number; platform: string; url: string }[];
};

// Profil verisinin şekli her değiştiğinde artır (eski önbellek kayıtları geçersiz olsun)
const PROFILE_CACHE_VERSION = 'public-profile-v2';

const str = (v: unknown) => (v == null ? '' : String(v));
const profileTag = (slug: string) => `profile:${slug}`;

async function loadProfile(slug: string): Promise<PublicProfile | null> {
  const [customerRes, socialRes] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM customers WHERE slug = ?', args: [slug] }),
    db.execute({
      sql: 'SELECT id, platform, url FROM social_links WHERE customer_id = (SELECT id FROM customers WHERE slug = ?) ORDER BY id',
      args: [slug],
    }),
  ]);
  const c = customerRes.rows[0];
  if (!c) return null;

  // Ek IBAN'lar: tablo henüz yoksa (hiç çoklu IBAN kaydedilmediyse) sessizce boş liste
  let extra_ibans: PublicProfile['extra_ibans'] = [];
  if (c.card_type === 'iban') {
    try {
      const r = await db.execute({ sql: 'SELECT iban, holder FROM customer_ibans WHERE customer_id = ? ORDER BY position, id', args: [c.id] });
      extra_ibans = r.rows.map((x) => ({ iban: str(x.iban), holder: str(x.holder) }));
    } catch {
      extra_ibans = [];
    }
  }
  const image = str(c.profile_image);
  return {
    id: Number(c.id),
    slug: str(c.slug),
    full_name: str(c.full_name),
    card_type: c.card_type === 'iban' || c.card_type === 'google' ? c.card_type : 'premium',
    account_holder: str(c.account_holder),
    job_title: str(c.job_title),
    company: str(c.company),
    phone: str(c.phone),
    email: str(c.email),
    iban: str(c.iban),
    address: str(c.address),
    theme: str(c.theme_color).toLowerCase() === '#ffffff' ? 'white' : 'black',
    extra_ibans,
    avatar_version: image ? createHash('sha1').update(image).digest('hex').slice(0, 12) : null,
    // Eski kayıtlarda kalmış olabilecek "javascript:" gibi güvensiz linkler hiç sayfaya ulaşmaz
    socials: socialRes.rows.flatMap((r) => {
      const url = safeUrl(r.url);
      return url ? [{ id: Number(r.id), platform: str(r.platform), url }] : [];
    }),
  };
}

// Profil verisini önbellekten okur (admin değişikliğinde invalidateProfile ile anında yenilenir)
export function getProfile(slug: string) {
  // Önbellek anahtarında sürüm var: profil verisinin şekli değişince (yeni alan eklenince) eski önbellek
  // hiç kullanılmaz. Vercel veri önbelleği deploy'lar arasında korunduğu için bu şart.
  return unstable_cache(() => loadProfile(slug), [PROFILE_CACHE_VERSION, slug], {
    tags: [profileTag(slug)],
    revalidate: 3600,
  })();
}

// Profil görseli ayrı önbellekte (büyük veri; sayfa HTML'ine gömülmesin)
export function getProfileImage(slug: string) {
  return unstable_cache(
    async () => {
      const res = await db.execute({ sql: 'SELECT profile_image FROM customers WHERE slug = ?', args: [slug] });
      return str(res.rows[0]?.profile_image) || null;
    },
    ['public-profile-image', slug],
    { tags: [profileTag(slug)], revalidate: 3600 }
  )();
}

// Admin bir profili ekleyip/düzenleyip/silince çağır — sayfa ve vCard anında güncellenir
export function invalidateProfile(...slugs: (string | null | undefined)[]) {
  for (const slug of new Set(slugs.filter(Boolean) as string[])) {
    revalidateTag(profileTag(slug), { expire: 0 });
    revalidatePath(`/${slug}`);
  }
}
