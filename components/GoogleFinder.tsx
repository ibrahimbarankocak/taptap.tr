'use client';
import { useState } from 'react';
import { Search, Link2, Star, Check, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { fitSummary } from '@/lib/ndef';
import { toGoogleReviewUrl } from '@/lib/validate';

type Place = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviews?: number;
  reviewUrl: string;
  size: { bytes: number; chip?: string; fitsSmallest: boolean; label: string };
};

// İşletme adından ya da müşterinin Google linkinden Place ID bulur → doğrudan yorum ekranı linki.
// Seçilen link onPick ile döner (karta yazılacak link olur).
export default function GoogleFinder({
  initialName = '',
  initialLink = '',
  selected,
  onPick,
}: {
  initialName?: string;
  initialLink?: string;
  selected?: string;
  onPick: (reviewUrl: string, place?: { name: string; address: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState<'name' | 'link' | null>(null);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState('');
  const [needsKey, setNeedsKey] = useState(false);
  const [manual, setManual] = useState('');

  const search = async (mode: 'name' | 'link') => {
    setLoading(mode);
    setError('');
    try {
      const q = new URLSearchParams(mode === 'link' ? { link: initialLink, q: name } : { q: name });
      const res = await fetch(`/api/google/places?${q}`);
      const data = await res.json();
      if (data.resolvedName && mode === 'link') setName(data.resolvedName);
      if (!data.success) {
        setNeedsKey(!!data.needsKey);
        setError(data.needsKey ? '' : data.error || 'Arama başarısız');
        setPlaces(null);
        return;
      }
      setPlaces(data.places);
      if (!data.places.length) setError('Google’da sonuç bulunamadı — adı değiştirip tekrar dene (ilçe eklemek yardımcı olur).');
    } catch {
      setError('Sunucuya ulaşılamadı');
    } finally {
      setLoading(null);
    }
  };

  const manualResult = manual.trim() ? toGoogleReviewUrl(manual) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), name.trim() && search('name'))}
          placeholder="İşletmenin Google'daki adı (ilçe eklemek iyi olur)"
          className="flex-1 min-w-[12rem] bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
        />
        <button
          type="button"
          onClick={() => search('name')}
          disabled={!name.trim() || !!loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-black text-xs font-bold disabled:opacity-40 cursor-pointer"
        >
          {loading === 'name' ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Google&apos;da bul
        </button>
        {initialLink && (
          <button
            type="button"
            onClick={() => search('link')}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-700 text-neutral-200 text-xs font-bold disabled:opacity-40 cursor-pointer"
            title={initialLink}
          >
            {loading === 'link' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Müşterinin linkinden bul
          </button>
        )}
      </div>

      {error && <p className="flex items-center gap-1.5 text-xs text-amber-400"><AlertTriangle size={13} /> {error}</p>}

      {needsKey && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1.5">
          <p className="font-semibold">Otomatik arama için Google API anahtarı gerekli (GOOGLE_MAPS_API_KEY).</p>
          <p className="text-amber-300/80">
            Şimdilik elle: Google’ın resmi <a className="underline" href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id" target="_blank" rel="noopener noreferrer">Place ID Finder</a> sayfasında işletmeyi ara, çıkan <b>ChIJ…</b> kodunu aşağıya yapıştır.
          </p>
        </div>
      )}

      {places && places.length > 0 && (
        <ul className="space-y-2">
          {places.map((p) => {
            const isSel = selected === p.reviewUrl;
            return (
              <li key={p.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${isSel ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-neutral-800 bg-neutral-950'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{p.name || 'İşletme'}</p>
                  {p.address && <p className="text-[11px] text-neutral-500 truncate">{p.address}</p>}
                  <p className="text-[11px] text-neutral-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                    {p.rating !== undefined && (
                      <span className="flex items-center gap-0.5"><Star size={11} className="text-amber-400" /> {p.rating} · {p.reviews ?? 0} yorum</span>
                    )}
                    <span className={p.size.fitsSmallest ? 'text-emerald-400' : 'text-amber-400'}>{p.size.label}</span>
                  </p>
                </div>
                <a href={p.reviewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 hover:text-white">
                  <ExternalLink size={12} /> Test
                </a>
                <button
                  type="button"
                  onClick={() => onPick(p.reviewUrl, p)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${isSel ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-neutral-200'}`}
                >
                  {isSel ? <><Check size={13} /> Seçildi</> : 'Bunu seç'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Elle: Place ID ya da yorum linki yapıştır */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="…ya da Place ID (ChIJ…) / yorum linki yapıştır"
          className="flex-1 min-w-[12rem] bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-neutral-600"
        />
        {manualResult && 'url' in manualResult && (
          <button type="button" onClick={() => onPick(manualResult.url)} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-bold cursor-pointer">
            Kullan ({fitSummary(manualResult.url).bytes} bayt)
          </button>
        )}
      </div>
      {manualResult && 'error' in manualResult && <p className="text-[11px] text-red-400">{manualResult.error}</p>}
      {manualResult && 'warning' in manualResult && manualResult.warning && <p className="text-[11px] text-amber-400">{manualResult.warning}</p>}
    </div>
  );
}
