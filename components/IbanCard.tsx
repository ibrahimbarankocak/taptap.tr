'use client';
import { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

export default function IbanCard({ customer }: { customer: any }) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Sayfa açılır açılmaz IBAN'ı otomatik kopyalama ve alttan bildirim (toast) çıkarma
  useEffect(() => {
    if (customer.iban) {
      navigator.clipboard.writeText(customer.iban).then(() => {
        setShowToast(true);
        // 3 saniye sonra uyarıyı gizle
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
    <div className="relative min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center overflow-hidden selection:bg-orange-500/30">

      {/* --- 1. SADECE ALT KISIMDAKİ TURUNCU GLOW HALKALAR (Görselle Birebir) --- */}
      <div className="absolute bottom-0 w-full h-[60vh] flex justify-center items-end pointer-events-none z-0 overflow-hidden">
        {/* Ring 1 (En dış) */}
        <div className="absolute bottom-[-300px] w-[900px] h-[900px] rounded-full border border-[#F59E0B]/10 shadow-[0_0_80px_rgba(245,158,11,0.05)]"></div>
        {/* Ring 2 */}
        <div className="absolute bottom-[-220px] w-[700px] h-[700px] rounded-full border-[2px] border-[#F59E0B]/20 shadow-[0_0_80px_rgba(245,158,11,0.1)]"></div>
        {/* Ring 3 */}
        <div className="absolute bottom-[-140px] w-[500px] h-[500px] rounded-full border-[3px] border-[#F59E0B]/40 shadow-[0_0_80px_rgba(245,158,11,0.2)]"></div>
        {/* Ring 4 */}
        <div className="absolute bottom-[-60px] w-[300px] h-[300px] rounded-full border-[4px] border-[#F59E0B]/70 shadow-[0_0_80px_rgba(245,158,11,0.4),inset_0_0_40px_rgba(245,158,11,0.2)]"></div>
        {/* Ring 5 (En iç, parlak) */}
        <div className="absolute bottom-[-10px] w-[150px] h-[150px] rounded-full bg-[#F59E0B]/10 border-[5px] border-[#F59E0B] shadow-[0_0_60px_rgba(245,158,11,0.6),inset_0_0_60px_rgba(245,158,11,0.4)]"></div>
        {/* Merkez Işık Patlaması */}
        <div className="absolute bottom-[-50px] w-[300px] h-[150px] bg-[#F59E0B] blur-[100px] opacity-40"></div>
      </div>

      {/* --- 2. İÇERİK (Profil Resmi Yok, Sade ve Premium IBAN Modülü) --- */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center px-6 mt-16 sm:mt-24">
        
        {/* Kimlik Bilgileri */}
        <h1 className="text-3xl font-extrabold text-center mb-1 text-white tracking-tight">{customer.full_name}</h1>
        {customer.job_title && <p className="text-[#F59E0B] text-center font-medium mb-1">{customer.job_title}</p>}
        {customer.company && <p className="text-neutral-400 text-sm text-center mb-10">{customer.company}</p>}
        {!customer.company && <div className="mb-10"></div>}

        {/* Yeni Sade IBAN Kutusu (Yazı solda, ufak buton sağda) */}
        <div className="w-full flex items-center justify-between bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 p-5 rounded-3xl shadow-2xl">
          <div className="flex flex-col pr-4">
            <span className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold mb-1.5">Banka Hesabı</span>
            <span className="font-mono text-[15px] sm:text-base text-white tracking-widest break-all">
              {customer.iban}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-300 shrink-0 ${
              copied ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/20'
            }`}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span className="text-[9px] font-bold uppercase tracking-wider">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>
      </div>

      {/* --- 3. POWERED BY TAPTAP (Görselle Birebir Kart Tasarımı) --- */}
      <div className="relative z-10 mt-auto pt-24 pb-12 flex flex-col items-center">
        {/* TapTap Siyah İç Kart Logosu */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl py-3 px-6 flex flex-col items-center shadow-2xl mb-4">
          <span className="text-2xl font-black text-white tracking-tighter mb-1">TapTap.</span>
          <span className="text-[5px] text-neutral-500 tracking-[0.3em] font-bold">PREMIUM</span>
          <span className="text-[5px] text-neutral-500 tracking-[0.3em] font-bold">NFC ÇÖZÜMLERİ</span>
        </div>
        <span className="text-[10px] font-bold text-neutral-500 tracking-[0.2em] uppercase mb-1">Powered By</span>
        <span className="text-[15px] font-bold text-neutral-300 tracking-wide">TapTap</span>
      </div>

      {/* --- 4. OTOMATİK KOPYALAMA BİLDİRİMİ (Premium Toast Uyarı) --- */}
      <div 
        className={`fixed bottom-12 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 flex items-center gap-3 transition-all duration-500 ease-out ${
          showToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-emerald-500 rounded-full p-1">
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
        <span className="font-extrabold text-sm tracking-wide">IBAN Kopyalandı</span>
      </div>

    </div>
  );
}