import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import {
  ShoppingBag, Truck, PackageCheck, Smile, Smartphone, BatteryFull, Download, RefreshCw, Sparkles,
  ArrowRight, ChevronDown, Mail, Star, Wallet, Nfc,
} from 'lucide-react';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';
import logo from '@/public/logo.jpeg';
import ScrollFx from '@/components/promo/ScrollFx';
import NeonWaves, { type Palette } from '@/components/promo/NeonWaves';
import ProductGrid from '@/components/promo/ProductGrid';
import { getStoreProducts, STORE_URL } from '@/lib/shopierStore';

// Ürünler Shopier mağazasından saatte bir tazelenir; sayfa önbellekten anında açılır
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'TapTap · NFC Kartlar — IBAN, Google Yorum, Instagram, WhatsApp',
  description:
    'Telefonunuzu yaklaştırın, gerisini TapTap halletsin. IBAN, Google yorum, Instagram ve WhatsApp NFC kartları. Ücretsiz kargo, kurulu teslim.',
  openGraph: { images: ['/promo/paket4.jpg'] },
};

// Markanın herkese açık iletişim bilgileri (Shopier mağaza banner'ından)
const CONTACT = {
  instagram: 'https://www.instagram.com/taptap.tr/',
  whatsapp: 'https://wa.me/905369700348',
  phone: '+90 536 970 0348',
  email: 'taptapresmi@gmail.com',
};

const CARD_TYPES: { key: Palette; title: string; subtitle: string; text: string; image: string; icon: React.ReactNode; accent: string }[] = [
  {
    key: 'google', title: 'Google Yorum Kartı', subtitle: 'Bizi Google’da Değerlendirin',
    text: 'Müşteriniz telefonunu yaklaştırır, doğrudan yorum ekranı açılır. Daha çok yorum, daha üst sıralar.',
    image: '/promo/google.jpg', icon: <Star size={18} />, accent: 'from-blue-500 to-violet-500',
  },
  {
    key: 'iban', title: 'IBAN Kartı', subtitle: 'Banka Hesabımız',
    text: 'IBAN ve hesap sahibi tek dokunuşla ekranda, tek tuşla kopyalanır. Yanlış yazılan IBAN derdi biter.',
    image: '/promo/iban.jpg', icon: <Wallet size={18} />, accent: 'from-amber-400 to-orange-600',
  },
  {
    key: 'instagram', title: 'Instagram Kartı', subtitle: 'Bizi Instagram’da Takip Edin',
    text: 'Profiliniz anında açılır; takip etmek için arama yapmaya gerek kalmaz.',
    image: '/promo/instagram.jpg', icon: <FaInstagram size={18} />, accent: 'from-pink-500 to-purple-600',
  },
  {
    key: 'whatsapp', title: 'WhatsApp Kartı', subtitle: 'Bize WhatsApp’tan Mesaj Gönderin',
    text: 'Numara kaydetmeden doğrudan sohbet açılır. Sipariş ve randevular hızlanır.',
    image: '/promo/whatsapp.jpg', icon: <FaWhatsapp size={18} />, accent: 'from-green-400 to-emerald-700',
  },
];

const FEATURES = [
  { icon: <Smartphone size={20} />, title: 'Uygulama gerekmez', text: 'NFC’li telefonlarda kart okutmak için hiçbir uygulama indirmek gerekmez.' },
  { icon: <BatteryFull size={20} />, title: 'Pil ve şarj yok', text: 'Kartın içinde pil yoktur; enerjisini okutan telefondan alır.' },
  { icon: <Download size={20} />, title: 'Kurulu teslim', text: 'Kartınız bilgilerinizle yüklenmiş olarak gelir; kutudan çıkar çıkmaz çalışır.' },
  { icon: <Truck size={20} />, title: 'Ücretsiz kargo', text: 'Tüm siparişlerde kargo bizden.' },
  { icon: <RefreshCw size={20} />, title: 'Siyah & beyaz', text: 'Mekânınızın tarzına uygun siyah ya da beyaz kart seçeneği.' },
  { icon: <Sparkles size={20} />, title: 'Şeffaf stand', text: 'Kasaya, masaya, tezgâha: isteğe bağlı şeffaf stand ile her yerde görünür.' },
];

