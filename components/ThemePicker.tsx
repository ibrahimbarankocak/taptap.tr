'use client';
import { Check } from 'lucide-react';

// IBAN kartı rengi seçimi: kart siyah mı beyaz mı — müşterinin göreceği ekran buna göre açık/koyu olur.
// Her seçenek ekranın küçük bir önizlemesi.
export default function ThemePicker({ value, onChange }: { value: 'black' | 'white'; onChange: (v: 'black' | 'white') => void }) {
  const options = [
    { key: 'black' as const, label: 'Siyah Kart', desc: 'Koyu ekran', bg: 'bg-[#050505]', box: 'bg-[#0f0f0f] border-[#1f1f1f]', line: 'bg-neutral-700', text: 'bg-white' },
    { key: 'white' as const, label: 'Beyaz Kart', desc: 'Açık ekran', bg: 'bg-[#f7f6f2]', box: 'bg-white border-[#ebe8e1]', line: 'bg-neutral-300', text: 'bg-neutral-900' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
              active ? 'border-orange-500 bg-orange-500/5' : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
            }`}
            aria-pressed={active}
          >
            {/* Mini ekran önizlemesi */}
            <div className={`w-12 h-20 rounded-lg ${o.bg} border border-neutral-700 p-1.5 flex flex-col items-center justify-center gap-1 shrink-0`}>
              <div className={`w-6 h-1 rounded ${o.text}`} />
              <div className={`w-full h-3 rounded border ${o.box} flex items-center px-0.5`}><div className={`w-4 h-0.5 rounded ${o.line}`} /><div className="ml-auto w-1.5 h-1.5 rounded-sm bg-orange-500" /></div>
              <div className={`w-full h-3 rounded border ${o.box} flex items-center px-0.5`}><div className={`w-3 h-0.5 rounded ${o.line}`} /><div className="ml-auto w-1.5 h-1.5 rounded-sm bg-orange-500" /></div>
            </div>
            <div className="min-w-0">
              <p className={`font-bold text-sm ${active ? 'text-white' : 'text-neutral-400'}`}>{o.label}</p>
              <p className="text-[11px] text-neutral-500">{o.desc}</p>
            </div>
            {active && <Check size={16} className="absolute top-2 right-2 text-orange-500" />}
          </button>
        );
      })}
    </div>
  );
}
