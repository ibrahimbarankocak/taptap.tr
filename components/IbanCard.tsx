'use client';
import { useState, useEffect } from 'react';
import { bankFromIban } from '@/lib/parseOrderNote';
import { Check, Copy, ShoppingBag } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';

type IbanCustomer = { full_name: string; account_holder: string; iban: string };

// Kart rengi: siyah kart -> koyu ekran (mevcut tasarım, birebir aynı), beyaz kart -> açık ekran
const THEMES = {
  black: {
    page: 'bg-[#050505] text-white selection:bg-orange-500/30',
    logoBox: 'bg-[#050505] border-[#1a1a1a] shadow-[0_10px_40px_rgba(0,0,0,0.8)]',
    logoText: 'text-white',
    logoSub: 'text-neutral-500',
    box: 'bg-[#0f0f0f] border-[#1f1f1f] hover:border-[#D97706]/30 shadow-2xl',
    label: 'text-neutral-500',
    value: 'text-white',
    copy: 'bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/40 text-[#F59E0B]',
    ringOpacity: [0.25, 0.4, 0.5],
    glow: 'bg-[#D97706]/10',
    channelsLabel: 'text-neutral-500',
    channel: 'bg-[#0f0f0f]/90 hover:bg-[#1a1a1a] border-[#1f1f1f] hover:border-neutral-700 text-neutral-300 hover:text-white',
    channelSub: 'text-neutral-500',
    toast: 'bg-[#111] border-[#222] text-white shadow-[0_10px_40px_rgba(0,0,0,0.8)]',
  },
  white: {
    page: 'bg-[#f7f6f2] text-neutral-900 selection:bg-orange-500/20',
    logoBox: 'bg-white border-[#e7e4dc] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]',
    logoText: 'text-neutral-900',
    logoSub: 'text-neutral-400',
    box: 'bg-white border-[#ebe8e1] hover:border-[#D97706]/40 shadow-[0_14px_40px_-18px_rgba(0,0,0,0.25)]',
    label: 'text-neutral-400',
    value: 'text-neutral-900',
    copy: 'bg-[#F59E0B]/10 border-[#D97706]/30 hover:bg-[#F59E0B]/20 hover:border-[#D97706]/50 text-[#B45309]',
    ringOpacity: [0.12, 0.22, 0.3],
    glow: 'bg-[#F59E0B]/15',
    channelsLabel: 'text-neutral-400',
    channel: 'bg-white/90 hover:bg-white border-[#e7e4dc] hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)]',
    channelSub: 'text-neutral-400',
    toast: 'bg-white border-[#e7e4dc] text-neutral-900 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]',
  },
} as const;

