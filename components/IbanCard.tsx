'use client';
import { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

export default function IbanCard({ customer }: { customer: any }) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Sayfa açılır açılmaz IBAN'ı otomatik kopyalama ve toast bildirim
  useEffect(() => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }).catch(() => {});
    }
  }, [customer.iban]);

  const handleCopy = () => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans flex flex-col overflow-hidden selection:bg-orange-500/30">

      {/* --- 1. ÜST/ORTA KISIM: İSİM VE IBAN KUTUSU --- */}
      {/* flex-1 vererek içeriği dikeyde ortalıyoruz, biraz daha aşağı inmiş oluyor */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 z-20 pb-10">
        
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">
          {customer.full_name}
        </h1>

        {/* IBAN Kutusu (Referans görseldeki gibi koyu gri ve şık) */}
        <div className="w-full max-w-[360px] bg-[#0f0f0f] border border-[#1f1f1f] rounded-[24px] p-5 flex items-center justify-between shadow-2xl">
          
          <div className="flex flex-col overflow-hidden pr-2">
            <span className="text-[10px] text-neutral-500 font-bold tracking-[0.15em] mb-2 uppercase">
              Banka Hesabı
            </span>
            {/* whitespace-nowrap ile 2 satıra inmesi kesinlikle engellendi */}
            <span className="font-mono text-[13px] sm:text-sm text-white tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">
              {customer.iban}
            </span>
          </div>

          {/* Kopyala Butonu (Referanstaki gibi altın/turuncu çizgili) */}
          <button
            onClick={handleCopy}
            className={`flex flex-col items-center justify-center gap-1.5 w-[72px] h-[64px] rounded-2xl border transition-all duration-300 shrink-0 ${
              copied 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                : 'bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/40 text-[#F59E0B]'
            }`}
          >
            {copied ? <Check size={20} strokeWidth={2.5} /> : <Copy size={20} strokeWidth={2.5} />}
            <span className="text-[9px] font-bold tracking-wider">
              {copied ? 'ALINDI' : 'KOPYALA'}
            </span>
          </button>

        </div>
      </div>

      {/* --- 2. ALT KISIM: KUSURSUZ MERKEZLİ HALKALAR VE LOGO --- */}
      {/* Tüm halkalar aynı merkeze (items-center justify-center) oturtuldu */}
      <div className="relative h-[35vh] w-full flex flex-col items-center justify-center z-10">
        
        {/* Orange Wave Ripples (referans görseldeki gibi) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] pointer-events-none">
          <svg viewBox="0 0 1000 1000" className="w-full h-full" fill="none">
            <defs>
              <radialGradient id="waveMask" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="55%" stopColor="white" stopOpacity="1" />
                <stop offset="78%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <filter id="waveBlur" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <filter id="waveBlurSm" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.6" />
              </filter>
              <linearGradient id="arcHot" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDBA74" />
                <stop offset="35%" stopColor="#F59E0B" />
                <stop offset="65%" stopColor="#92400E" />
                <stop offset="100%" stopColor="#FDBA74" />
              </linearGradient>
            </defs>

            <mask id="waveFadeMask">
              <rect x="0" y="0" width="1000" height="1000" fill="url(#waveMask)" />
            </mask>

            <g mask="url(#waveFadeMask)" transform="translate(500 500)">
              {/* Baz dalgalar - içten dışa kalınlaşan, çift çizgili ripple hissi */}
              <circle r="132" stroke="#431407" strokeWidth="3" opacity="0.95" />
              <circle r="141" stroke="#F59E0B" strokeWidth="1.4" opacity="0.5" filter="url(#waveBlurSm)" />

              <circle r="172" stroke="#7C2D12" strokeWidth="4" opacity="0.9" />
              <circle r="183" stroke="#F59E0B" strokeWidth="1.6" opacity="0.55" filter="url(#waveBlurSm)" />

              <circle r="216" stroke="#9A3412" strokeWidth="5" opacity="0.9" />
              <circle r="229" stroke="#FB923C" strokeWidth="1.8" opacity="0.6" filter="url(#waveBlurSm)" />

              <circle r="264" stroke="#9A3412" strokeWidth="6" opacity="0.95" />
              <circle r="279" stroke="#F59E0B" strokeWidth="2" opacity="0.65" filter="url(#waveBlurSm)" />

              <circle r="316" stroke="#B45309" strokeWidth="7" opacity="0.95" />
              <circle r="333" stroke="#FDBA74" strokeWidth="2.2" opacity="0.7" filter="url(#waveBlurSm)" />

              <circle r="372" stroke="#D97706" strokeWidth="8" opacity="0.9" />
              <circle r="391" stroke="#FDBA74" strokeWidth="2.4" opacity="0.7" filter="url(#waveBlurSm)" />

              <circle r="432" stroke="#F59E0B" strokeWidth="9" opacity="0.75" filter="url(#waveBlur)" />
              <circle r="453" stroke="#FDBA74" strokeWidth="2.5" opacity="0.6" />

              {/* Yanlardaki parlak ışık şeritleri (soldaki ve sağdaki dikey parlamalar) */}
              <g stroke="url(#arcHot)" strokeLinecap="round" filter="url(#waveBlurSm)">
                {/* Sol parlak yay */}
                <circle r="316" strokeWidth="7" opacity="0.95" strokeDasharray="120 1862" transform="rotate(155)" />
                <circle r="372" strokeWidth="9" opacity="0.95" strokeDasharray="150 2186" transform="rotate(150)" />
                <circle r="432" strokeWidth="10" opacity="0.9" strokeDasharray="170 2544" transform="rotate(148)" />
                {/* Sağ parlak yay */}
                <circle r="316" strokeWidth="7" opacity="0.95" strokeDasharray="120 1862" transform="rotate(-35)" />
                <circle r="372" strokeWidth="9" opacity="0.95" strokeDasharray="150 2186" transform="rotate(-30)" />
                <circle r="432" strokeWidth="10" opacity="0.9" strokeDasharray="170 2544" transform="rotate(-28)" />
                {/* Üst ince yansımalar */}
                <circle r="264" strokeWidth="4" opacity="0.8" strokeDasharray="90 1570" transform="rotate(100)" />
                <circle r="264" strokeWidth="4" opacity="0.8" strokeDasharray="90 1570" transform="rotate(-80)" />
              </g>
            </g>
          </svg>
        </div>

        {/* Alt sıcak zemin ışıması */}
        <div className="absolute left-1/2 bottom-[-80px] -translate-x-1/2 w-[500px] h-[260px] bg-[#F59E0B]/25 blur-[100px] rounded-full pointer-events-none"></div>
        {/* Merkez karartma (logonun okunması için) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-[#050505]/85 blur-[50px] rounded-full pointer-events-none"></div>

        {/* TapTap Siyah Kart Logosu (Tam halkaların merkezinde) */}
        <div className="relative z-20 flex flex-col items-center mt-[-40px]">
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl py-3.5 px-7 flex flex-col items-center shadow-[0_10px_40px_rgba(0,0,0,0.8)] mb-4">
            <span className="text-2xl font-black text-white tracking-tighter mb-1">TapTap.</span>
            <span className="text-[5px] text-neutral-500 tracking-[0.3em] font-bold">PREMIUM</span>
            <span className="text-[5px] text-neutral-500 tracking-[0.3em] font-bold">NFC ÇÖZÜMLERİ</span>
          </div>
          
          <span className="text-[9px] font-bold text-neutral-500 tracking-[0.2em] uppercase mb-1">Powered By</span>
          <span className="text-sm font-bold text-neutral-300 tracking-wide">TapTap</span>
        </div>

      </div>

      {/* --- 3. OTOMATİK KOPYALAMA BİLDİRİMİ (Toast) --- */}
      <div 
        className={`fixed top-10 left-1/2 -translate-x-1/2 bg-[#111] border border-[#222] text-white px-5 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 flex items-center gap-3 transition-all duration-500 ease-out ${
          showToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-emerald-500 rounded-full p-1">
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
        <span className="font-bold text-xs tracking-wide">IBAN Kopyalandı</span>
      </div>

    </div>
  );
}