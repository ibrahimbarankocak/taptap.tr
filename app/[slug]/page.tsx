import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Globe, MapPin, CreditCard, Phone, Mail, UserPlus, Briefcase } from 'lucide-react';
import { FaInstagram, FaLinkedin, FaTwitter, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import InstaZoomImage from '@/components/InstaZoomImage';
import IbanCard from '@/components/IbanCard';
import CopyField from '@/components/CopyField';
import { getProfile } from '@/lib/profile';
import { safeHref } from '@/lib/validate';
import logo from '@/public/logo.jpeg';

// Profil sayfaları ilk ziyarette oluşturulup önbellekten sunulur (ISR).
// Admin bir profili değiştirince invalidateProfile() ile anında yenilenir; en geç 1 saatte bir tazelenir.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <FaInstagram size={20} />,
  linkedin: <FaLinkedin size={20} />,
  twitter: <FaTwitter size={20} />,
  youtube: <FaYoutube size={20} />,
  website: <Globe size={20} />,
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', twitter: 'X / Twitter', youtube: 'YouTube', website: 'Web sitesi',
};

const avatarUrl = (slug: string, version: string) => `/${slug}/avatar?v=${version}`;

// WhatsApp için numarayı uluslararası biçime çevir (0532... -> 90532...)
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return '9' + d;
  if (d.length === 10 && d.startsWith('5')) return '90' + d;
  return d;
};