const FAQ = [
  { q: 'NFC kart nasıl çalışır?', a: 'Kartın içinde küçük bir NFC çipi var. Telefonun üst arka kısmını karta yaklaştırdığınızda telefon kartı okur ve ilgili sayfayı (Google yorum ekranı, IBAN, Instagram profili, WhatsApp sohbeti) otomatik açar.' },
  { q: 'Hangi telefonlarda çalışır?', a: 'NFC’si olan tüm güncel telefonlarda çalışır. iPhone XS ve sonrası modeller kartı otomatik okur; Android telefonlarda NFC ayarının açık olması yeterlidir.' },
  { q: 'Uygulama indirmem gerekiyor mu?', a: 'Hayır. Ne sizin ne de müşterinizin herhangi bir uygulama indirmesine gerek yok.' },
  { q: 'Kartıma hangi bilgiler yüklenir?', a: 'Siparişinizi verirken sipariş notuna Google işletme adınızı, IBAN ve hesap sahibi bilgilerinizi, Instagram kullanıcı adınızı ya da WhatsApp numaranızı yazmanız yeterli. Kartınız bu bilgilerle kurulu olarak gönderilir.' },
  { q: 'Pil ya da şarj gerekiyor mu?', a: 'Hayır. NFC kartlar pilsizdir; okutan telefonun enerjisiyle çalışır.' },
];

const reveal = (d = 0) => ({ 'data-reveal': '', style: { '--d': d } as CSSProperties });

