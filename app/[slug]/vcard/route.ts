import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    // Müşteriyi buluttan çekiyoruz
    const customerResult = await db.execute({
      sql: 'SELECT * FROM customers WHERE slug = ?',
      args: [slug]
    });

    const customer = customerResult.rows[0] as any;

    if (!customer) {
      return new NextResponse('Kişi bulunamadı', { status: 404 });
    }

    // vCard (.vcf) formatını oluşturuyoruz
    const vcardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${customer.full_name || ''}`,
      `TITLE:${customer.job_title || ''}`,
      `ORG:${customer.company || ''}`,
      `TEL;TYPE=WORK,VOICE:${customer.phone || ''}`,
      `EMAIL:${customer.email || ''}`,
      `ADR;TYPE=WORK:;;${customer.address || ''};;;;`,
      `NOTE:IBAN: ${customer.iban || ''}`,
      'END:VCARD'
    ].join('\n');

    return new NextResponse(vcardData, {
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${customer.slug}.vcf"`,
      },
    });
  } catch (error) {
    return new NextResponse('Sunucu hatası', { status: 500 });
  }
}