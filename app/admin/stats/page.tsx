'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, Clock } from 'lucide-react';
import { CARD_TYPE_LABELS, type CardType } from '@/lib/parseOrderNote';
import type { Stats } from '@/lib/stats';
import {
  ChartCard, StatTile, ColumnChart, BarList, StackedBar, VIZ,
  fmtMoney, fmtCompactMoney, fmtInt, fmtPct,
} from '@/components/charts';

const RANGES = [
  { key: 'today', label: 'Bugün' },
  { key: '30', label: '30 gün' },
  { key: '90', label: '90 gün' },
  { key: '365', label: '12 ay' },
  { key: 'all', label: 'Tümü' },
];

const STATUS_LABELS: Record<string, string> = { new: 'Yeni', ready: 'Hazır', written: 'Karta yazıldı', shipped: 'Kargolandı' };
const typeLabel = (k: string) => CARD_TYPE_LABELS[k as CardType] || k;

// Dünle karşılaştırma: yön ikon + metinle gösterilir (sadece renge güvenilmez)
function Delta({ now, before, format }: { now: number; before: number; format: (n: number) => string }) {
  if (before === 0 && now === 0) return <span className="text-neutral-500">Dün bu saate kadar da yoktu</span>;
  const diff = now - before;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const tone = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-neutral-400';
  const pct = before > 0 ? ` (${diff > 0 ? '+' : ''}${Math.round((diff / before) * 100)}%)` : '';
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className={`inline-flex items-center gap-0.5 whitespace-nowrap ${tone}`}>
        <Icon size={13} /> {diff > 0 ? '+' : diff < 0 ? '−' : ''}{format(Math.abs(diff))}{pct}
      </span>
      <span className="text-neutral-500">dünün bu saatine göre</span>
    </span>
  );
}