const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProfile(slug);
  if (!p) return { title: 'Profil bulunamadı' };
  const description =
    p.card_type === 'iban'
      ? `${p.full_name} · IBAN bilgileri`
      : [p.job_title, p.company].filter(Boolean).join(' · ') || 'Dijital kartvizit';
  return {
    title: p.full_name,
    description,
    openGraph: {
      title: p.full_name,
      description,
      images: p.avatar_version ? [avatarUrl(p.slug, p.avatar_version)] : ['/logo.jpeg'],
    },
    robots: { index: false }, // kişisel kartlar arama motorlarında listelenmesin
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const customer = await getProfile(slug);
  if (!customer) notFound();

  // Google yorum kartı: doğrudan işletmenin "yorum yaz" ekranına yönlendir
  if (customer.card_type === 'google') {
    const review = customer.socials.find((s) => s.platform === 'google_review');
    if (!review) notFound();
    redirect(review.url);
  }

  // IBAN kartı ayrı tasarım
  if (customer.card_type === 'iban') {
    return (
      <IbanCard
        theme={customer.theme}
        customer={{ full_name: customer.full_name, account_holder: customer.account_holder, iban: customer.iban }}
        extraAccounts={customer.extra_ibans ?? []}
      />
    );
  }

  const socialLinks = customer.socials
    .filter((s) => s.platform !== 'google_review')
    .map((s) => ({ ...s, href: safeHref(s.url) }))
    .filter((s) => s.href);

  const actions = [
    customer.phone && { href: `tel:${customer.phone.replace(/[^\d+]/g, '')}`, label: 'Ara', icon: <Phone size={18} /> },
    customer.phone && { href: `https://wa.me/${waNumber(customer.phone)}`, label: 'WhatsApp', icon: <FaWhatsapp size={18} />, external: true },
    customer.email && { href: `mailto:${customer.email}`, label: 'E-posta', icon: <Mail size={18} /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode; external?: boolean }[];

  return (
    <div className="grain relative min-h-screen bg-[#050505] text-white flex flex-col items-center py-10 sm:py-14 px-4 overflow-hidden">
      {/* Arka plan ışıkları */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-white/[0.07] blur-[120px] animate-aurora" />
        <div className="absolute -right-24 bottom-10 w-[360px] h-[360px] rounded-full bg-neutral-400/[0.06] blur-[110px] animate-aurora [animation-delay:-7s]" />
      </div>

      <main className="relative z-10 w-full max-w-sm">
        <div className="gradient-border animate-scale-in rounded-[2rem] p-7 sm:p-8 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] flex flex-col items-center [--gb-bg:#0c0c0c]">
          {/* Profil fotoğrafı: dönen ışık halkası */}
          <div className="relative mb-6">
            <div aria-hidden className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,rgba(255,255,255,0.7),rgba(255,255,255,0.05),rgba(255,255,255,0.35),rgba(255,255,255,0.05),rgba(255,255,255,0.7))] animate-spin-slow" />
            <div aria-hidden className="absolute -inset-6 rounded-full bg-white/10 blur-2xl animate-glow" />
            <div className="relative rounded-full p-1 bg-[#0c0c0c]">
              {customer.avatar_version ? (
                <InstaZoomImage src={avatarUrl(customer.slug, customer.avatar_version)} alt={customer.full_name} className="w-32 h-32" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-5xl font-bold text-white/90">
                  {customer.full_name.charAt(0).toLocaleUpperCase('tr')}
                </div>
              )}
            </div>
          </div>

          {/* Kimlik */}
          <h1 className="animate-fade-up stagger text-2xl font-bold text-center tracking-tight" style={stagger(1)}>
            {customer.full_name}
          </h1>
          {customer.job_title && (
            <p className="animate-fade-up stagger text-neutral-300 text-center font-medium mt-1" style={stagger(2)}>{customer.job_title}</p>
          )}
          {customer.company && (
            <p className="animate-fade-up stagger flex items-center gap-1.5 text-neutral-500 text-sm text-center mt-1" style={stagger(2)}>
              <Briefcase size={13} /> {customer.company}
            </p>
          )}

          {/* Hızlı iletişim */}
          {actions.length > 0 && (
            <div
              className="animate-fade-up stagger w-full grid gap-2.5 mt-7"
              style={{ ...stagger(3), gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
            >
              {actions.map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="press group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5"
                >
                  <span className="text-neutral-200 transition-transform duration-300 group-hover:scale-110">{a.icon}</span>
                  <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-white">{a.label}</span>
                </a>
              ))}
            </div>
          )}

          {/* Sosyal medya */}
          {socialLinks.length > 0 && (
            <div className="w-full mt-6 flex flex-wrap justify-center gap-3">
              {socialLinks.map((link, i) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL_LABELS[link.platform] || link.platform}
                  className="press animate-fade-up stagger w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/25 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)]"
                  style={stagger(4 + i)}
                >
                  {SOCIAL_ICONS[link.platform] || <Globe size={20} />}
                </a>
              ))}
            </div>
          )}

          {/* IBAN ve adres */}
          {(customer.iban || customer.address) && (
            <div className="animate-fade-up stagger w-full mt-7 rounded-2xl bg-black/40 border border-white/[0.07] divide-y divide-white/[0.07]" style={stagger(6)}>
              {customer.iban && (
                <div className="p-4">
                  <CopyField label="IBAN" value={customer.iban} icon={<CreditCard size={13} />} mono />
                </div>
              )}
              {customer.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-4 hover:bg-white/[0.03] transition-colors rounded-b-2xl"
                >
                  <div className="flex items-center gap-2 text-neutral-500 text-[11px] font-semibold uppercase tracking-widest mb-1">
                    <MapPin size={13} /> Adres
                  </div>
                  <p className="text-sm text-neutral-200 group-hover:text-white">{customer.address}</p>
                </a>
              )}
            </div>
          )}

          {/* Rehbere ekle */}
          <a
            href={`/${customer.slug}/vcard`}
            className="press shine animate-fade-up stagger w-full mt-7 flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-neutral-100 shadow-[0_15px_50px_-12px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
            style={stagger(7)}
          >
            <UserPlus size={18} /> Kişilere Ekle
          </a>
        </div>

        {/* Powered by */}
        <Link
          href="/"
          className="animate-fade-in stagger mt-8 flex flex-col items-center gap-2 group opacity-70 hover:opacity-100 transition-opacity w-fit mx-auto"
          style={stagger(9)}
        >
          <Image src={logo} alt="TapTap" sizes="96px" className="w-24 h-auto rounded-xl border border-neutral-800 bg-neutral-950 p-1" />
          <span className="text-[9px] text-neutral-500 uppercase tracking-[0.3em] font-semibold group-hover:text-neutral-300 transition-colors">
            Powered by TapTap
          </span>
        </Link>
      </main>
    </div>
  );
}
