'use client';
import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Plus, Edit3, Trash2, ExternalLink, Save, X, Search } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import GoogleReviewHint from '@/components/GoogleReviewHint';
import { toSlugInput, suggestSlug, MAX_SLUG_LENGTH } from '@/lib/validate';
import SlugStatus from '@/components/SlugStatus';

// Google yorum kartları: karta taptap.tr/<slug> yazılır, site doğrudan işletmenin yorum ekranına yönlendirir.
// Müşteriler sayfasından ayrı tutulur (orada sadece Premium ve IBAN kartları var).

type GoogleCard = { id: number; slug: string; full_name: string; review_url: string | null };
const EMPTY = { full_name: '', slug: '', google_review: '' };
const INPUT = 'w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors';

export default function GoogleCardsPage() {
  const [cards, setCards] = useState<GoogleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [fromOrder, setFromOrder] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false); // elle değiştirilmediyse slug isimden otomatik üretilir
  // Sunucuda boş, tarayıcıda gerçek adres (hydration uyumsuzluğu olmadan)
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => '');

  const load = () =>
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setCards(data.filter((c) => c.card_type === 'google')))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // CRM'den "Profil Oluştur" ile gelindiyse formu siparişten doldur
    const orderId = new URLSearchParams(window.location.search).get('fromOrder');
    if (!orderId) return;
    fetch(`/api/crm/orders/${encodeURIComponent(orderId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;
        const f = data.order.extracted || {};
        const name = f.business_name || data.order.buyer_name || '';
        setFromOrder(orderId);
        setForm({ full_name: name, slug: suggestSlug(name), google_review: f.card_link || f.website || '' });
        setFormOpen(true);
      })
      .catch(() => {});
  }, []);

  const openNew = () => { setForm(EMPTY); setEditingId(null); setSlugTouched(false); setError(''); setFormOpen(true); };
  const openEdit = (c: GoogleCard) => {
    setForm({ full_name: c.full_name, slug: c.slug, google_review: c.review_url || '' });
    setEditingId(c.id);
    setSlugTouched(true); // mevcut kartın adresi isimle birlikte değişmesin
    setError('');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY); setError(''); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(editingId ? `/api/customers/${editingId}` : '/api/customers', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, card_type: 'google' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Kaydedilemedi');
      if (fromOrder && data.id) {
        await fetch(`/api/crm/orders/${encodeURIComponent(fromOrder)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: data.id, status: 'ready' }),
        });
        setFromOrder(null);
      }
      closeForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) setCards((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
  };

  const q = search.toLocaleLowerCase('tr');
  const filtered = cards.filter((c) => !q || c.full_name.toLocaleLowerCase('tr').includes(q) || c.slug.includes(q));

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 pb-4 border-b border-neutral-900">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Panele Dön
          </Link>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Star className="text-sky-400" /> Google Yorum Kartları
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Karta <span className="font-mono text-neutral-400">{origin.replace(/^https?:\/\//, '') || 'taptap.tr'}/slug</span> yazılır; dokununca direkt yorum ekranı açılır.</p>
          </div>
          {!formOpen && (
            <button type="button" onClick={openNew} className="press flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 cursor-pointer">
              <Plus size={16} /> Yeni Google Kartı
            </button>
          )}
        </div>

        {formOpen && (
          <form onSubmit={save} className="animate-fade-up bg-neutral-900 border border-sky-500/30 rounded-3xl p-5 sm:p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{editingId ? 'Kartı Düzenle' : 'Yeni Google Yorum Kartı'}</h2>
              <button type="button" onClick={closeForm} className="p-2 rounded-lg text-neutral-400 hover:text-white cursor-pointer" aria-label="Kapat"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">İşletme Adı *</label>
                <input
                  required
                  className={INPUT}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value, slug: slugTouched ? form.slug : suggestSlug(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Kart Adresi (Slug) *</label>
                <input required maxLength={editingId ? 60 : MAX_SLUG_LENGTH} className={`${INPUT} font-mono`} value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: toSlugInput(e.target.value, editingId ? 60 : MAX_SLUG_LENGTH) }); }} />
                <SlugStatus
                  slug={form.slug}
                  excludeId={editingId ?? undefined}
                  auto={!slugTouched || !!editingId}
                  onUse={(slug) => { setSlugTouched(true); setForm({ ...form, slug }); }}
                  onRegenerate={() => { setSlugTouched(false); setForm({ ...form, slug: suggestSlug(form.full_name) }); }}
                />
                {editingId && <p className="text-[11px] text-amber-400/80 mt-1.5">Dikkat: karta yazılmış adresi değiştirirsen eski kart çalışmaz.</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Google Yorum Linki *</label>
              <input required placeholder="https://g.page/r/.../review" className={`${INPUT} font-mono`} value={form.google_review} onChange={(e) => setForm({ ...form, google_review: e.target.value })} />
              <GoogleReviewHint value={form.google_review} />
            </div>
            {error && <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{error}</p>}
            <button type="submit" disabled={saving} className="press w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-neutral-200 disabled:opacity-50 cursor-pointer">
              <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        )}

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input placeholder="İşletme veya slug ara..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${INPUT} pl-10`} />
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Yükleniyor...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 bg-neutral-900 border border-neutral-800 rounded-3xl">
            <Star className="mx-auto text-neutral-600 mb-3" />
            <p className="text-neutral-400">{cards.length ? 'Aramaya uyan kart yok.' : 'Henüz Google yorum kartı yok.'}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((c) => {
              const cardUrl = `${origin}/${c.slug}`;
              return (
                <li key={c.id} className="animate-fade-up bg-neutral-900 border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 shrink-0 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center"><Star size={18} /></div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate">{c.full_name}</h3>
                        <span className="inline-block mt-0.5 text-[11px] font-mono bg-neutral-950 px-2 py-0.5 rounded text-neutral-400 border border-neutral-800">/{c.slug}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton value={cardUrl} label="Kart linki" />
                      {c.review_url && (
                        <a href={c.review_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-white" title="Yorum ekranını aç">
                          <ExternalLink size={14} /> Test
                        </a>
                      )}
                      <button type="button" onClick={() => openEdit(c)} className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer" aria-label="Düzenle"><Edit3 size={15} /></button>
                      <button type="button" onClick={() => setConfirmDelete(c.id)} className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/30 cursor-pointer" aria-label="Sil"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-2 truncate">
                    Yönlendiriyor: <span className="font-mono text-neutral-400">{c.review_url || '— link yok'}</span>
                  </p>
                  {confirmDelete === c.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-sm text-red-200 flex-1 min-w-[12rem]">Silinirse bu adrese yazılmış kartlar çalışmaz. Emin misin?</p>
                      <button type="button" onClick={() => remove(c.id)} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-bold cursor-pointer">Evet, sil</button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg border border-neutral-700 text-sm text-neutral-300 cursor-pointer">Vazgeç</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
