'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Star, Copy, Check, Send } from 'lucide-react';
import { FaInstagram, FaWhatsapp, FaGoogle } from 'react-icons/fa';

// "Dokun, açılsın" canlı demosu: telefon karta yaklaşır, NFC halkası atar, ekranda ilgili sayfa açılır.
// Telefonda da çalışır ama hafif: sadece 3 öğe (telefon, halka, ekran) transform/opacity ile döner;
// ekran dışındayken animasyon sınıfı tamamen kaldırılır (iPhone'da boşuna grafik katmanı tutulmasın).
// Sıradaki kart tipine telefonun her tur sonunda (animationiteration) geçilir — CSS ile senkron.

const TYPES = [
  { key: 'google', label: 'Google Yorum', image: '/promo/google.jpg', dot: 'bg-blue-500' },
  { key: 'iban', label: 'IBAN', image: '/promo/iban.jpg', dot: 'bg-amber-500' },
  { key: 'instagram', label: 'Instagram', image: '/promo/instagram.jpg', dot: 'bg-pink-500' },
  { key: 'whatsapp', label: 'WhatsApp', image: '/promo/whatsapp.jpg', dot: 'bg-green-500' },
] as const;

function Screen({ type }: { type: (typeof TYPES)[number]['key'] }) {
  if (type === 'google')
    return (
      <div className="h-full bg-white text-neutral-900 p-3 flex flex-col">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500"><FaGoogle className="text-blue-500" /> Google</div>
        <p className="mt-3 text-[13px] font-bold leading-tight">İşletmeniz</p>
        <p className="text-[9px] text-neutral-500">Yorum yazın</p>
        <div className="mt-3 flex gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={17} fill="currentColor" strokeWidth={0} />)}
        </div>
        <div className="mt-3 rounded-lg border border-neutral-200 p-2 text-[9px] text-neutral-400 flex-1">Harika hizmet, çok memnun kaldık!</div>
        <div className="mt-2 rounded-full bg-blue-600 text-white text-[10px] font-bold text-center py-1.5">Yayınla</div>
      </div>
    );
  if (type === 'iban')
    return (
      <div className="h-full bg-neutral-950 text-white p-3 flex flex-col">
        <p className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">Banka Hesabımız</p>
        <p className="mt-3 text-[9px] text-neutral-500">Hesap sahibi</p>
        <p className="text-[12px] font-bold">Ad Soyad</p>
        <p className="mt-2 text-[9px] text-neutral-500">IBAN</p>
        <p className="text-[10px] font-mono leading-snug">TR12 0006 4000 0011 2345 6789 01</p>
        <div className="mt-auto rounded-lg bg-amber-500 text-black text-[10px] font-bold py-1.5 flex items-center justify-center gap-1">
          <Copy size={11} /> Kopyala
        </div>
        <p className="mt-1.5 text-[9px] text-emerald-400 flex items-center justify-center gap-1"><Check size={10} /> Kopyalandı</p>
      </div>
    );
  if (type === 'instagram')
    return (
      <div className="h-full bg-white text-neutral-900 p-3 flex flex-col items-center">
        <div className="self-start flex items-center gap-1 text-[10px] font-semibold"><FaInstagram /> Instagram</div>
        <div className="mt-4 w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="w-full h-full rounded-full bg-neutral-200 border-2 border-white" />
        </div>
        <p className="mt-2 text-[11px] font-bold">@isletmeniz</p>
        <div className="mt-2 flex gap-3 text-[9px] text-neutral-500"><span><b className="text-neutral-900">128</b> gönderi</span><span><b className="text-neutral-900">12B</b> takipçi</span></div>
        <div className="mt-auto w-full rounded-lg bg-blue-500 text-white text-[10px] font-bold text-center py-1.5">Takip Et</div>
      </div>
    );
  return (
    <div className="h-full bg-[#0b141a] text-white flex flex-col">
      <div className="bg-[#1f2c34] px-3 py-2 flex items-center gap-2 text-[10px] font-semibold"><FaWhatsapp className="text-green-500" /> İşletmeniz</div>
      <div className="flex-1 p-2 flex flex-col justify-end gap-1.5">
        <p className="self-start max-w-[85%] rounded-lg bg-[#1f2c34] px-2 py-1 text-[9px]">Merhaba, nasıl yardımcı olabiliriz?</p>
        <p className="self-end max-w-[85%] rounded-lg bg-[#005c4b] px-2 py-1 text-[9px]">Sipariş vermek istiyorum 👋</p>
      </div>
      <div className="m-2 rounded-full bg-[#1f2c34] px-2 py-1.5 text-[9px] text-neutral-400 flex items-center justify-between">Mesaj <Send size={10} className="text-green-500" /></div>
    </div>
  );
}

export default function TapDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const t = TYPES[step];

  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-6 items-center">
      <div className="text-center md:text-left">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">Canlı demo</p>
        <h2 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">Dokun, açılsın.</h2>
        <p className="mt-4 text-neutral-400 text-base sm:text-lg max-w-md mx-auto md:mx-0">
          Müşteriniz telefonunu kartın üzerine getirir; uygulama açmadan, arama yapmadan doğru sayfa ekranına gelir.
        </p>
        <div className="mt-7 flex flex-wrap gap-2 justify-center md:justify-start" role="tablist" aria-label="Kart tipi">
          {TYPES.map((x, i) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={i === step}
              onClick={() => setStep(i)}
              className={`press flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border cursor-pointer ${
                i === step ? 'bg-white text-black border-white' : 'border-white/15 text-neutral-400 hover:text-white hover:border-white/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${x.dot}`} /> {x.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={ref} className={`tapdemo relative mx-auto w-full max-w-[420px] aspect-square ${playing ? 'is-playing' : ''}`}>
        {/* Kart */}
        <div className="absolute left-[4%] bottom-[6%] w-[58%] -rotate-6">
          {TYPES.map((x, i) => (
            <Image
              key={x.key}
              src={x.image}
              alt={i === step ? `${x.label} NFC kartı` : ''}
              width={600}
              height={600}
              sizes="(max-width: 767px) 55vw, 240px"
              className={`rounded-3xl shadow-2xl transition-opacity duration-500 ${i === 0 ? 'relative' : 'absolute inset-0'} ${i === step ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          {/* NFC halkası (kartın ortasında) */}
          <span aria-hidden className="tap-ring pointer-events-none absolute left-1/2 top-1/2 -ml-[35%] -mt-[35%] w-[70%] aspect-square rounded-full border-2 border-white/80" />
        </div>

        {/* Telefon */}
        <div
          className="tap-phone absolute right-[4%] top-[2%] w-[42%] aspect-[9/19] rounded-[1.6rem] border-[5px] border-neutral-800 bg-black shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] overflow-hidden"
          onAnimationIteration={() => setStep((s) => (s + 1) % TYPES.length)}
        >
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[34%] h-3 rounded-full bg-neutral-900 z-10" />
          <div className="tap-screen absolute inset-0 pt-5">
            <Screen type={t.key} />
          </div>
        </div>
      </div>
    </div>
  );
}
