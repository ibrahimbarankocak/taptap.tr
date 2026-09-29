'use client';
import { Plus, X } from 'lucide-react';
import { isValidIban, formatIban, bankFromIban } from '@/lib/parseOrderNote';

export type ExtraIban = { iban: string; holder: string };

const INPUT = 'w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors';

// IBAN kartına ek IBAN'lar. Tek IBAN varken sadece "+ Başka IBAN ekle" butonu görünür (form değişmez);
// ek IBAN eklenince her biri için IBAN + hesap sahibi alanları çıkar.
export default function ExtraIbans({ value, onChange }: { value: ExtraIban[]; onChange: (v: ExtraIban[]) => void }) {
  const update = (i: number, patch: Partial<ExtraIban>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-3">
      {value.map((row, i) => {
        const clean = row.iban.replace(/\s/g, '');
        const bank = clean.length >= 9 ? bankFromIban(clean) : undefined;
        const invalid = clean.length >= 26 && !isValidIban(clean);
        return (
          <div key={i} className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-300">{i + 2}. IBAN {bank && <span className="font-normal text-neutral-500">· {bank}</span>}</span>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 cursor-pointer" aria-label={`${i + 2}. IBAN'ı kaldır`}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">IBAN *</label>
                <input
                  required
                  value={row.iban}
                  onChange={(e) => update(i, { iban: e.target.value })}
                  onBlur={() => clean.length === 26 && update(i, { iban: formatIban(clean) })}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className={`${INPUT} font-mono`}
                />
                {invalid && <p className="text-[11px] text-red-400 mt-1">IBAN hatalı görünüyor (kontrol hanesi tutmuyor)</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Bu IBAN&apos;ın hesap sahibi</label>
                <input value={row.holder} onChange={(e) => update(i, { holder: e.target.value })} placeholder="Ad Soyad / Şirket" className={INPUT} />
              </div>
            </div>
          </div>
        );
      })}
      {value.length < 9 && (
        <button
          type="button"
          onClick={() => onChange([...value, { iban: '', holder: '' }])}
          className="press flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-neutral-700 text-sm font-semibold text-neutral-300 hover:text-white hover:border-orange-500/50 cursor-pointer"
        >
          <Plus size={15} /> Başka IBAN ekle
        </button>
      )}
    </div>
  );
}
