import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.execute({
      sql: 'SELECT * FROM customers WHERE id = ?',
      args: [id]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Müşteri bulunamadı' }, { status: 404 });
    }

    const customer = result.rows[0];

    const socialResult = await db.execute({
      sql: 'SELECT platform, url FROM social_links WHERE customer_id = ?',
      args: [id]
    });
    
    const socials: Record<string, string> = {};
    socialResult.rows.forEach((row: any) => {
      socials[row.platform] = row.url;
    });

    return NextResponse.json({ success: true, customer, socials });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { full_name, slug, job_title, company, phone, email, iban, address, instagram, linkedin, twitter, website, profile_image } = body;

    await db.execute({
      sql: `UPDATE customers 
            SET full_name = ?, slug = ?, job_title = ?, company = ?, phone = ?, email = ?, iban = ?, address = ?, profile_image = ?
            WHERE id = ?`,
      args: [
        full_name,
        slug.trim().toLowerCase(),
        job_title || '',
        company || '',
        phone || '',
        email || '',
        iban || '',
        address || '',
        profile_image || '',
        id
      ]
    });

    await db.execute({ sql: 'DELETE FROM social_links WHERE customer_id = ?', args: [id] });

    if (instagram) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [id, 'instagram', instagram] });
    if (linkedin) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [id, 'linkedin', linkedin] });
    if (twitter) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [id, 'twitter', twitter] });
    if (website) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [id, 'website', website] });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Güncelleme hatası:", error);
    return NextResponse.json({ success: false, error: 'Güncelleme sırasında hata oluştu.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await db.execute({ sql: 'DELETE FROM social_links WHERE customer_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM customers WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Silme hatası:", error);
    return NextResponse.json({ success: false, error: 'Silme işlemi sırasında hata oluştu.' }, { status: 500 });
  }
}