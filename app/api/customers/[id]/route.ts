import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { parseCustomerInput, SOCIAL_PLATFORMS } from '@/lib/validate';
import { invalidateProfile } from '@/lib/profile';
import { ensureIbanTable, replaceExtraIbansStatements, getExtraIbans } from '@/lib/ibans';

const validId = (id: string) => /^\d+$/.test(id);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!validId(id)) {
      return NextResponse.json({ success: false, error: 'Geçersiz ID' }, { status: 400 });
    }

    const [result, socialResult] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [id] }),
      db.execute({ sql: 'SELECT platform, url FROM social_links WHERE customer_id = ?', args: [id] }),
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Müşteri bulunamadı' }, { status: 404 });
    }

    const socials: Record<string, string> = {};
    for (const row of socialResult.rows) socials[String(row.platform)] = String(row.url);

    await ensureIbanTable();
    const extra_ibans = await getExtraIbans(id);
    return NextResponse.json({ success: true, customer: result.rows[0], socials, extra_ibans });
  } catch (error) {
    console.error('Müşteri getirme hatası:', error);
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!validId(id)) {
      return NextResponse.json({ success: false, error: 'Geçersiz ID' }, { status: 400 });
    }

    const body = await request.json();
    const current = await db.execute({ sql: 'SELECT slug FROM customers WHERE id = ?', args: [id] });
    if (!current.rows.length) {
      return NextResponse.json({ success: false, error: 'Müşteri bulunamadı' }, { status: 404 });
    }
    const oldSlug = String(current.rows[0].slug);

    // Mevcut (değişmeyen) adres 15 karakterden uzun olsa da kabul edilir — basılı kart bozulmasın
    const parsed = parseCustomerInput(body, oldSlug);
    if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    const c = parsed.data;

    const taken = await db.execute({ sql: 'SELECT 1 FROM customers WHERE slug = ? AND id != ?', args: [c.slug, id] });
    if (taken.rows.length) {
      return NextResponse.json({ success: false, error: `"${c.slug}" adresi başka bir müşteride kullanılıyor.` }, { status: 409 });
    }

    // Sadece formda gönderilen platformlar yenilenir; formda olmayanlar (ör. youtube) korunur.
    // Google yorum linki her zaman yenilenir (kart tipi değişince eskisi kalmasın).
    const platformsInForm: string[] = [...SOCIAL_PLATFORMS.filter((p) => p in body), 'google_review'];

    await ensureIbanTable();

    // Tek işlem: güncelleme yarıda kalırsa linkler / IBAN'lar kaybolmaz
    await db.batch(
      [
        {
          sql: `UPDATE customers
                SET full_name = ?, slug = ?, card_type = ?, account_holder = ?, job_title = ?, company = ?, phone = ?, email = ?, iban = ?, address = ?, profile_image = ?, theme_color = ?
                WHERE id = ?`,
          args: [c.full_name, c.slug, c.card_type, c.account_holder, c.job_title, c.company, c.phone, c.email, c.iban, c.address, c.profile_image, c.theme_color, id],
        },
        ...(platformsInForm.length
          ? [{
              sql: `DELETE FROM social_links WHERE customer_id = ? AND platform IN (${platformsInForm.map(() => '?').join(', ')})`,
              args: [id, ...platformsInForm],
            }]
          : []),
        ...c.socials
          .filter((s) => platformsInForm.includes(s.platform))
          .map((s) => ({
            sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)',
            args: [id, s.platform, s.url],
          })),
        // Ek IBAN'lar: sadece form gönderdiyse yenilenir (Google sayfası gibi göndermeyenlerde korunur)
        ...('extra_ibans' in body ? replaceExtraIbansStatements({ id }, c.extra_ibans) : []),
      ],
      'write'
    );

    invalidateProfile(oldSlug, c.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Güncelleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Güncelleme sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id: customerId } = await params;
    if (!validId(customerId)) {
      return NextResponse.json({ success: false, error: 'Geçersiz ID' }, { status: 400 });
    }

    const current = await db.execute({ sql: 'SELECT slug FROM customers WHERE id = ?', args: [customerId] });
    await ensureIbanTable();

    await db.batch(
      [
        { sql: 'DELETE FROM social_links WHERE customer_id = ?', args: [customerId] },
        { sql: 'DELETE FROM customer_ibans WHERE customer_id = ?', args: [customerId] },
        { sql: 'DELETE FROM customers WHERE id = ?', args: [customerId] },
      ],
      'write'
    );

    invalidateProfile(current.rows[0]?.slug as string | undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Silme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Silme işlemi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
