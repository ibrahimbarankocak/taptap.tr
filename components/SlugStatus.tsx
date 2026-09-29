'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, AlertTriangle, Loader2, Wand2 } from 'lucide-react';

// Slug alanının altında: kartın tam adresi + adres boş mu (yazarken canlı kontrol)
export default function SlugStatus({
  slug, excludeId, auto, onUse, onRegenerate,
}: {
  slug: string;
  excludeId?: string | number;
  auto: boolean; // slug hâlâ başlıktan otomatik mi üretiliyor
  onUse: (slug: string) => void;
  onRegenerate: () => void;
}) {
  const [state, setState] = useState<{ checked: string; available?: boolean; error?: string; suggestion?: string }>({ checked: '' });

  useEffect(() => {
    if (!slug) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const q = new URLSearchParams({ slug, ...(excludeId ? { exclude: String(excludeId) } : {}) });
      fetch(`/api/customers/slug-available?${q}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setState({ checked: slug, ...d }))
        .catch(() => {});
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [slug, excludeId]);

  const host = useSyncExternalStore(() => () => {}, () => window.location.host, () => 'taptap.tr');
  const checking = slug && state.checked !== slug;

  return (
    <div className="mt-1.5 space-y-1 text-[11px]">
      <p className="text-neutral-500 font-mono break-all">
        {host}/<span className="text-neutral-300">{slug || '…'}</span>
      </p>
      {slug && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {checking ? (
            <span className="flex items-center gap-1 text-neutral-500"><Loader2 size={12} className="animate-spin" /> Kontrol ediliyor…</span>
          ) : state.available ? (
            <span className="flex items-center gap-1 text-emerald-400"><Check size={12} /> Adres boş, kullanılabilir</span>
          ) : (
            <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={12} /> {state.error}</span>
          )}
          {!checking && state.suggestion && (
            <button type="button" onClick={() => onUse(state.suggestion!)} className="px-2 py-0.5 rounded-md border border-neutral-700 text-neutral-200 hover:text-white cursor-pointer font-mono">
              {state.suggestion} kullan
            </button>
          )}
          {!auto && (
            <button type="button" onClick={onRegenerate} className="flex items-center gap-1 text-neutral-400 hover:text-white cursor-pointer">
              <Wand2 size={11} /> Başlıktan oluştur
            </button>
          )}
        </div>
      )}
    </div>
  );
}
