import { getProfile, getProfileImage } from '@/lib/profile';
import { safeUrl } from '@/lib/validate';

// vCard 3.0 değerlerinde \ , ; ve satır sonları kaçışlanmalı; yoksa kart bozulur
// ya da alan içine yeni satır enjekte edilebilir.
const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);

// 75 karakterden uzun satırları standarda uygun katla (özellikle PHOTO için)
const fold = (line: string) => line.match(/.{1,74}/g)?.join('\r\n ') ?? line;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const p = await getProfile(slug);
    if (!p) return new Response('Kişi bulunamadı', { status: 404 });

    const [last = '', ...firstParts] = p.full_name.split(' ').reverse();
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${esc(p.full_name)}`,
      p.card_type === 'premium' ? `N:${esc(last)};${esc(firstParts.reverse().join(' '))};;;` : `N:;${esc(p.full_name)};;;`,
      p.job_title && `TITLE:${esc(p.job_title)}`,
      (p.company || p.card_type === 'iban') && `ORG:${esc(p.company || p.full_name)}`,
      p.phone && `TEL;TYPE=CELL,VOICE:${esc(p.phone)}`,
      p.email && `EMAIL;TYPE=INTERNET:${esc(p.email)}`,
      p.address && `ADR;TYPE=WORK:;;${esc(p.address)};;;;`,
      ...p.socials.map((s) => safeUrl(s.url)).map((u, i) => u && `URL;TYPE=${p.socials[i].platform}:${esc(u)}`),
      `URL;TYPE=taptap:${esc(new URL(`/${p.slug}`, request.url).toString())}`,
      (p.iban || p.account_holder) &&
        `NOTE:${esc(
          [
            p.iban && `IBAN: ${p.iban}`,
            p.account_holder && `Hesap sahibi: ${p.account_holder}`,
            // çoklu IBAN kartı: ek IBAN'lar ve sahipleri
            ...(p.extra_ibans ?? []).map((e) => `IBAN: ${e.iban}${e.holder ? ` (${e.holder})` : ''}`),
          ]
            .filter(Boolean)
            .join('\n')
        )}`,
    ];

    if (p.avatar_version) {
      const img = (await getProfileImage(slug))?.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (img) lines.push(fold(`PHOTO;ENCODING=b;TYPE=${img[1].toUpperCase()}:${img[2]}`));
    }
    lines.push('END:VCARD');

    const filename = `${p.slug}.vcf`;
    return new Response(lines.filter(Boolean).join('\r\n') + '\r\n', {
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('vCard hatası:', error);
    return new Response('Sunucu hatası', { status: 500 });
  }
}