export default function IbanCard({
  customer,
  theme = 'black',
  extraAccounts = [],
}: {
  customer: IbanCustomer;
  theme?: 'black' | 'white';
  extraAccounts?: { iban: string; holder: string }[]; // çoklu IBAN kartı: ilk IBAN dışındakiler
}) {
  const t = THEMES[theme];
  // Tek IBAN'da tasarım birebir aynı kalır; birden fazlaysa her hesap kendi kutusunda
  const multi = extraAccounts.length > 0;
  const accounts = [
    { iban: customer.iban, holder: customer.account_holder || customer.full_name },
    ...extraAccounts.map((a) => ({ iban: a.iban, holder: a.holder || customer.account_holder || customer.full_name })),
  ];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedHolder, setCopiedHolder] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('IBAN Kopyalandı');

  // Sayfa açılır açılmaz IBAN'ı otomatik kopyalama denemesi
  useEffect(() => {
    if (customer.iban && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(customer.iban).then(() => {
        setToastMessage('IBAN Kopyalandı');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }).catch(() => {});
    }
  }, [customer.iban]);

  const copyText = async (text: string, key: string, message: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopiedKey(key);
      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyIban = async () => {
    if (!customer.iban) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(customer.iban);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = customer.iban;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedIban(true);
      setToastMessage('IBAN Kopyalandı');
      setShowToast(true);
      setTimeout(() => setCopiedIban(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyHolder = async () => {
    const holderName = customer.account_holder || customer.full_name;
    if (!holderName) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(holderName);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = holderName;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedHolder(true);
      setToastMessage('Hesap Sahibi Kopyalandı');
      setShowToast(true);
      setTimeout(() => setCopiedHolder(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={`relative min-h-screen font-sans flex flex-col overflow-hidden ${t.page}`}>

      {/* --- 1. EN ÜST: TAPTAP SİYAH KART LOGOSU --- */}
      <div className="w-full flex justify-center pt-8 z-20 animate-fade-up">
        <div className={`shine border rounded-xl py-3 px-6 flex flex-col items-center ${t.logoBox}`}>
          <span className={`text-xl font-black tracking-tighter mb-0.5 ${t.logoText}`}>TapTap.</span>
          <span className={`text-[5px] tracking-[0.3em] font-bold ${t.logoSub}`}>PREMIUM</span>
          <span className={`text-[5px] tracking-[0.3em] font-bold ${t.logoSub}`}>NFC ÇÖZÜMLERİ</span>
        </div>
      </div>

      {/* --- 2. ORTA KISIM: İŞLETME ADI VE BİLGİ KUTULARI --- */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 z-20 py-2 gap-3">
        
        {/* İşletme Adı / Başlık */}
        <h1 className="animate-fade-up stagger text-2xl sm:text-3xl font-bold tracking-tight text-center mb-1" style={{ '--i': 2 } as React.CSSProperties}>
          {customer.full_name}
        </h1>

        {!multi ? (
        <>
        {/* IBAN KUTUSU */}
        <div className={`animate-fade-up stagger w-full max-w-[360px] border transition-colors duration-500 rounded-[22px] p-4 flex items-center justify-between gap-2 ${t.box}`} style={{ '--i': 3 } as React.CSSProperties}>
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className={`text-[9px] font-bold tracking-[0.15em] mb-1 uppercase ${t.label}`}>
              Banka Hesabı (IBAN)
            </span>
            <span className={`font-mono text-[10px] sm:text-[12px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${t.value}`}>
              {customer.iban}
            </span>
          </div>

          <button
            onClick={handleCopyIban}
            className={`flex flex-col items-center justify-center gap-1 w-[64px] h-[54px] rounded-xl border transition-all duration-300 shrink-0 cursor-pointer press ${
              copiedIban 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                : t.copy
            }`}
          >
            {copiedIban ? <Check size={16} strokeWidth={2.5} className="animate-pop" /> : <Copy size={16} strokeWidth={2.5} />}
            <span className="text-[8px] font-bold tracking-wider">
              {copiedIban ? 'KOPYALANDI' : 'KOPYALA'}
            </span>
          </button>
        </div>

        {/* HESAP SAHİBİ KUTUSU */}
        <div className={`animate-fade-up stagger w-full max-w-[360px] border transition-colors duration-500 rounded-[22px] p-4 flex items-center justify-between gap-2 ${t.box}`} style={{ '--i': 4 } as React.CSSProperties}>
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className={`text-[9px] font-bold tracking-[0.15em] mb-1 uppercase ${t.label}`}>
              Hesap Sahibi Ad Soyad
            </span>
            <span className={`text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden text-ellipsis ${t.value}`}>
              {customer.account_holder || customer.full_name}
            </span>
          </div>

          <button
            onClick={handleCopyHolder}
            className={`flex flex-col items-center justify-center gap-1 w-[64px] h-[54px] rounded-xl border transition-all duration-300 shrink-0 cursor-pointer press ${
              copiedHolder 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                : t.copy
            }`}
          >
            {copiedHolder ? <Check size={16} strokeWidth={2.5} className="animate-pop" /> : <Copy size={16} strokeWidth={2.5} />}
            <span className="text-[8px] font-bold tracking-wider">
              {copiedHolder ? 'KOPYALANDI' : 'KOPYALA'}
            </span>
          </button>
        </div>
        </>
        ) : (
          // ÇOKLU IBAN: her hesap tek kutuda — banka, IBAN ve hesap sahibi, ayrı kopyala butonları
          accounts.map((a, i) => {
            const bank = bankFromIban(a.iban);
            return (
              <div
                key={i}
                className={`animate-fade-up stagger w-full max-w-[360px] border transition-colors duration-500 rounded-[22px] p-4 space-y-3 ${t.box}`}
                style={{ '--i': 3 + i } as React.CSSProperties}
              >
                <div className={`flex items-center justify-between text-[9px] font-bold tracking-[0.15em] uppercase ${t.label}`}>
                  <span>{bank || 'Banka Hesabı'}</span>
                  <span>{i + 1}/{accounts.length}</span>
                </div>
                {([
                  { label: 'IBAN', value: a.iban, key: `iban-${i}`, msg: 'IBAN Kopyalandı', mono: true },
                  { label: 'Hesap Sahibi', value: a.holder, key: `holder-${i}`, msg: 'Hesap Sahibi Kopyalandı', mono: false },
                ] as const).map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                      <span className={`text-[8px] font-bold tracking-[0.15em] mb-0.5 uppercase ${t.label}`}>{row.label}</span>
                      <span className={`${row.mono ? 'font-mono text-[10px] sm:text-[12px] tracking-tight' : 'text-xs sm:text-sm font-semibold tracking-wide'} whitespace-nowrap overflow-hidden text-ellipsis ${t.value}`}>
                        {row.value}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(row.value, row.key, row.msg)}
                      className={`flex items-center justify-center gap-1 w-[64px] h-[40px] rounded-xl border transition-all duration-300 shrink-0 cursor-pointer press ${
                        copiedKey === row.key ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : t.copy
                      }`}
                      aria-label={`${row.label} kopyala`}
                    >
                      {copiedKey === row.key ? <Check size={14} strokeWidth={2.5} className="animate-pop" /> : <Copy size={14} strokeWidth={2.5} />}
                      <span className="text-[8px] font-bold tracking-wider">{copiedKey === row.key ? 'TAMAM' : 'KOPYALA'}</span>
                    </button>
                  </div>
                ))}
              </div>
            );
          })
        )}

      </div>

      {/* --- 3. ALT KISIM: SOLUK HALKALAR VE RESMİ TAPTAP KANALLARI (3 birim yukarıda) --- */}
      <div className="relative h-[25vh] w-full flex flex-col items-center justify-start z-10 pt-2">
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none animate-fade-in">
          <svg viewBox="0 0 800 800" className="w-full h-full block" fill="none">
            <defs>
              <filter id="ibanHalo" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>
            <g transform="translate(400 400)" strokeLinecap="round">
              <g filter="url(#ibanHalo)" opacity={t.ringOpacity[0]}>
                <circle r="130" stroke="#78350F" strokeWidth="8" />
                <circle r="210" stroke="#92400E" strokeWidth="10" />
                <circle r="300" stroke="#B45309" strokeWidth="12" />
                <circle r="400" stroke="#D97706" strokeWidth="14" />
              </g>
              <circle r="130" stroke="#78350F" strokeWidth="2" opacity={t.ringOpacity[1]} />
              <circle r="210" stroke="#92400E" strokeWidth="2" opacity={t.ringOpacity[1]} />
              <circle r="300" stroke="#B45309" strokeWidth="2.5" opacity={t.ringOpacity[2]} />
              <circle r="400" stroke="#D97706" strokeWidth="2.5" opacity={t.ringOpacity[2]} />
            </g>
          </svg>
        </div>

        <div className={`absolute left-1/2 -translate-x-1/2 bottom-[-20px] w-[480px] h-[140px] blur-[70px] rounded-full pointer-events-none ${t.glow}`}></div>

        {/* Resmi Kanallar ve Butonlar (Satın Al yazıldı ve yukarı çekildi) */}
        <div className="relative z-20 flex flex-col items-center gap-2 animate-fade-up stagger" style={{ '--i': 6 } as React.CSSProperties}>
          
          <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${t.channelsLabel}`}>
            TapTap Resmi Kanalları
          </span>

          <div className="flex items-center gap-3">
            <a 
              href="https://www.instagram.com/taptap.tr/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 backdrop-blur-md border px-4.5 py-3 rounded-2xl transition-all duration-300 shadow-lg active:scale-95 ${t.channel}`}
            >
              <FaInstagram size={16} className="text-orange-500" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold tracking-wider uppercase leading-tight">Instagram</span>
                <span className={`text-[9px] font-mono ${t.channelSub}`}>@taptap.tr</span>
              </div>
            </a>

            <a 
              href="https://www.shopier.com/TapTapTr" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 backdrop-blur-md border px-4.5 py-3 rounded-2xl transition-all duration-300 shadow-lg active:scale-95 ${t.channel}`}
            >
              <ShoppingBag size={16} className="text-orange-500" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold tracking-wider uppercase leading-tight">Satın Al</span>
                <span className={`text-[9px] font-mono ${t.channelSub}`}>TapTapTr</span>
              </div>
            </a>
          </div>

        </div>

      </div>

      {/* --- 4. BİLDİRİM TOAST --- */}
      <div 
        className={`fixed top-10 left-1/2 -translate-x-1/2 border px-5 py-3 rounded-full z-50 flex items-center gap-3 transition-all duration-500 ease-out ${t.toast} ${
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