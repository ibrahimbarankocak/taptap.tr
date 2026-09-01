import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM customers ORDER BY id DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, slug, job_title, company, phone, email, iban, address, instagram, linkedin, twitter, website, profile_image } = body;

    if (!full_name || !slug) {
      return NextResponse.json({ success: false, error: 'Ad Soyad ve Slug alanları zorunludur.' }, { status: 400 });
    }

    const insertCustomer = await db.execute({
      sql: `INSERT INTO customers (full_name, slug, job_title, company, phone, email, iban, address, profile_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [
        full_name, 
        slug.trim().toLowerCase(), 
        job_title || '', 
        company || '', 
        phone || '', 
        email || '', 
        iban || '', 
        address || '',
        profile_image || ''
      ]
    });

    // RETURNING id sayesinde son eklenen ID'yi alıyoruz
    const customerId = insertCustomer.rows[0].id;

    if (instagram) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [customerId, 'instagram', instagram] });
    if (linkedin) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [customerId, 'linkedin', linkedin] });
    if (twitter) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [customerId, 'twitter', twitter] });
    if (website) await db.execute({ sql: 'INSERT INTO social_links (customer_id, platform, url) VALUES (?, ?, ?)', args: [customerId, 'website', website] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Müşteri ekleme hatası:", error);
    return NextResponse.json({ success: false, error: 'Kayıt başarısız. Veritabanı hatası veya slug kullanımda.' }, { status: 500 });
  }
}