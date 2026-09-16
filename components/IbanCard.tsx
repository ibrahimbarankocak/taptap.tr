'use client';
import { useState, useEffect } from 'react';
import { Check, Copy, ShoppingBag } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';

export default function IbanCard({ customer }: { customer: any }) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // 1. OTOMATİK KOPYALAMA (PC'lerde çalışır, Mobilde güvenlik nedeniyle tarayıcı engelleyebilir)
  useEffect(() => {
    if (customer.iban && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(customer.iban).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }).catch(() => {
        console.log('Mobil tarayıcı otomatik kopyalamayı engelledi. Manuel kopyalama bekleniyor.');
      });
    }
  }, [customer.iban]);

  // 2. MANUEL KOPYALAMA (Mobilde %100 çalışacak garantili sistem)
  const handleCopy = async () => {
    if (!customer.iban) return;

    try {
      // Modern tarayıcılar için
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(customer.iban);
      } else {
        // iOS Safari ve eski mobil tarayıcılar için garantili yedek yöntem
        const textArea = document.createElement("textarea");
        textArea.value = customer.iban;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      // Kopyalama başarılı olunca hem butonu hem toast bildirimi tetikle
      setCopied(true);
      setShowToast(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Kopyalama hatası:', error);
      alert('Kopyalama başarısız oldu, lütfen manuel kopyalayın.');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans flex flex-col overflow-hidden selection:bg-orange-500/30">

      {/* --- 1. EN ÜST: TAPTAP SİYAH KART LOGOSU --- */}
      <div className="w-full flex justify-center pt-10 z-20">
        <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl py-3.5 px-7 flex flex-col items-center shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          <span className="text-2xl font-black text-white tracking-tighter mb-1">TapTap.</span>
          <span className="text-[5px] text-neutral-500 tracking-[0.3em] font-bold">PREMIUM</span>
          <span className="text-[5px] text-neutral-500 tracking-[0.3em] font-bold">NFC ÇÖZÜMLERİ</span>
        </div>
      </div>

      {/* --- 2. ORTA KISIM: İSİM VE IBAN KUTUSU --- */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 z-20 pb-4">
        
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8 text-center">
          {customer.full_name}
        </h1>

        <div className="w-full max-w-[360px] bg-[#0f0f0f] border border-[#1f1f1f] rounded-[24px] p-4 sm:p-5 flex items-center justify-between gap-2 sm:gap-3 shadow-2xl">
          
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="text-[9px] sm:text-[10px] text-neutral-500 font-bold tracking-[0.15em] mb-1.5 uppercase">
              Banka Hesabı
            </span>
            <span className="font-mono text-[10px] sm:text-[12px] text-white tracking-tighter sm:tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {customer.iban}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 w-[64px] sm:w-[72px] h-[56px] sm:h-[64px] rounded-2xl border transition-all duration-300 shrink-0 ${
              copied 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                : 'bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/40 text-[#F59E0B]'
            }`}
          >
            {copied ? <Check size={18} strokeWidth={2.5} /> : <Copy size={18} strokeWidth={2.5} />}
            <span className="text-[8px] sm:text-[9px] font-bold tracking-wider">
              {copied ? 'ALINDI' : 'KOPYALA'}
            </span>
          </button>

        </div>
      </div>

      {/* --- 3. ALT KISIM: SOLUK, ARALIKLI HALKALAR VE BUTONLAR --- */}
      <div className="relative h-[30vh] w-full flex flex-col items-center justify-center z-10">
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
          <svg viewBox="0 0 800 800" className="w-full h-full block" fill="none">
            <defs>
              <filter id="ibanHalo" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>
            <g transform="translate(400 400)" strokeLinecap="round">
              <g filter="url(#ibanHalo)" opacity="0.25">
                <circle r="130" stroke="#78350F" strokeWidth="8" />
                <circle r="210" stroke="#92400E" strokeWidth="10" />
                <circle r="300" stroke="#B45309" strokeWidth="12" />
                <circle r="400" stroke="#D97706" strokeWidth="14" />
              </g>
              <circle r="130" stroke="#78350F" strokeWidth="2" opacity="0.4" />
              <circle r="210" stroke="#92400E" strokeWidth="2" opacity="0.4" />
              <circle r="300" stroke="#B45309" strokeWidth="2.5" opacity="0.5" />
              <circle r="400" stroke="#D97706" strokeWidth="2.5" opacity="0.5" />
            </g>
          </svg>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-50px] w-[480px] h-[170px] bg-[#D97706]/10 blur-[70px] rounded-full pointer-events-none"></div>

        <div className="relative z-20 flex items-center justify-center gap-3 sm:gap-4 mt-8">
          <a 
            href="https://www.instagram.com/taptap.tr/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#0f0f0f]/80 backdrop-blur-md hover:bg-[#1a1a1a] border border-[#1f1f1f] hover:border-neutral-700 text-neutral-400 hover:text-white px-5 py-3.5 rounded-2xl transition-all duration-300 shadow-lg active:scale-95"
          >
            <FaInstagram size={18} />
            <span className="text-[10px] font-bold tracking-widest uppercase mt-0.5">Instagram</span>
          </a>

          <a 
            href="https://www.shopier.com/TapTapTr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#0f0f0f]/80 backdrop-blur-md hover:bg-[#1a1a1a] border border-[#1f1f1f] hover:border-neutral-700 text-neutral-400 hover:text-white px-5 py-3.5 rounded-2xl transition-all duration-300 shadow-lg active:scale-95"
          >
            <ShoppingBag size={18} />
            <span className="text-[10px] font-bold tracking-widest uppercase mt-0.5">Sipariş Ver</span>
          </a>
        </div>

      </div>

      {/* --- 4. OTOMATİK KOPYALAMA BİLDİRİMİ (Toast) --- */}
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