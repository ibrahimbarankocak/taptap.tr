'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Handshake, RefreshCw, Plus, Trash2, Wallet, CheckCircle2, Clock, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { ColumnChart, fmtInt, fmtMoney } from '@/components/charts';

type Summary = {
  rate: number;
  totalCards: number;
  earned: number;
  paidCards: number;
  paidAmount: number;
  pendingCards: number;
  pendingAmount: number;
  overpaidCards: number;
  progress: number;
};
type Payment = { id: number; paid_at: string; cards: number; amount: number; note: string };
type Row = { id: string; date: string; title: string; units: number; source: 'product' | 'note' };
type Data = { summary: Summary; fromNotes: number; byMonth: { month: string; units: number }[]; rows: Row[]; payments: Payment[] };

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const monthLabel = (k: string) => `${MONTHS_TR[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;
const dateTr = (s: string) => (s ? new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const today = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);

const INPUT = 'w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white outline-none focus:border-neutral-600';

export default function PartnerPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ cards: '', amount: '', paid_at: today(), note: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);

  // version artınca veriler yeniden çekilir (ödeme ekleme/silme, senkronizasyon sonrası)
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/partner')
      .then((res) => res.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) {
          setData(d);
          setError('');
        } else setError(d.error || 'Veriler alınamadı');
      })
      .catch(() => !cancelled && setError('Sunucuya ulaşılamadı'));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const sync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/crm/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: Number(form.cards), amount: form.amount === '' ? undefined : Number(form.amount), paid_at: form.paid_at, note: form.note }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setForm({ cards: '', amount: '', paid_at: today(), note: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const removePayment = async (id: number) => {
    await fetch(`/api/partner?id=${id}`, { method: 'DELETE' });
    setConfirmId(null);
    await load();
  };

  const saveRate = async () => {
    const rate = Number(editRate);
    if (!rate || rate <= 0) return;
    await fetch('/api/partner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rate }) });
    setEditRate(null);
    await load();
  };

  const s = data?.summary;
  const autoAmount = form.cards && s ? Number(form.cards) * s.rate : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-6 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 pb-4 border-b border-neutral-900">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Panele Dön
          </Link>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Handshake className="text-orange-400 shrink-0" /> IBAN Kartı Ortaklığı
            </h1>
            <div className="text-sm text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
              {editRate === null ? (
                <>
                  Kart başı <b className="text-neutral-200">{s ? fmtMoney(s.rate) : '…'}</b>
                  <button type="button" onClick={() => setEditRate(String(s?.rate ?? 90))} className="p-1 rounded text-neutral-500 hover:text-white cursor-pointer" aria-label="Ücreti değiştir">
                    <Pencil size={13} />
                  </button>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <input type="number" inputMode="decimal" value={editRate} onChange={(e) => setEditRate(e.target.value)} className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-base sm:text-sm text-white" />
                  <button type="button" onClick={saveRate} className="px-2.5 py-1 rounded-lg bg-white text-black text-xs font-bold cursor-pointer">Kaydet</button>
                  <button type="button" onClick={() => setEditRate(null)} className="text-xs text-neutral-400 cursor-pointer">Vazgeç</button>
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={sync} disabled={syncing} className="press flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-700 text-sm font-semibold text-neutral-200 hover:border-neutral-500 disabled:opacity-50 cursor-pointer">
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} /> Shopier&apos;dan güncelle
          </button>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        {!s ? (
          !error && <p className="text-sm text-neutral-500">Yükleniyor…</p>
        ) : (
          <div className="space-y-5">
            {/* Bekleyen: ana rakam */}
            <section className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-neutral-900 to-neutral-900 p-5 sm:p-6">
              <p className="text-sm text-orange-200/80 flex items-center gap-1.5"><Clock size={15} /> Ödemesi bekleyen</p>
              <p className="text-5xl font-semibold tracking-tight mt-1">{fmtMoney(s.pendingAmount)}</p>
              <p className="text-sm text-neutral-400 mt-1">
                <b className="text-white">{fmtInt(s.pendingCards)}</b> kart × {fmtMoney(s.rate)}
              </p>
              {/* İlerleme: ödenen / toplam */}
              <div className="mt-5">
                <div className="h-3 rounded-full bg-neutral-800 overflow-hidden flex gap-[2px]">
                  <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${s.progress * 100}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400 mt-1.5">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Ödenen {fmtInt(s.paidCards)}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-600" /> Bekleyen {fmtInt(s.pendingCards)}</span>
                </div>
              </div>
              {s.overpaidCards > 0 && (
                <p className="text-xs text-amber-300 mt-3">Dikkat: basılandan {fmtInt(s.overpaidCards)} kart fazla ödeme girilmiş.</p>
              )}
            </section>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile label="Toplam basılan IBAN kartı" value={fmtInt(s.totalCards)} sub={data.fromNotes ? `${fmtInt(data.fromNotes)} tanesi paket notlarından` : 'Shopier siparişlerinden'} />
              <Tile label="Toplam hak ediş" value={fmtMoney(s.earned)} sub={`${fmtInt(s.totalCards)} × ${fmtMoney(s.rate)}`} />
              <Tile label="Ödemesi alınan" value={fmtMoney(s.paidAmount)} sub={`${fmtInt(s.paidCards)} kart`} icon={<CheckCircle2 size={13} className="text-emerald-400" />} />
              <Tile label="Bekleyen kart" value={fmtInt(s.pendingCards)} sub={fmtMoney(s.pendingAmount)} icon={<Clock size={13} className="text-orange-400" />} />
            </div>

            {/* Ödeme ekle */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
              <h2 className="font-bold flex items-center gap-2 mb-4"><Wallet size={18} /> Ödeme Ekle</h2>
              <form onSubmit={addPayment} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <label className="block">
                  <span className="block text-[11px] text-neutral-500 mb-1">Kaç kartın ödemesi *</span>
                  <input required type="number" inputMode="numeric" min={1} value={form.cards} onChange={(e) => setForm({ ...form, cards: e.target.value })} className={INPUT} placeholder="ör. 20" />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-neutral-500 mb-1">Tutar (₺)</span>
                  <input type="number" inputMode="decimal" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={INPUT} placeholder={autoAmount ? String(autoAmount) : 'otomatik'} />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-neutral-500 mb-1">Tarih</span>
                  <input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} className={`${INPUT} [color-scheme:dark]`} />
                </label>
                <label className="block col-span-2 sm:col-span-1">
                  <span className="block text-[11px] text-neutral-500 mb-1">Not</span>
                  <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={INPUT} placeholder="ör. havale" />
                </label>
                <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-2">
                  <button type="submit" disabled={saving || !form.cards} className="press flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold disabled:opacity-40 cursor-pointer">
                    <Plus size={16} /> {saving ? 'Kaydediliyor…' : 'Ödemeyi Kaydet'}
                  </button>
                  {s.pendingCards > 0 && (
                    <button type="button" onClick={() => setForm({ ...form, cards: String(s.pendingCards), amount: '' })} className="px-3 py-2.5 rounded-xl border border-neutral-700 text-xs font-semibold text-neutral-300 cursor-pointer">
                      Bekleyenin hepsi ({fmtInt(s.pendingCards)} kart)
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Ödeme geçmişi */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
              <h2 className="font-bold mb-3">Ödeme Geçmişi</h2>
              {data.payments.length === 0 ? (
                <p className="text-sm text-neutral-500">Henüz ödeme girilmedi.</p>
              ) : (
                <ul className="divide-y divide-neutral-800">
                  {data.payments.map((p) => (
                    <li key={p.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm text-neutral-400 w-24 shrink-0">{dateTr(p.paid_at)}</span>
                      <span className="text-sm font-semibold text-white">{fmtInt(p.cards)} kart</span>
                      <span className="text-sm text-emerald-400">{fmtMoney(p.amount)}</span>
                      {p.note && <span className="text-xs text-neutral-500 truncate max-w-[12rem]">{p.note}</span>}
                      <span className="ml-auto">
                        {confirmId === p.id ? (
                          <span className="flex items-center gap-2">
                            <button type="button" onClick={() => removePayment(p.id)} className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-bold cursor-pointer">Sil</button>
                            <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-neutral-400 cursor-pointer">Vazgeç</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setConfirmId(p.id)} className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 cursor-pointer" aria-label="Ödemeyi sil">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Aylık basılan kart */}
            {data.byMonth.length > 0 && (
              <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 min-w-0">
                <h2 className="font-bold">Aylık basılan IBAN kartı</h2>
                <p className="text-xs text-neutral-500 mb-3">Shopier siparişlerinden (iadeler hariç)</p>
                <ColumnChart data={data.byMonth.map((m) => ({ label: monthLabel(m.month), value: m.units }))} format={fmtInt} height={200} />
              </section>
            )}

            {/* Sipariş dökümü */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
              <button type="button" onClick={() => setShowOrders(!showOrders)} className="w-full flex items-center justify-between cursor-pointer">
                <h2 className="font-bold">Sayılan siparişler ({fmtInt(data.rows.length)})</h2>
                {showOrders ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
              </button>
              {showOrders && (
                <ul className="mt-3 divide-y divide-neutral-800 text-sm">
                  {data.rows.map((r, i) => (
                    <li key={r.id + i} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="text-neutral-500 w-24 shrink-0">{dateTr(r.date)}</span>
                      <span className="text-neutral-400 font-mono text-xs">#{r.id}</span>
                      <span className="text-neutral-200 min-w-0 flex-1 truncate">{r.title}</span>
                      {r.source === 'note' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-sky-500/30 text-sky-300">nottan</span>}
                      <span className="font-semibold text-white">{fmtInt(r.units)} kart</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 min-w-0">
      <p className="text-xs text-neutral-400 flex items-center gap-1.5">{icon}{label}</p>
      <p className="text-2xl font-semibold text-white mt-1 truncate">{value}</p>
      {sub && <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
