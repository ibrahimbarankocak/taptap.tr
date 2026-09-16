'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Check, Wifi } from 'lucide-react'; // ContactlessPayment yerine Wifi aldık
import { FaInstagram } from 'react-icons/fa'; 

export default function IbanCard({ customer }: { customer: any }) {
  const [copied, setCopied] = useState(false);

  // Sayfa açılır açılmaz IBAN'ı otomatik kopyalama
  useEffect(() => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban).catch(() => {
        console.log('Tarayıcı otomatik kopyalamayı engelledi.');
      });
    }
  }, [customer.iban]);

  const handleCopy = () => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col items-center justify-between py-12 font-sans selection:bg-orange-500/30">
      
      {/* Üst Kısım - Instagram Etiketi */}
      <div className="z-10 mt-4">
        <a 
          href="https://instagram.com/taptap.tr" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white text-black font-bold text-xs px-4 py-2 rounded-full flex items-center gap-2 hover:bg-neutral-200 transition-colors shadow-lg"
        >
          <FaInstagram size={14} /> taptap.tr
        </a>
      </div>

      {/* Orta Kısım - Banka Hesabı ve Buton */}
      <div className="z-10 flex flex-col items-center w-full max-w-sm px-6 -mt-10">
        <div className="flex items-center gap-3 mb-8">
          <CreditCard size={32} className="text-[#F59E0B]" />
          <h1 className="text-3xl font-extrabold tracking-tight">Banka Hesabımız</h1>
        </div>

        <button 
          onClick={handleCopy}
          className={`relative w-48 h-16 rounded-xl flex items-center justify-center text-xl font-black tracking-wide transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer ${
            copied ? 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-[#F59E0B] text-black'
          }`}
        >
          {copied ? (
            <span className="flex items-center gap-2"><Check size={24} /> KOPYALANDI</span>
          ) : (
            'IBAN'
          )}
        </button>
        
        {/* Müşteri Adı */}
        <p className="text-neutral-400 mt-6 text-sm font-medium uppercase tracking-widest text-center">
          {customer.full_name}
        </p>
      </div>

      {/* Alt Kısım - Neon Halkalar ve TapTap Logosu */}
      <div className="absolute bottom-0 w-full h-[500px] flex justify-center items-end pointer-events-none">
        
        {/* Glow Halkaları */}
        <div className="absolute bottom-[-150px] w-[600px] h-[600px] rounded-full border-[1px] border-[#F59E0B]/20 shadow-[inset_0_0_100px_rgba(245,158,11,0.1)]"></div>
        <div className="absolute bottom-[-50px] w-[400px] h-[400px] rounded-full border-[2px] border-[#F59E0B]/40 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col items-center">
          
          <div className="mt-16 text-center">
            <p className="text-white font-extrabold text-sm tracking-[0.2em] opacity-90">TELEFONUNUZU</p>
            <p className="text-white font-extrabold text-sm tracking-[0.2em] opacity-90">YAKINLAŞTIRIN</p>
          </div>

          <div className="flex items-center gap-4 mt-8 opacity-90">
            <span className="text-3xl font-black tracking-widest">NFC</span>
            <div className="w-px h-10 bg-white/50"></div>
            {/* Temassız ikonu yerine Wifi'yi 90 derece döndürdük */}
            <Wifi size={40} className="text-white rotate-90" />
          </div>

        </div>

        {/* En Alt Logo */}
        <div className="absolute bottom-8 z-20">
          <span className="text-xl font-bold tracking-tight text-white/90">TapTap.</span>
        </div>
        
      </div>
      
    </div>
  );
}