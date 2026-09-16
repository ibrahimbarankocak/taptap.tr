'use client';
import { useState, useEffect } from 'react';
import { Check, Copy, ShoppingBag, User } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';

export default function IbanCard({ customer }: { customer: any }) {
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedHolder, setCopiedHolder] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('IBAN Kopyalandı');

  // Sayfa açılır açılmaz IBAN'ı otomatik kopyalama
  useEffect(() => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban).then(() => {
        setToastMessage('IBAN Kopyalandı');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }).catch(() => {});
    }
  }, [customer.iban]);

  const handleCopyIban = () => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban);
      setCopiedIban(true);
      setToastMessage('IBAN Kopyalandı');
      setShowToast(true);
      setTimeout(() => setCopiedIban(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleCopyHolder = () => {
    const holderName = customer.account_holder || customer.full_name;
    if (holderName) {
      navigator.clipboard.writeText(holderName);
      setCopiedHolder(true);
      setToastMessage('Hesap Sahibi Kopyalandı');
      setShowToast(true);
      setTimeout(() => setCopiedHolder(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
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

      {/* --- 2. ORTA KISIM: İŞLETME ADI VE BİLGİ KUTULARI --- */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 z-20 pb-4 gap-4">
        
        {/* İşletme Adı / Başlık */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-2">
          {customer.full_name}
        </h1>

        {/* IBAN KUTUSU */}
        <div className="w-full max-w-[360px] bg-[#0f0f0f] border border-[#1f1f1f] rounded-[24px] p-4 sm:p-5 flex items-center justify-between gap-2 sm:gap-3 shadow-2xl">
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="text-[9px] sm:text-[10px] text-neutral-500 font-bold tracking-[0.15em] mb-1.5 uppercase">
              Banka Hesabı (IBAN)
            </span>
            <span className="font-mono text-[10px] sm:text-[12px] text-white tracking-tighter sm:tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {customer.iban}
            </span>
          </div>

          <button
            onClick={handleCopyIban}
            className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 w-[64px] sm:w-[72px] h-[56px] sm:h-[64px] rounded-2xl border transition-all duration-300 shrink-0 cursor-pointer ${
              copiedIban 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                : 'bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/40 text-[#F59E0B]'
            }`}
          >
            {copiedIban ? <Check size={18} strokeWidth={2.5} /> : <Copy size={18} strokeWidth={2.5} />}
            <span className="text-[8px] sm:text-[9px] font-bold tracking-wider">
              {copiedIban ? 'ALINDI' : 'KOPYALA'}
            </span>
          </button>
        </div>

        {/* HESAP SAHİBİ KUTUSU */}
        <div className="w-full max-w-[360px] bg-[#0f0f0f] border border-[#1f1f1f] rounded-[24px] p-4 sm:p-5 flex items-center justify-between gap-2 sm:gap-3 shadow-2xl">
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="text-[9px] sm:text-[10px] text-neutral-500 font-bold tracking-[0.15em] mb-1.5 uppercase">
              Hesap Sahibi Ad Soyad
            </span>
            <span className="text-sm sm:text-base font-semibold text-white tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
              {customer.account_holder || customer.full_name}
            </span>
          </div>

          <button
            onClick={handleCopyHolder}
            className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 w-[64px] sm:w-[72px] h-[56px] sm:h-[64px] rounded-2xl border transition-all duration-300 shrink-0 cursor-pointer ${
              copiedHolder 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                : 'bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/40 text-[#F59E0B]'
            }`}
          >
            {copiedHolder ? <Check size={18} strokeWidth={2.5} /> : <Copy size={18} strokeWidth={2.5} />}
            <span className="text-[8px] sm:text-[9px] font-bold tracking-wider">
              {copiedHolder ? 'ALINDI' : 'KOPYALA'}
            </span>
          </button>
        </div>

      </div>

      {/* --- 3. ALT KISIM: SOLUK HALKALAR VE BUTONLAR --- */}
      <div className="relative h-[25vh] w-full flex flex-col items-center justify-center z-10">
        
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

        <div className="relative z-20 flex items-center justify-center gap-3 sm:gap-4 mt-6">
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

      {/* --- 4. BİLDİRİM TOAST --- */}
      <div 
        className={`fixed top-10 left-1/2 -translate-x-1/2 bg-[#111] border border-[#222] text-white px-5 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 flex items-center gap-3 transition-all duration-500 ease-out ${
          showToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-emerald-500 rounded-full p-1">
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
        <span className="font-bold text-xs tracking-wide">{toastMessage}</span>
      </div>

    </div>
  );
}