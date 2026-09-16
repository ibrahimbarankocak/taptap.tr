import { FaInstagram } from 'react-icons/fa';
import { ShoppingBag } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-between p-4 selection:bg-neutral-800 font-sans">
      
      {/* Üst boşluk (Logoyu tam merkeze itmek için) */}
      <div className="flex-1 w-full"></div>

      {/* MERKEZ: LOGO VE METİN */}
      <div className="flex flex-col items-center justify-center group z-10">
        
        {/* Logo ve Arkaplan Işığı */}
        <div className="relative">
          <div className="absolute -inset-6 bg-white/5 blur-3xl rounded-full z-0 pointer-events-none transition-all duration-1000 group-hover:bg-white/10"></div>
          
          <img 
            src="/logo.jpeg" 
            alt="TapTap NFC" 
            className="relative z-10 w-48 sm:w-56 h-auto rounded-[2rem] border border-neutral-800/80 shadow-2xl bg-[#0a0a0a] p-2 transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        
        <div className="flex flex-col items-center mt-10">
          <h1 className="text-2xl font-black text-white tracking-widest drop-shadow-lg mb-2">
            TapTap.
          </h1>
          <p className="text-[10px] sm:text-xs text-neutral-500 font-bold uppercase tracking-[0.4em] text-center">
            Premium NFC Çözümleri
          </p>
        </div>

      </div>

      {/* ALT KISIM: SOSYAL MEDYA VE MAĞAZA BUTONLARI */}
      <div className="flex-1 w-full flex flex-col justify-end items-center pb-6 sm:pb-10 z-10">
        <div className="flex flex-row items-center gap-3 sm:gap-4">
          
          {/* Instagram Butonu */}
          <a 
            href="https://www.instagram.com/taptap.tr/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#0f0f0f] hover:bg-[#1a1a1a] border border-[#1f1f1f] hover:border-neutral-700 text-neutral-400 hover:text-white px-5 py-3.5 rounded-2xl transition-all duration-300 shadow-lg active:scale-95"
          >
            <FaInstagram size={18} />
            <span className="text-[10px] font-bold tracking-widest uppercase mt-0.5">Instagram</span>
          </a>

          {/* Shopier Butonu */}
          <a 
            href="https://www.shopier.com/TapTapTr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#0f0f0f] hover:bg-[#1a1a1a] border border-[#1f1f1f] hover:border-neutral-700 text-neutral-400 hover:text-white px-5 py-3.5 rounded-2xl transition-all duration-300 shadow-lg active:scale-95"
          >
            <ShoppingBag size={18} />
            <span className="text-[10px] font-bold tracking-widest uppercase mt-0.5">Sipariş Ver</span>
          </a>

        </div>
      </div>

    </main>
  );
}