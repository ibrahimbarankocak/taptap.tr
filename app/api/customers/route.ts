import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { parseCustomerInput } from '@/lib/validate';
import { invalidateProfile } from '@/lib/profile';
import { ensureIbanTable, replaceExtraIbansStatements } from '@/lib/ibans';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // profile_image (base64) listede gönderilmiyor — çok büyük. Görsel /{slug}/avatar'dan gelir;
    // avatar_version görsel değişince değişir (önbellek kırıcı).
    const result = await db.execute(`
      SELECT id, slug, full_name, card_type, job_title, company, iban,
        CASE WHEN profile_image IS NULL OR profile_image = '' THEN NULL
             ELSE length(profile_image) || '-' || substr(profile_image, -16) END AS avatar_version,
        (SELECT url FROM social_links s WHERE s.customer_id = customers.id AND s.platform = 'google_review' LIMIT 1) AS review_url,
        CASE WHEN theme_color = '#ffffff' THEN 'white' ELSE 'black' END AS theme
      FROM customers ORDER BY id DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Müşteri listesi hatası:', error);
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = parseCustomerInput(await request.json());
    if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    const c = parsed.data;

    const exists = await db.execute({ sql: 'SELECT 1 FROM customers WHERE slug = ?', args: [c.slug] });
    if (exists.rows.length) {
      return NextResponse.json({ success: false, error: `"${c.slug}" adresi zaten kullanımda, başka bir slug seç.` }, { status: 409 });
    }

    await ensureIbanTable();

    // Müşteri + sosyal linkler + ek IBAN'lar tek işlemde: biri hata verirse hiçbiri kaydedilmez
    const results = await db.batch(
      [
        {
          sql: `INSERT INTO customers (full_name, slug, card_type, account_holder, job_title, company, phone, email, iban, address, profile_image, theme_color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
          args: [c.full_name, c.slug, c.card_type, c.account_holder, c.job_title, c.company, c.phone, c.email, c.iban, c.address, c.profile_image, c.theme_color],
        },
        ...c.socials.map((s) => ({
          sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES ((SELECT id FROM customers WHERE slug = ?), ?, ?)',
          args: [c.slug, s.platform, s.url],
        })),
        ...(c.extra_ibans.length ? replaceExtraIbansStatements({ slug: c.slug }, c.extra_ibans) : []),
      ],
      'write'
    );

    invalidateProfile(c.slug);
    return NextResponse.json({ success: true, id: Number(results[0].rows[0].id) });
  } catch (error) {
    console.error('Müşteri ekleme hatası:', error);
    return NextResponse.json({ success: false, error: 'Kayıt başarısız. Veritabanı hatası.' }, { status: 500 });
  }
}