function TodaySection({ today }: { today: Stats['today'] }) {
  const dateLabel = new Date(today.date + 'T12:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold text-neutral-100 flex items-center gap-2">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </span>
          Bugün
        </h2>
        <span className="text-xs text-neutral-500">{dateLabel}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-neutral-400">Ciro</p>
          <p className="text-3xl font-semibold text-white mt-1">{fmtMoney(today.revenue)}</p>
          <p className="text-[11px] mt-1"><Delta now={today.revenue} before={today.yesterdaySoFar.revenue} format={fmtMoney} /></p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <p className="text-xs text-neutral-400">Sipariş</p>
          <p className="text-3xl font-semibold text-white mt-1">{fmtInt(today.orders)}</p>
          <p className="text-[11px] mt-1"><Delta now={today.orders} before={today.yesterdaySoFar.orders} format={fmtInt} /></p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <p className="text-xs text-neutral-400">Satılan kart</p>
          <p className="text-3xl font-semibold text-white mt-1">{fmtInt(today.units)}</p>
          <p className="text-[11px] text-neutral-500 mt-1">Dün toplam: {fmtInt(today.yesterday.units)}</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-neutral-400">Yeni profil</p>
          <p className="text-3xl font-semibold text-white mt-1">{fmtInt(today.newProfiles)}</p>
          <p className="text-[11px] text-neutral-500 mt-1">Dün toplam ciro: {fmtMoney(today.yesterday.revenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-3 min-w-0">
          <p className="text-xs text-neutral-500 mb-1">Saatlik sipariş (Türkiye saati)</p>
          {today.orders > 0 ? (
            <ColumnChart
              data={today.byHour.map((h) => ({ label: h.label, value: h.orders }))}
              format={fmtInt}
              height={180}
              tooltip={(i) => (
                <>
                  <p className="font-semibold text-white">{fmtInt(today.byHour[i].orders)} sipariş</p>
                  <p className="text-neutral-400">{fmtMoney(today.byHour[i].revenue)}</p>
                </>
              )}
            />
          ) : (
            <p className="text-sm text-neutral-500 py-10 text-center">Bugün henüz sipariş yok.</p>
          )}
        </div>
        <div className="lg:col-span-2 min-w-0">
          <p className="text-xs text-neutral-500 mb-2">Bugünün son siparişleri</p>
          {today.latest.length ? (
            <ul className="space-y-2">
              {today.latest.map((o, i) => (
                <li key={i} className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono shrink-0"><Clock size={11} />{o.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-200 truncate">{o.buyer || '—'}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{o.products}</p>
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">{fmtMoney(o.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">—</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function StatsPage() {
  const [range, setRange] = useState('365');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [monthMetric, setMonthMetric] = useState<'revenue' | 'orders'>('revenue');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/crm/stats?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) { setStats(data.stats); setError(''); }
        else setError(data.error || 'İstatistikler alınamadı');
      })
      .catch(() => !cancelled && setError('Sunucuya ulaşılamadı'));
    return () => { cancelled = true; };
  }, [range]);

  const s = stats?.summary;
  const rangeLabel = RANGES.find((r) => r.key === range)?.label;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 pb-4 border-b border-neutral-900">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Panele Dön
          </Link>
        </div>

        {/* Başlık + tarih filtresi (tüm grafikler için tek satır) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="text-neutral-400" /> İstatistikler
          </h1>
          <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer ${
                  range === r.key ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        {!stats || !s ? (
          !error && <p className="text-sm text-neutral-500">Yükleniyor...</p>
        ) : (
          <div className="space-y-5">
            {/* Bugün: seçili aralıktan bağımsız, her zaman en üstte */}
            <TodaySection today={stats.today} />

            {/* Ana rakam */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
              <p className="text-sm text-neutral-400">{range === 'today' ? 'Bugünkü ciro' : 'Toplam ciro'} · {rangeLabel}</p>
              <p className="text-5xl font-semibold tracking-tight mt-1">{fmtMoney(s.revenue)}</p>
              <p className="text-sm text-neutral-500 mt-2">
                {fmtInt(s.orders)} sipariş · {fmtInt(s.units)} kart satıldı
                {stats.payment.discountTotal > 0 && ` · ${fmtMoney(stats.payment.discountTotal)} indirim`}
              </p>
            </div>

            {/* Özet kutucukları */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Ortalama sepet" value={fmtMoney(s.avgOrder)} />
              <StatTile label="Müşteri" value={fmtInt(s.buyers)} sub={`${fmtInt(s.repeatBuyers)} tekrar eden · ${fmtPct(s.repeatRate)}`} />
              <StatTile label="Kayıtlı profil" value={fmtInt(stats.profiles.total)} sub={`${fmtInt(stats.profiles.premium)} premium · ${fmtInt(stats.profiles.iban)} IBAN · ${fmtInt(stats.profiles.google)} Google`} />
              <StatTile
                label="İlgi bekleyen sipariş"
                value={fmtInt(s.needsAttention)}
                sub={s.refunded ? `${fmtInt(s.refunded)} iade` : 'Notunda eksik bilgi olan yeni siparişler'}
                tone={s.needsAttention > 0 ? <AlertTriangle size={13} className="text-amber-400" /> : undefined}
              />
            </div>

            {/* Aylık ciro / sipariş — tek eksen: metrik geçişli */}
            <ChartCard
              title={monthMetric === 'revenue' ? 'Aylık ciro' : 'Aylık sipariş sayısı'}
              subtitle={rangeLabel}
              actions={
                <div className="flex gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
                  {(['revenue', 'orders'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonthMetric(m)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md cursor-pointer ${monthMetric === m ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
                    >
                      {m === 'revenue' ? 'Ciro' : 'Sipariş'}
                    </button>
                  ))}
                </div>
              }
              table={{
                columns: ['Ay', 'Ciro', 'Sipariş'],
                rows: stats.byMonth.map((m) => [m.label, fmtMoney(m.revenue), fmtInt(m.orders)]),
              }}
            >
              {stats.byMonth.length ? (
                <ColumnChart
                  data={stats.byMonth.map((m) => ({ label: m.label, value: monthMetric === 'revenue' ? m.revenue : m.orders }))}
                  format={monthMetric === 'revenue' ? fmtCompactMoney : fmtInt}
                  tooltip={(i) => (
                    <>
                      <p className="font-semibold text-white">{fmtMoney(stats.byMonth[i].revenue)}</p>
                      <p className="text-neutral-400">{fmtInt(stats.byMonth[i].orders)} sipariş</p>
                    </>
                  )}
                />
              ) : (
                <p className="text-sm text-neutral-500">Bu aralıkta sipariş yok.</p>
              )}
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <ChartCard
                title="Kart tipine göre ciro"
                table={{
                  columns: ['Kart tipi', 'Ciro', 'Sipariş', 'Adet'],
                  rows: stats.byCardType.map((t) => [typeLabel(t.key), fmtMoney(t.revenue), fmtInt(t.orders), fmtInt(t.units)]),
                }}
              >
                <BarList
                  data={stats.byCardType.map((t) => ({ label: typeLabel(t.key), value: t.revenue }))}
                  format={fmtMoney}
                  sub={(i) => `${fmtInt(stats.byCardType[i].units)} adet`}
                />
              </ChartCard>

              <ChartCard
                title="En çok satan ürünler"
                subtitle="Satılan adet"
                table={{
                  columns: ['Ürün', 'Adet', 'Ciro'],
                  rows: stats.topProducts.map((p) => [p.title, fmtInt(p.qty), fmtMoney(p.revenue)]),
                }}
              >
                <BarList
                  data={stats.topProducts.map((p) => ({ label: p.title, value: p.qty }))}
                  format={fmtInt}
                  sub={(i) => fmtMoney(stats.topProducts[i].revenue)}
                />
              </ChartCard>

              <ChartCard
                title="Şehirler"
                subtitle="Sipariş sayısı"
                table={{
                  columns: ['Şehir', 'Sipariş', 'Ciro'],
                  rows: stats.topCities.map((c) => [c.city, fmtInt(c.orders), fmtMoney(c.revenue)]),
                }}
              >
                <BarList
                  data={stats.topCities.map((c) => ({ label: c.city, value: c.orders }))}
                  format={fmtInt}
                  sub={(i) => fmtMoney(stats.topCities[i].revenue)}
                />
              </ChartCard>

              <ChartCard
                title="Haftanın günleri"
                subtitle="Sipariş sayısı"
                table={{ columns: ['Gün', 'Sipariş'], rows: stats.weekday.map((d) => [d.label, fmtInt(d.orders)]) }}
              >
                <ColumnChart data={stats.weekday.map((d) => ({ label: d.label, value: d.orders }))} format={fmtInt} height={200} />
              </ChartCard>
            </div>

            <ChartCard
              title="Operasyon durumu"
              subtitle="Siparişlerin kart hazırlık aşaması"
              table={{ columns: ['Durum', 'Sipariş'], rows: stats.status.map((x) => [STATUS_LABELS[x.key], fmtInt(x.count)]) }}
            >
              <StackedBar
                segments={stats.status.map((x, i) => ({ label: STATUS_LABELS[x.key], value: x.count, color: VIZ.series[i] }))}
              />
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <ChartCard
                title="Ödeme yöntemi"
                subtitle={`${fmtInt(stats.payment.installments)} sipariş taksitli`}
                table={{
                  columns: ['Yöntem', 'Sipariş'],
                  rows: [['Kredi kartı', fmtInt(stats.payment.creditCard)], ['Banka kartı', fmtInt(stats.payment.debitCard)], ['Taksitli', fmtInt(stats.payment.installments)]],
                }}
              >
                <StackedBar
                  segments={[
                    { label: 'Kredi kartı', value: stats.payment.creditCard, color: VIZ.series[0] },
                    { label: 'Banka kartı', value: stats.payment.debitCard, color: VIZ.series[1] },
                  ]}
                />
              </ChartCard>

              <ChartCard
                title="Profiller"
                subtitle="TapTap'te kayıtlı kart profilleri"
                table={{
                  columns: ['Ay', 'Yeni profil'],
                  rows: stats.profiles.byMonth.map((m) => [m.label, fmtInt(m.count)]),
                }}
              >
                <StackedBar
                  segments={[
                    { label: 'Premium', value: stats.profiles.premium, color: VIZ.series[0] },
                    { label: 'IBAN', value: stats.profiles.iban, color: VIZ.series[1] },
                    { label: 'Google Yorum', value: stats.profiles.google, color: VIZ.series[2] },
                  ]}
                />
                {stats.profiles.byMonth.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs text-neutral-500 mb-1">Aylık yeni profil</p>
                    <ColumnChart
                      data={stats.profiles.byMonth.map((m) => ({ label: m.label, value: m.count }))}
                      format={fmtInt}
                      height={160}
                    />
                  </div>
                )}
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
