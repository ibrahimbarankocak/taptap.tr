import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { normalizeSlug, slugError, MAX_SLUG_LENGTH } from '@/lib/validate';

// GET /api/customers/slug-available?slug=enesulu[&exclude=12]
// Formda yazarken adresin boş olup olmadığını kontrol eder; doluysa boş bir öneri döner (enesulu2, enesulu3...)
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const slug = normalizeSlug(params.get('slug'));
  const exclude = /^\d+$/.test(params.get('exclude') || '') ? Number(params.get('exclude')) : -1;

  // Düzenlenen kartın mevcut adresi değişmediyse uzunluk sınırı yok
  let currentSlug = '';
  if (exclude > 0) {
    const cur = await db.execute({ sql: 'SELECT slug FROM customers WHERE id = ?', args: [exclude] });
    currentSlug = String(cur.rows[0]?.slug ?? '');
  }
  const error = slugError(slug, slug === currentSlug);
  if (error) return NextResponse.json({ available: false, error });

  // Aynı kökle başlayan tüm slug'ları tek sorguda al, boş olanı bellekte bul
  const taken = new Set(
    (
      await db.execute({
        sql: "SELECT slug FROM customers WHERE (slug = ? OR slug GLOB ? || '[0-9]*') AND id != ?",
        args: [slug, slug, exclude],
      })
    ).rows.map((r) => String(r.slug))
  );

  if (!taken.has(slug)) return NextResponse.json({ available: true });
  // Öneri de 15 karakteri geçmesin: gerekirse kökü kısalt (enesulu -> enesulu2)
  for (let n = 2; n < 1000; n++) {
    const candidate = slug.slice(0, MAX_SLUG_LENGTH - String(n).length) + n;
    if (!taken.has(candidate)) {
      const clash = await db.execute({ sql: 'SELECT 1 FROM customers WHERE slug = ?', args: [candidate] });
      if (!clash.rows.length) return NextResponse.json({ available: false, error: 'Bu adres başka bir kartta kullanılıyor.', suggestion: candidate });
    }
  }
  return NextResponse.json({ available: false, error: 'Bu adres başka bir kartta kullanılıyor.' });
}
