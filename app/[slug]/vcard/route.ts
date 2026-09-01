import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    const customer = db.prepare('SELECT * FROM customers WHERE slug = ?').get(slug) as any;
    
    if (!customer) {
      return new NextResponse('Müşteri bulunamadı', { status: 404 });
    }

    const socialLinks = db.prepare('SELECT * FROM social_links WHERE customer_id = ?').all(customer.id) as any[];

    let vcard = `BEGIN:VCARD\nVERSION:3.0\n`;
    vcard += `FN:${customer.full_name}\n`;
    vcard += `N:${customer.full_name.split(' ').reverse().join(';')};;;;\n`;
    
    if (customer.company) vcard += `ORG:${customer.company}\n`;
    if (customer.job_title) vcard += `TITLE:${customer.job_title}\n`;
    
    if (customer.phone) vcard += `TEL;TYPE=CELL:${customer.phone}\n`;
    if (customer.email) vcard += `EMAIL;TYPE=WORK:${customer.email}\n`;
    
    if (customer.address) {
      const cleanAddress = customer.address.replace(/\n/g, ' ');
      vcard += `ADR;TYPE=WORK:;;${cleanAddress};;;;\n`;
    }
    
    socialLinks.forEach(link => {
      vcard += `URL;TYPE=${link.platform.toUpperCase()}:${link.url}\n`;
    });
    
    vcard += `END:VCARD`;

    const response = new NextResponse(vcard);
    response.headers.set('Content-Type', 'text/vcard; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename="${slug}.vcf"`);

    return response;
  } catch (error) {
    return new NextResponse('vCard oluşturulurken hata', { status: 500 });
  }
}