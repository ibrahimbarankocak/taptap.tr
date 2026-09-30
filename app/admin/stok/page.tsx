'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Boxes, Plus, Minus, ClipboardCheck, Trash2, AlertTriangle, CheckCircle2, Save, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { ChartCard, ColumnChart, StatTile, fmtInt, fmtMoney } from '@/components/charts';

type Item = { key: string; label: string; moved: number; used: number; stock: number; low: number | null; unit_cost: number | null };
type Move = { id: number; item: string; qty: number; kind: string; note: string; created_at: string };
type Breakdown = { revenue: number; commission: number; shipping: number; packaging: number; material: number; partner: number; profit: number; missing: string[] };
type OrderRow = { id: string; date: string; buyer: string; items: string[]; ibanUnits: number; p: Breakdown; tracked: boolean; unknownColor: { size: string; qty: number }[] };
type MonthRow = Omit<Breakdown, 'missing'> & { month: string; orders: number };
type Settings = {
  commission_pct?: number; commission_fixed?: number; shipping?: number; packaging?: number;
  unit_costs: Record<string, number>; low_stock: Record<string, number>; tracking_start?: string;
};
type Data = {
  settings: Settings; partnerRate: number; items: Item[]; unknownColor: { size: string; qty: number }[]; trackedOrders: number;
  moves: Move[]; monthly: MonthRow[]; orders: OrderRow[]; missing: string[];
};

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const monthLabel = (k: string) => `${MONTHS_TR[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;
const dateTr = (s: string) => (s ? new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const money2 = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n);
const INPUT = 'w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white outline-none focus:border-neutral-600';
const KIND_LABEL: Record<string, string> = { in: 'Giriş', out: 'Çıkış', count: 'Sayım' };
const SIZE_TR: Record<string, string> = { '8x8': '8x8 Kare', cuzdan: 'Cüzdan Boy' };

// Ayar formu: sayılar metin olarak tutulur (boş = girilmedi)
type SettingsForm = {
  commission_pct: string; commission_fixed: string; shipping: string; packaging: string;
  unit_costs: Record<string, string>; low_stock: Record<string, string>; tracking_start: string;
};
const str = (n: number | undefined) => (n === undefined || n === null ? '' : String(n));
const toForm = (s: Settings, items: Item[]): SettingsForm => ({
  commission_pct: str(s.commission_pct),
  commission_fixed: str(s.commission_fixed),
  shipping: str(s.shipping),
  packaging: str(s.packaging),
  unit_costs: Object.fromEntries(items.map((i) => [i.key, str(s.unit_costs[i.key])])),
  low_stock: Object.fromEntries(items.map((i) => [i.key, str(s.low_stock[i.key])])),
  tracking_start: s.tracking_start ?? '',
});

function stockState(i: Item): 'out' | 'low' | 'ok' {
  if (i.stock <= 0) return 'out';
  if (i.low !== null && i.stock <= i.low) return 'low';
  return 'ok';
}

export default function StockPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'stock' | 'profit' | 'costs'>('stock');
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stock')
      .then((r) => r.json())
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

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({ success: false, error: 'Sunucuya ulaşılamadı' }));
    if (d.success) load();
    return d as { success: boolean; error?: string; unchanged?: boolean };
  };

  const needsCosts = !!data && (data.settings.commission_pct === undefined || data.settings.shipping === undefined || data.missing.length > 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 pb-4 border-b border-neutral-900">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Panele Dön
          </Link>
        </div>

        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Boxes className="text-neutral-400" /> Stok & Maliyet
        </h1>
        <p className="text-sm text-neutral-500 mt-1 mb-6">
          Boş kartlar ve standlar Shopier siparişlerinden otomatik düşer · sipariş başı kâr ve aylık rapor
        </p>

        <div className="flex gap-2 mb-6 overflow-x-auto [scrollbar-width:none]">
          {([
            ['stock', 'Stok'],
            ['profit', 'Kâr Raporu'],
            ['costs', 'Giderler'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`press shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer ${
                tab === k ? 'bg-white text-black border-white' : 'border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {label}
              {k === 'costs' && needsCosts && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-orange-500 align-middle" aria-label="eksik" />}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {!data && !error && <p className="text-sm text-neutral-500">Yükleniyor...</p>}

        {data && tab === 'stock' && <StockTab data={data} post={post} />}
        {data && tab === 'profit' && <ProfitTab data={data} goCosts={() => setTab('costs')} needsCosts={needsCosts} />}
        {data && tab === 'costs' && <CostsTab data={data} post={post} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function StockTab({ data, post }: { data: Data; post: (b: Record<string, unknown>) => Promise<{ success: boolean; error?: string; unchanged?: boolean }> }) {
  // İlk giriş sayım olmalı (elde olanı yaz)
  const [form, setForm] = useState({ item: data.items[0]?.key ?? '', kind: data.settings.tracking_start ? 'in' : 'count', qty: '', note: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.qty === '') return;
    setBusy(true);
    setMsg('');
    const d = await post({ action: 'move', ...form, qty: Number(form.qty) });
    setBusy(false);
    if (d.success) {
      setMsg(d.unchanged ? 'Sayım mevcut stokla aynı, değişiklik yok' : 'Kaydedildi');
      setForm((f) => ({ ...f, qty: '', note: '' }));
    } else setMsg(`Hata: ${d.error}`);
  };

  const label = (k: string) => data.items.find((i) => i.key === k)?.label ?? k;
  const moves = showAll ? data.moves : data.moves.slice(0, 8);

  return (
    <div className="space-y-6">
      {!data.settings.tracking_start && (
        <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 text-sm text-neutral-300 flex gap-3">
          <Info size={18} className="text-sky-400 shrink-0 mt-0.5" />
          <p>
            Önce elindeki boş kart ve standları <b>Sayım</b> olarak gir. İlk girişle birlikte stok takibi bugünden başlar; bundan sonraki
            Shopier siparişleri stoktan otomatik düşer (eski siparişler düşülmez).
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {data.items.map((i) => {
          const st = data.settings.tracking_start ? stockState(i) : 'ok'; // takip başlamadan uyarı yok
          return (
            <div
              key={i.key}
              className={`rounded-2xl border p-4 min-w-0 ${
                st === 'out' ? 'border-red-500/40 bg-red-500/5' : st === 'low' ? 'border-orange-500/40 bg-orange-500/5' : 'border-neutral-800 bg-neutral-900'
              }`}
            >
              <p className="text-xs text-neutral-400 leading-snug min-h-[2.5em]">{i.label}</p>
              <p className="text-3xl font-semibold tabular-nums mt-1">{fmtInt(i.stock)}</p>
              <p className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                +{fmtInt(i.moved)} giriş · −{fmtInt(i.used)} siparişlerden
              </p>
              {st !== 'ok' && (
                <p className={`mt-2 text-xs font-semibold flex items-center gap-1 ${st === 'out' ? 'text-red-400' : 'text-orange-400'}`}>
                  <AlertTriangle size={13} /> {st === 'out' ? 'Stok bitti' : `Az kaldı (eşik ${i.low})`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {data.settings.tracking_start && (
        <p className="text-xs text-neutral-500 -mt-3">
          Takip başlangıcı {dateTr(data.settings.tracking_start)} · bu tarihten beri {fmtInt(data.trackedOrders)} sipariş stoktan düşüldü
        </p>
      )}

      {data.unknownColor.length > 0 && (
        <div className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 text-sm text-neutral-300 flex gap-3">
          <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
          <p>
            Rengi belli olmayan siparişler stoktan düşülmedi:{' '}
            {data.unknownColor.map((u) => `${fmtInt(u.qty)} adet ${SIZE_TR[u.size] ?? u.size}`).join(', ')}. Hangi renkten kullandıysan
            &quot;Çıkış&quot; olarak gir.
          </p>
        </div>
      )}

      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
        <h2 className="font-bold mb-4">Stok Hareketi Ekle</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_0.8fr_1.4fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Ürün</label>
            <select value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} className={INPUT}>
              {data.items.map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">İşlem</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
              {([
                ['in', 'Giriş', Plus],
                ['out', 'Çıkış', Minus],
                ['count', 'Sayım', ClipboardCheck],
              ] as const).map(([k, l, Icon]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, kind: k })}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    form.kind === k ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon size={12} /> {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">{form.kind === 'count' ? 'Elde olan' : 'Adet'}</label>
            <input type="number" inputMode="numeric" min={0} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className={INPUT} required />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Not (opsiyonel)</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="ör. tedarikçi, bozuk baskı" className={INPUT} maxLength={200} />
          </div>
          <button type="submit" disabled={busy} className="press px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold disabled:opacity-50 cursor-pointer">
            {busy ? '...' : 'Kaydet'}
          </button>
        </form>
        {form.kind === 'count' && <p className="text-xs text-neutral-500 mt-2">Sayım: elinde kaç tane varsa onu yaz, fark otomatik düzeltilir.</p>}
        {msg && <p className="text-sm text-neutral-300 mt-3">{msg}</p>}
      </section>

      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
        <h2 className="font-bold mb-4">Son Hareketler</h2>
        {!data.moves.length ? (
          <p className="text-sm text-neutral-500">Henüz stok hareketi yok.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {moves.map((m) => (
              <li key={m.id} className="py-3 flex items-center gap-3 text-sm">
                <span className={`w-16 shrink-0 font-semibold tabular-nums ${m.qty >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m.qty >= 0 ? '+' : '−'}{fmtInt(Math.abs(m.qty))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-neutral-200 truncate">{label(m.item)}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {KIND_LABEL[m.kind] ?? m.kind} · {dateTr(m.created_at)}{m.note ? ` · ${m.note}` : ''}
                  </p>
                </div>
                {confirmId === m.id ? (
                  <span className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={() => { setConfirmId(null); post({ action: 'delete_move', id: m.id }); }} className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold cursor-pointer">Sil</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="px-2.5 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-400 cursor-pointer">Vazgeç</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmId(m.id)} aria-label="Hareketi sil" className="p-2 rounded-lg text-neutral-500 hover:text-red-400 cursor-pointer shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.moves.length > 8 && (
          <button type="button" onClick={() => setShowAll(!showAll)} className="mt-3 text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer">
            {showAll ? <><ChevronUp size={14} /> Daha az</> : <><ChevronDown size={14} /> Tümü ({data.moves.length})</>}
          </button>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function ProfitTab({ data, goCosts, needsCosts }: { data: Data; goCosts: () => void; needsCosts: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const months = data.monthly.slice(-12);
  const current = data.monthly[data.monthly.length - 1];
  const prev = data.monthly[data.monthly.length - 2];
  const margin = current && current.revenue ? current.profit / current.revenue : 0;
  const hasNegative = months.some((m) => m.profit < 0);

  return (
    <div className="space-y-6">
      {needsCosts && (
        <button
          type="button"
          onClick={goCosts}
          className="w-full text-left p-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 text-sm text-neutral-300 flex gap-3 cursor-pointer hover:border-orange-500/60"
        >
          <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
          <span>
            Bazı giderler girilmedi, 0 sayıldı ({data.missing.slice(0, 4).join(', ')}{data.missing.length > 4 ? '…' : ''}). Kâr gerçekte daha düşük olabilir.{' '}
            <b className="text-white">Giderleri gir →</b>
          </span>
        </button>
      )}

      {current && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label={`Kâr · ${monthLabel(current.month)}`} value={fmtMoney(current.profit)} sub={prev ? `Önceki ay ${fmtMoney(prev.profit)}` : undefined} />
          <StatTile label="Ciro" value={fmtMoney(current.revenue)} sub={`${fmtInt(current.orders)} sipariş`} />
          <StatTile label="Kâr marjı" value={`%${Math.round(margin * 100)}`} sub="kâr / ciro" />
          <StatTile label="Sipariş başı kâr" value={fmtMoney(current.orders ? current.profit / current.orders : 0)} sub="bu ay ortalama" />
        </div>
      )}

      <ChartCard
        title="Aylık Kâr"
        subtitle={`Son ${months.length} ay · ciro − komisyon − kargo − malzeme − ortak payı${hasNegative ? ' · zarar eden aylar 0 gösterilir, tabloya bak' : ''}`}
        table={{
          columns: ['Ay', 'Sipariş', 'Ciro', 'Komisyon', 'Kargo', 'Paket', 'Malzeme', 'Ortak payı', 'Kâr'],
          rows: [...months].reverse().map((m) => [
            monthLabel(m.month), fmtInt(m.orders), fmtMoney(m.revenue), fmtMoney(m.commission), fmtMoney(m.shipping),
            fmtMoney(m.packaging), fmtMoney(m.material), fmtMoney(m.partner), fmtMoney(m.profit),
          ]),
        }}
      >
        <ColumnChart
          data={months.map((m) => ({ label: monthLabel(m.month), value: Math.max(0, m.profit) }))}
          format={(n) => (Math.abs(n) >= 1000 ? `₺${fmtInt(n / 1000)}B` : `₺${fmtInt(n)}`)}
          tooltip={(i) => {
            const m = months[i];
            return (
              <div className="space-y-0.5 tabular-nums">
                <p className="font-semibold text-white">Kâr {fmtMoney(m.profit)}</p>
                <p className="text-neutral-400">Ciro {fmtMoney(m.revenue)} · {fmtInt(m.orders)} sipariş</p>
                <p className="text-neutral-400">Gider {fmtMoney(m.revenue - m.profit)}</p>
              </div>
            );
          }}
        />
      </ChartCard>

      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
        <h2 className="font-bold">Sipariş Başı Kâr</h2>
        <p className="text-xs text-neutral-500 mt-0.5 mb-4">İade edilen siparişler hariç · IBAN kartlarında kart başı {fmtMoney(data.partnerRate)} ortak payı düşülür</p>
        <ul className="divide-y divide-neutral-800">
          {data.orders.slice(0, limit).map((o) => {
            const isOpen = open === o.id;
            return (
              <li key={o.id} className="py-3">
                <button type="button" onClick={() => setOpen(isOpen ? null : o.id)} className="w-full flex items-center gap-3 text-left cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-200 truncate">{o.items.join(' + ') || 'Ürün yok'}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      #{o.id} · {dateTr(o.date)} · {o.buyer}
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <p className={`text-sm font-semibold ${o.p.profit < 0 ? 'text-red-400' : 'text-white'}`}>{fmtMoney(o.p.profit)}</p>
                    <p className="text-[11px] text-neutral-500">{fmtMoney(o.p.revenue)}</p>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-neutral-500 shrink-0" /> : <ChevronDown size={16} className="text-neutral-500 shrink-0" />}
                </button>
                {isOpen && (
                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {([
                      ['Ciro', o.p.revenue, false],
                      ['Shopier komisyonu', o.p.commission, true],
                      ['Kargo', o.p.shipping, true],
                      ['Paketleme', o.p.packaging, true],
                      ['Kart + stand', o.p.material, true],
                      [`Ortak payı (${o.ibanUnits} IBAN)`, o.p.partner, true],
                    ] as const).map(([l, v, minus]) => (
                      <div key={l} className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
                        <dt className="text-neutral-500">{l}</dt>
                        <dd className="text-neutral-200 font-semibold tabular-nums">{minus && v > 0 ? '−' : ''}{money2(v)}</dd>
                      </div>
                    ))}
                    <div className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2">
                      <dt className="text-neutral-500">Net kâr</dt>
                      <dd className={`font-bold tabular-nums ${o.p.profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{money2(o.p.profit)}</dd>
                    </div>
                    {o.p.missing.length > 0 && (
                      <p className="col-span-full text-orange-400 flex items-center gap-1">
                        <AlertTriangle size={12} /> Girilmemiş: {o.p.missing.join(', ')}
                      </p>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
        {data.orders.length > limit && (
          <button type="button" onClick={() => setLimit(limit + 30)} className="mt-3 text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer">
            <ChevronDown size={14} /> Daha fazla göster
          </button>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function CostsTab({ data, post }: { data: Data; post: (b: Record<string, unknown>) => Promise<{ success: boolean; error?: string }> }) {
  const [form, setForm] = useState<SettingsForm>(() => toForm(data.settings, data.items));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const d = await post({ action: 'settings', settings: form });
    setBusy(false);
    setMsg(d.success ? 'Kaydedildi' : `Hata: ${d.error}`);
  };

  const field = (key: 'commission_pct' | 'commission_fixed' | 'shipping' | 'packaging', label: string, hint: string, suffix: string) => (
    <div>
      <label className="block text-xs text-neutral-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder="girilmedi"
          className={`${INPUT} pr-10`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">{suffix}</span>
      </div>
      <p className="text-[11px] text-neutral-500 mt-1">{hint}</p>
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
        <h2 className="font-bold mb-4">Sipariş Başı Giderler</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('commission_pct', 'Shopier komisyonu', 'Sipariş toplamı üzerinden yüzde', '%')}
          {field('commission_fixed', 'Sabit işlem ücreti (varsa)', 'Her siparişten kesilen sabit tutar', '₺')}
          {field('shipping', 'Kargo', 'Bir siparişi göndermenin maliyeti', '₺')}
          {field('packaging', 'Paketleme / diğer (opsiyonel)', 'Kutu, zarf, etiket vb.', '₺')}
        </div>
      </section>

      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
        <h2 className="font-bold">Birim Maliyet ve Stok Uyarısı</h2>
        <p className="text-xs text-neutral-500 mt-0.5 mb-4">Baskılı tek kartın / standın sana maliyeti · stok bu sayıya inince uyarı verilir</p>
        <div className="space-y-3">
          {data.items.map((i) => (
            <div key={i.key} className="grid grid-cols-[1fr_6.5rem_5.5rem] sm:grid-cols-[1fr_9rem_8rem] gap-2 sm:gap-3 items-center">
              <span className="text-sm text-neutral-200 min-w-0">{i.label}</span>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  aria-label={`${i.label} birim maliyet`}
                  value={form.unit_costs[i.key] ?? ''}
                  onChange={(e) => setForm({ ...form, unit_costs: { ...form.unit_costs, [i.key]: e.target.value } })}
                  placeholder="maliyet"
                  className={`${INPUT} pr-7`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₺</span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                aria-label={`${i.label} stok uyarı eşiği`}
                value={form.low_stock[i.key] ?? ''}
                onChange={(e) => setForm({ ...form, low_stock: { ...form.low_stock, [i.key]: e.target.value } })}
                placeholder="uyarı"
                className={INPUT}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-neutral-500 mt-3">IBAN kartı ortak payı ({fmtMoney(data.partnerRate)} / kart) Ortaklık sayfasındaki ücretten alınır.</p>
      </section>

      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
        <h2 className="font-bold">Stok Takip Başlangıcı</h2>
        <p className="text-xs text-neutral-500 mt-0.5 mb-3">Bu tarihten itibaren gelen siparişler stoktan düşer. İlk stok girişinde otomatik bugün olur.</p>
        <input
          type="date"
          value={form.tracking_start}
          onChange={(e) => setForm({ ...form, tracking_start: e.target.value })}
          className={`${INPUT} sm:max-w-xs [color-scheme:dark]`}
        />
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="press flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-bold disabled:opacity-50 cursor-pointer">
          <Save size={16} /> {busy ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        {msg && (
          <span className="text-sm text-neutral-300 flex items-center gap-1.5">
            {msg === 'Kaydedildi' && <CheckCircle2 size={15} className="text-emerald-400" />} {msg}
          </span>
        )}
      </div>
    </form>
  );
}
