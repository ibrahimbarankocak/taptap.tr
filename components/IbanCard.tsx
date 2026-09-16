'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Check, Wifi } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';

export default function IbanCard({ customer }: { customer: any }) {
  const [copied, setCopied] = useState(false);

  // Sayfa açılır açılmaz IBAN'ı otomatik kopyalama
  useEffect(() => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban).catch(() => {});
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
    <div className="h-screen w-full bg-black text-white font-sans flex flex-col relative overflow-hidden selection:bg-orange-500/30">

      {/* --- 1. ÜST KISIM (INSTAGRAM) --- */}
      <div className="w-full flex justify-center pt-8 z-30">
        <a 
          href="https://instagram.com/taptap.tr" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white text-black font-extrabold text-[11px] px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-neutral-200 transition-colors shadow-lg"
        >
          <FaInstagram size={16} /> taptap.tr
        </a>
      </div>

      {/* --- 2. ORTA KISIM (BANKA BİLGİLERİ VE BUTON) --- */}
      <div className="w-full flex flex-col items-center z-30 mt-16 sm:mt-24 px-4">
        
        {/* İkon ve Başlık */}
        <div className="flex items-center gap-3 mb-6">
          <CreditCard size={36} className="text-black" fill="#F59E0B" />
          <h1 className="text-3xl font-bold tracking-tight">Banka Hesabımız</h1>
        </div>

        {/* IBAN Kopyalama Butonu */}
        <button 
          onClick={handleCopy}
          className={`w-56 sm:w-64 h-14 rounded-[14px] flex items-center justify-center text-lg font-black tracking-widest transition-all duration-300 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.25)] ${
            copied ? 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-[#F59E0B] text-black hover:bg-[#d97706]'
          }`}
        >
          {copied ? (
            <span className="flex items-center gap-2"><Check size={22} /> KOPYALANDI</span>
          ) : (
            'IBAN'
          )}
        </button>
        
        {/* IBAN Numaranın Kendisi (Görünür halde) */}
        <p className="mt-4 font-mono text-sm tracking-widest text-[#F59E0B] opacity-80 break-all text-center max-w-[280px]">
          {customer.iban}
        </p>

        <p className="mt-2 text-neutral-400 text-xs font-bold uppercase tracking-[0.2em] text-center">
          {customer.full_name}
        </p>
      </div>

      {/* --- 3. ALT KISIM (GLOW HALKALAR VE NFC) --- */}
      <div className="flex-1 w-full relative flex flex-col items-center justify-end pb-8 z-10">

        {/* Kusursuz Neon Halka Katmanları (Birebir Görseldeki Gibi 3 Boyutlu) */}
        <div className="absolute bottom-[-40vw] sm:bottom-[-300px] left-1/2 -translate-x-1/2 w-[180vw] sm:w-[900px] aspect-square rounded-full border border-[#F59E0B]/5 shadow-[0_0_100px_rgba(245,158,11,0.05)] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-30vw] sm:bottom-[-200px] left-1/2 -translate-x-1/2 w-[140vw] sm:w-[700px] aspect-square rounded-full border border-[#F59E0B]/10 shadow-[0_0_100px_rgba(245,158,11,0.1)] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-15vw] sm:bottom-[-100px] left-1/2 -translate-x-1/2 w-[100vw] sm:w-[500px] aspect-square rounded-full border-2 border-[#F59E0B]/20 shadow-[0_0_80px_rgba(245,158,11,0.2),inset_0_0_80px_rgba(245,158,11,0.1)] pointer-events-none z-0"></div>
        
        {/* En içteki parlak halka */}
        <div className="absolute bottom-[-5vw] sm:bottom-[-50px] left-1/2 -translate-x-1/2 w-[65vw] sm:w-[320px] aspect-square rounded-full border-[3px] border-[#F59E0B]/50 shadow-[0_0_80px_rgba(245,158,11,0.4),inset_0_0_80px_rgba(245,158,11,0.2)] pointer-events-none z-0 flex items-center justify-center">
          <div className="w-full h-full rounded-full shadow-[0_0_120px_rgba(245,158,11,0.5)] bg-gradient-to-t from-[#F59E0B]/20 to-transparent"></div>
        </div>

        {/* NFC İçeriği */}
        <div className="relative z-20 flex flex-col items-center mb-8">
          
          <div className="flex flex-col items-center mb-5">
            <span className="text-white font-black text-sm sm:text-base tracking-[0.25em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">TELEFONUNUZU</span>
            <span className="text-white font-black text-sm sm:text-base tracking-[0.25em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1">YAKINLAŞTIRIN</span>
          </div>

          <div className="flex items-center gap-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-3xl font-black tracking-widest text-white">NFC</span>
            <div className="w-0.5 h-8 bg-white/60 rounded-full"></div>
            <Wifi size={40} className="text-white rotate-90" strokeWidth={2.5} />
          </div>

        </div>

        {/* TapTap Logo */}
        <div className="relative z-20 mt-2">
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">TapTap.</span>
        </div>

      </div>

    </div>
  );
}