export default async function HomePage() {
  const products = await getStoreProducts();

  return (
    <main className="relative bg-[#050505] text-white overflow-x-clip selection:bg-orange-500/30">
      <ScrollFx />

      {/* ---------- ÜST MENÜ ---------- */}
      <header className="fixed top-0 inset-x-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl px-4 mt-3">
          <nav className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl px-4 py-2.5">
            <a href="#top" className="text-xl font-black tracking-tighter">TapTap.</a>
            <div className="hidden md:flex items-center gap-7 text-sm text-neutral-400">
              <a href="#kartlar" className="hover:text-white transition-colors">Kartlar</a>
              <a href="#nasil" className="hover:text-white transition-colors">Nasıl Çalışır</a>
              <a href="#urunler" className="hover:text-white transition-colors">Ürünler</a>
              <a href="#sss" className="hover:text-white transition-colors">SSS</a>
            </div>
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="press shine flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-sm font-bold hover:bg-neutral-200">
              <ShoppingBag size={16} /> Sipariş Ver
            </a>
          </nav>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section id="top" className="relative min-h-[100svh] flex items-center pt-28 pb-16 overflow-hidden">
        {/* Arka plan: dönen neon halkalar (paralaks) */}
        <div className="pointer-events-none absolute inset-0">
          <div data-speed="-0.25" className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-none opacity-80">
            <NeonWaves id="hero" palette="mixed" rings={9} className="w-full h-auto" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <p {...reveal(0)} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-300">
              <Nfc size={14} className="text-orange-400" /> Telefonunuzu yaklaştırın
            </p>
            <h1 {...reveal(1)} className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              Tek dokunuş.
              <br />
              <span className="text-neon">Anında bağlantı.</span>
            </h1>
            <p {...reveal(2)} className="mt-6 text-base sm:text-lg text-neutral-400 max-w-xl mx-auto lg:mx-0">
              Google yorumu, IBAN, Instagram, WhatsApp… Müşteriniz telefonunu karta yaklaştırır, gerisini TapTap halleder. Uygulama yok, bekleme yok.
            </p>
            <div {...reveal(3)} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="press shine inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-6 py-4 font-bold shadow-[0_15px_60px_-15px_rgba(255,255,255,0.5)] hover:bg-neutral-200">
                <ShoppingBag size={18} /> Hemen Sipariş Ver
              </a>
              <a href="#kartlar" className="press inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-6 py-4 font-bold text-white hover:bg-white/10">
                Kartları İncele <ArrowRight size={18} />
              </a>
            </div>
            <div {...reveal(4)} className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-neutral-300">
              <span className="flex items-center gap-2"><Truck size={17} className="text-orange-400" /> Ücretsiz Kargo</span>
              <span className="flex items-center gap-2"><PackageCheck size={17} className="text-orange-400" /> Kurulu Teslim</span>
              <span className="flex items-center gap-2"><Smile size={17} className="text-orange-400" /> 1000+ Mutlu İşletme</span>
            </div>
          </div>

          {/* Kart yığını: her katman farklı hızda (paralaks) + havada süzülme */}
          <div className="relative h-[380px] sm:h-[480px] lg:h-[560px]">
            <div data-speed="0.12" className="absolute left-[4%] top-[4%] w-[46%]">
              <div className="card-float" style={{ animationDelay: '-1s' }}>
                <Image src="/promo/google.jpg" alt="Google yorum NFC kartı" width={600} height={600} priority className="rounded-3xl shadow-[0_40px_100px_-30px_rgba(99,102,241,0.6)] -rotate-6" />
              </div>
            </div>
            <div data-speed="-0.08" className="absolute right-[2%] top-[0%] w-[44%]">
              <div className="card-float" style={{ animationDelay: '-3s' }}>
                <Image src="/promo/iban.jpg" alt="IBAN NFC kartı" width={600} height={600} priority className="rounded-3xl shadow-[0_40px_100px_-30px_rgba(245,158,11,0.6)] rotate-6" />
              </div>
            </div>
            <div data-speed="0.2" className="absolute left-[10%] bottom-[2%] w-[42%]">
              <div className="card-float" style={{ animationDelay: '-5s' }}>
                <Image src="/promo/whatsapp.jpg" alt="WhatsApp NFC kartı" width={600} height={600} className="rounded-3xl shadow-[0_40px_100px_-30px_rgba(34,197,94,0.55)] rotate-3" />
              </div>
            </div>
            <div data-speed="0.05" className="absolute right-[8%] bottom-[6%] w-[44%]">
              <div className="card-float" style={{ animationDelay: '-2s' }}>
                <Image src="/promo/instagram.jpg" alt="Instagram NFC kartı" width={600} height={600} className="rounded-3xl shadow-[0_40px_100px_-30px_rgba(236,72,153,0.55)] -rotate-3" />
              </div>
            </div>
          </div>
        </div>

        <a href="#kartlar" aria-label="Aşağı kaydır" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-neutral-500 hover:text-white animate-float">
          <ChevronDown size={26} />
        </a>
      </section>

      {/* ---------- KAYAN ŞERİT ---------- */}
      <div className="relative border-y border-white/10 bg-white/[0.02] py-4 overflow-hidden">
        <div className="marquee gap-10 text-sm font-semibold uppercase tracking-[0.25em] text-neutral-500">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['Google Yorum', 'IBAN', 'Instagram', 'WhatsApp', 'Uygulama Yok', 'Pil Yok', 'Ücretsiz Kargo', 'Kurulu Teslim', 'Siyah & Beyaz'].map((t) => (
              <span key={`${k}-${t}`} className="flex items-center gap-10 whitespace-nowrap">
                {t} <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ---------- KART TİPLERİ ---------- */}
      <section id="kartlar" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto">
          <p {...reveal(0)} className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">Kartlar</p>
          <h2 {...reveal(1)} className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">İşletmenize göre bir dokunuş</h2>
          <p {...reveal(2)} className="mt-4 text-neutral-400">Her kart tek bir işi mükemmel yapar. Tek başına ya da avantaj paketleriyle.</p>
        </div>

        <div className="mt-16 space-y-8 sm:space-y-6">
          {CARD_TYPES.map((c, i) => (
            <article
              key={c.key}
              {...reveal(0)}
              className={`relative grid md:grid-cols-2 gap-8 items-center rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 sm:p-10 overflow-hidden ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}
            >
              <div className="relative">
                <div data-speed="-0.1" className="pointer-events-none absolute -inset-16 opacity-70">
                  <NeonWaves id={`card-${c.key}`} palette={c.key} rings={6} className="w-full h-full" />
                </div>
                <div data-speed="0.06" className="relative mx-auto w-[78%] max-w-sm">
                  <Image src={c.image} alt={c.title} width={600} height={600} className="rounded-3xl shadow-2xl" />
                </div>
              </div>
              <div className="relative">
                <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${c.accent} px-3 py-1.5 text-xs font-bold text-white`}>
                  {c.icon} {c.subtitle}
                </span>
                <h3 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">{c.title}</h3>
                <p className="mt-4 text-neutral-400 text-base sm:text-lg leading-relaxed">{c.text}</p>
                <a href="#urunler" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white hover:gap-3 transition-all">
                  Fiyatları gör <ArrowRight size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- NASIL ÇALIŞIR ---------- */}
      <section id="nasil" className="relative py-24 sm:py-32 scroll-mt-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div data-speed="0.15" className="w-[700px] max-w-none opacity-40">
            <NeonWaves id="how" palette="iban" rings={8} className="w-full h-auto" />
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <p {...reveal(0)} className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">Nasıl çalışır</p>
            <h2 {...reveal(1)} className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">Üç adımda hazır</h2>
          </div>
          <ol className="mt-16 grid md:grid-cols-3 gap-5">
            {[
              { n: '01', t: 'Sipariş verin', d: 'Kartınızı Shopier’dan seçin, sipariş notuna bilgilerinizi (Google işletme adı, IBAN, Instagram, WhatsApp) yazın.' },
              { n: '02', t: 'Kurulu gelsin', d: 'Kartınızı bilgilerinizle hazırlayıp ücretsiz kargoyla gönderiyoruz. Kutudan çıkar çıkmaz çalışır.' },
              { n: '03', t: 'Dokundur, bağlan', d: 'Müşteriniz telefonunu karta yaklaştırır; yorum ekranı, IBAN, profil ya da sohbet anında açılır.' },
            ].map((s, i) => (
              <li key={s.n} {...reveal(i)} className="relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-sm p-7">
                <span className="text-6xl font-black text-neon leading-none">{s.n}</span>
                <h3 className="mt-5 text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-neutral-400 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- ÜRÜNLER (Shopier) ---------- */}
      <section id="urunler" className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p {...reveal(0)} className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">Ürünler</p>
          <h2 {...reveal(1)} className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">Size uygun paketi seçin</h2>
          <p {...reveal(2)} className="mt-4 text-neutral-400">Fiyatlar Shopier mağazamızdan güncel olarak gelir.</p>
        </div>
        {products.length ? (
          <ProductGrid products={products} storeUrl={STORE_URL} />
        ) : (
          <div className="text-center">
            <Image src="/promo/paket4.jpg" alt="TapTap 4'lü kampanya paketi" width={600} height={600} className="mx-auto w-72 rounded-3xl" />
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="press mt-8 inline-flex items-center gap-2 rounded-2xl bg-white text-black px-6 py-4 font-bold">
              <ShoppingBag size={18} /> Tüm ürünler Shopier mağazamızda
            </a>
          </div>
        )}
      </section>

      {/* ---------- NEDEN TAPTAP ---------- */}
      <section className="relative mx-auto max-w-6xl px-4 py-24 sm:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <p {...reveal(0)} className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">Neden TapTap</p>
          <h2 {...reveal(1)} className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">Basit. Hızlı. Şık.</h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={f.title} {...reveal(i % 3)} className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/20 hover:bg-white/[0.04] transition-colors">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,0.6)] group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- INSTAGRAM ---------- */}
      <section className="relative mx-auto max-w-6xl px-4 py-16">
        <div {...reveal(0)} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 p-8 sm:p-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pink-600/25 via-purple-600/15 to-orange-500/20" />
          <div data-speed="-0.12" className="pointer-events-none absolute -right-24 -top-24 w-[420px] opacity-70">
            <NeonWaves id="ig" palette="instagram" rings={6} className="w-full h-auto" />
          </div>
          <div className="relative">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-2xl">
              <FaInstagram size={32} />
            </div>
            <h2 className="mt-6 text-3xl sm:text-4xl font-black tracking-tight">@taptap.tr</h2>
            <p className="mt-3 text-neutral-300 max-w-lg mx-auto">Yeni kart tasarımları, kampanyalar ve müşterilerimizin kartlarını Instagram’da paylaşıyoruz.</p>
            <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className="press shine mt-8 inline-flex items-center gap-2 rounded-2xl bg-white text-black px-6 py-4 font-bold hover:bg-neutral-200">
              <FaInstagram size={18} /> Instagram’da Takip Et
            </a>
          </div>
        </div>
      </section>

      {/* ---------- SSS ---------- */}
      <section id="sss" className="relative mx-auto max-w-3xl px-4 py-24 scroll-mt-20">
        <div className="text-center">
          <p {...reveal(0)} className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">SSS</p>
          <h2 {...reveal(1)} className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">Merak edilenler</h2>
        </div>
        <div className="mt-12 space-y-3">
          {FAQ.map((f, i) => (
            <details key={f.q} {...reveal(i % 3)} className="group rounded-2xl border border-white/10 bg-white/[0.02] open:bg-white/[0.04] px-5 py-4">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold">
                {f.q}
                <ChevronDown size={18} className="shrink-0 text-neutral-500 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-neutral-400 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- SON ÇAĞRI ---------- */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div data-speed="0.2" className="w-[1000px] max-w-none opacity-70">
            <NeonWaves id="cta" palette="mixed" rings={10} className="w-full h-auto" />
          </div>
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 {...reveal(0)} className="text-4xl sm:text-6xl font-black tracking-tight">
            Müşterileriniz bir dokunuş <span className="text-neon">uzakta.</span>
          </h2>
          <div {...reveal(1)} className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="press shine inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-7 py-4 font-bold hover:bg-neutral-200">
              <ShoppingBag size={18} /> Shopier’dan Sipariş Ver
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="press inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-7 py-4 font-bold hover:bg-white/10">
              <FaWhatsapp size={18} /> WhatsApp’tan Sorun
            </a>
          </div>
        </div>
      </section>

      {/* ---------- ALT BİLGİ ---------- */}
      <footer className="border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-4 py-12 grid sm:grid-cols-3 gap-8 items-start">
          <div>
            <Image src={logo} alt="TapTap" sizes="140px" className="w-36 h-auto rounded-2xl border border-white/10" />
            <p className="mt-4 text-sm text-neutral-500">Premium NFC çözümleri.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-bold text-neutral-300 mb-3">İletişim</p>
            <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-400 hover:text-white"><FaInstagram /> taptap.tr</a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-400 hover:text-white"><FaWhatsapp /> {CONTACT.phone}</a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 text-neutral-400 hover:text-white"><Mail size={14} /> {CONTACT.email}</a>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-bold text-neutral-300 mb-3">Mağaza</p>
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-400 hover:text-white"><ShoppingBag size={14} /> Shopier mağazası</a>
            <a href="#urunler" className="flex items-center gap-2 text-neutral-400 hover:text-white"><ArrowRight size={14} /> Ürünler ve fiyatlar</a>
          </div>
        </div>
        <p className="text-center text-xs text-neutral-600 pb-8">© {new Date().getFullYear()} TapTap. Tüm hakları saklıdır.</p>
      </footer>
    </main>
  );
}
