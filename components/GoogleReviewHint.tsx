'use client';
import { Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { toGoogleReviewUrl } from '@/lib/validate';

// Admin formunda: yapıştırılan linkin nereye yönleneceğini anında gösterir
export default function GoogleReviewHint({ value }: { value: string }) {
  if (!value.trim()) {
    return (
      <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
        Google İşletme Profili → <b className="text-neutral-400">Yorum iste</b> bölümündeki linki yapıştır (g.page/r/.../review). Place ID (ChIJ...) da olur.
      </p>
    );
  }
  const r = toGoogleReviewUrl(value);
  if ('error' in r) {
    return <p className="flex items-start gap-1.5 text-[11px] text-red-400 mt-2"><AlertTriangle size={13} className="shrink-0 mt-px" /> {r.error}</p>;
  }
  return (
    <div className={`mt-2 rounded-xl border p-3 text-[11px] ${r.warning ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
      <p className={`flex items-start gap-1.5 ${r.warning ? 'text-amber-300' : 'text-emerald-400'}`}>
        {r.warning ? <AlertTriangle size={13} className="shrink-0 mt-px" /> : <Check size={13} className="shrink-0 mt-px" />}
        {r.warning || 'Kart doğrudan yorum yazma ekranını açacak'}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="font-mono text-neutral-400 break-all flex-1 min-w-0">{r.url}</span>
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white">
          <ExternalLink size={12} /> Test et
        </a>
      </div>
    </div>
  );
}
