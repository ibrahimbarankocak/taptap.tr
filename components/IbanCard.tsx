'use client';
import { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

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
    <div className="relative min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center py-12 px-4 overflow-hidden selection:bg-orange-500/30">
      
      {/* 1. ARKA PLAN: SADECE TURUNCU GLOW HALKALARI */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex justify-center items-center pointer-events-none z-0 opacity-70">
        <div className="absolute w-[150vw] sm:w-[900px] aspect-square rounded-full border border-[#F59E0B]/10 shadow-[0_0_100px_rgba(245,158,11,0.05)]"></div>
        <div className="absolute w-[110vw] sm:w-[700px] aspect-square rounded-full border border-[#F59E0B]/15 shadow-[0_0_100px_rgba(245,158,11,0.1)]"></div>
        <div className="absolute w-[70vw] sm:w-[500px] aspect-square rounded-full border border-[#F59E0B]/30 shadow-[0_0_80px_rgba(245,158,11,0.2),inset_0_0_80px_rgba(245,158,11,0.1)]"></div>
        <div className="absolute w-[40vw] sm:w-[320px] aspect-square rounded-full border-[3px] border-[#F59E0B]/50 shadow-[0_0_80px_rgba(245,158,11,0.4),inset_0_0_80px_rgba(245,158,11,0.2)] bg-[#F59E0B]/5"></div>
      </div>

      {/* 2. ÖN PLAN: PREMIUM KARTVİZİT TASARIMI */}
      <div className="relative z-10 w-full max-w-sm bg-neutral-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl flex flex-col items-center border border-neutral-800/80 mt-6 sm:mt-12">
        
        {/* Profil Fotoğrafı */}
        {customer.profile_image ? (
          <img 
            src={customer.profile_image} 
            alt={customer.full_name} 
            className="w-32 h-32 rounded-full object-cover border-4 border-neutral-800 mb-6 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
          />
        ) : (
          <div className="w-32 h-32 bg-neutral-950 rounded-full border-4 border-neutral-800 flex items-center justify-center text-5xl font-bold mb-6 shadow-inner text-[#F59E0B]">
            {customer.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Kimlik Bilgileri */}
        <h1 className="text-2xl font-bold text-center mb-1 text-white">{customer.full_name}</h1>
        {customer.job_title && <p className="text-[#F59E0B] text-center font-medium mb-1">{customer.job_title}</p>}
        {customer.company && <p className="text-neutral-400 text-sm text-center mb-6">{customer.company}</p>}
        {!customer.company && <div className="mb-6"></div>}

        {/* IBAN Modülü */}
        <div className="w-full flex flex-col items-center bg-neutral-950/60 p-6 rounded-2xl border border-neutral-800/80 mb-2 shadow-inner">
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Banka Hesabı</p>
          
          <button 
            onClick={handleCopy}
            className={`w-full h-14 rounded-xl flex items-center justify-center text-lg font-black tracking-widest transition-all duration-300 active:scale-95 shadow-lg mb-5 ${
              copied ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-[#F59E0B] text-black hover:bg-[#d97706]'
            }`}
          >
            {copied ? (
              <span className="flex items-center gap-2"><Check size={22} /> KOPYALANDI</span>
            ) : (
              <span className="flex items-center gap-2"><Copy size={20} /> IBAN</span>
            )}
          </button>
          
          <p className="font-mono text-sm tracking-widest text-neutral-300 break-all text-center px-2">
            {customer.iban}
          </p>
        </div>
        
      </div>

      {/* Alt Logo (TapTap) */}
      <div className="relative z-10 mt-auto pt-10">
        <a href="https://taptap.tr" target="_blank" className="flex flex-col items-center gap-1.5 group opacity-50 hover:opacity-100 transition-opacity">
          <img src="/logo.jpeg" alt="TapTap" className="w-16 h-auto object-contain rounded-xl border border-neutral-800 shadow-lg bg-neutral-950 p-1" />
          <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase mt-1">TapTap</span>
        </a>
      </div>

    </div>
  );
}