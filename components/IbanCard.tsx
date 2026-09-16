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
        
        {/* Sharp symmetric orange waves */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] pointer-events-none">
          <svg viewBox="0 0 620 620" className="w-full h-full block" fill="none">
            <g transform="translate(310 310)" strokeLinecap="round">
              <circle r="104" stroke="#78350F" strokeWidth="2" opacity="0.85" />
              <circle r="132" stroke="#92400E" strokeWidth="2.5" opacity="0.9" />
              <circle r="162" stroke="#B45309" strokeWidth="3" opacity="0.95" />
              <circle r="194" stroke="#D97706" strokeWidth="3.5" opacity="0.95" />
              <circle r="228" stroke="#F59E0B" strokeWidth="4" opacity="0.95" />
              <circle r="264" stroke="#F59E0B" strokeWidth="4.5" opacity="0.9" />
              <circle r="300" stroke="#FBBF24" strokeWidth="5" opacity="0.85" />
            </g>
          </svg>
        </div>

        {/* Symmetric side light streaks */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[calc(50%-215px)] w-[5px] h-[340px] rounded-full bg-gradient-to-b from-transparent via-[#FDBA74] to-transparent opacity-90 rotate-[16deg] pointer-events-none"></div>
        <div className="absolute top-1/2 -translate-y-1/2 right-[calc(50%-215px)] w-[5px] h-[340px] rounded-full bg-gradient-to-b from-transparent via-[#FDBA74] to-transparent opacity-90 rotate-[-16deg] pointer-events-none"></div>
        <div className="absolute top-1/2 -translate-y-1/2 left-[calc(50%-175px)] w-[3px] h-[260px] rounded-full bg-gradient-to-b from-transparent via-[#F59E0B] to-transparent opacity-70 rotate-[16deg] pointer-events-none"></div>
        <div className="absolute top-1/2 -translate-y-1/2 right-[calc(50%-175px)] w-[3px] h-[260px] rounded-full bg-gradient-to-b from-transparent via-[#F59E0B] to-transparent opacity-70 rotate-[-16deg] pointer-events-none"></div>

        {/* Symmetric warm floor glow */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-40px] w-[420px] h-[120px] bg-[#F59E0B]/20 blur-[60px] rounded-full pointer-events-none"></div>

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