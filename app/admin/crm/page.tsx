'use client';
import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, ShoppingBag, Users, Package, Nfc, Search,
  AlertTriangle, ChevronDown, ChevronUp, UserPlus, ExternalLink, Save, MessageCircle, Wand2,
} from 'lucide-react';
import {
  CARD_TYPE_LABELS, cardLinkFor, parseOrderNote, type CardType, type ExtractedFields, type IbanEntry,
} from '@/lib/parseOrderNote';
import type { CrmOrder } from '@/lib/crm';
import { hasNfc, errorMessage, writeNfc, readNfc } from '@/lib/nfc';
import CopyButton from '@/components/CopyButton';
import GoogleFinder from '@/components/GoogleFinder';
import { fitSummary } from '@/lib/ndef';
import { safeHref } from '@/lib/validate';

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  ready: 'Hazır',
  written: 'Karta Yazıldı',
  shipped: 'Kargolandı',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  ready: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  written: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  shipped: 'bg-neutral-500/10 text-neutral-400 border-neutral-600',
};

// Düzenlenebilir metin alanları (sipariş notundan ayıklanan)
const FIELD_LABELS: [TextKey, string][] = [
  ['full_name', 'Ad Soyad'],
  ['business_name', 'İşletme Adı'],
  ['account_holder', 'Hesap Sahibi'],
  ['job_title', 'Unvan'],
  ['phone', 'Telefon (WhatsApp)'],
  ['iban', 'IBAN'],
  ['bank', 'Banka'],
  ['google_name', 'Google İşletme Adı'],
  ['instagram', 'Instagram'],
  ['email', 'E-posta'],
  ['website', 'Web Sitesi'],
];
type TextKey = 'full_name' | 'business_name' | 'account_holder' | 'job_title' | 'phone' | 'iban' | 'bank' | 'google_name' | 'instagram' | 'email' | 'website';

const money = (n: number, currency = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(n);

const date = (s: string) =>
  s ? new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';

const TYPE_STYLES: Record<string, string> = {
  iban: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  google: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  whatsapp: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  premium: 'bg-neutral-700/40 text-neutral-200 border-neutral-600',
  other: 'bg-neutral-800 text-neutral-400 border-neutral-700',
};

// Tek bir kartın linki: boyut rozeti + Karta Yaz / Kopyala / Aç
function CardLinkRow({ link, onWritten, emptyText }: { link?: string; onWritten?: () => void; emptyText: string }) {
  const [msg, setMsg] = useState('');
  const size = link ? fitSummary(link) : null;
  const write = async () => {
    if (!link) return;
    try {
      setMsg('Kartı telefonun arkasına yaklaştır...');
      await writeNfc(link);
      setMsg('Karta yazıldı ✓');
      onWritten?.();
    } catch (e) {
      setMsg(`Yazılamadı: ${errorMessage(e)}`);
    }
  };
  const read = async () => {
    try {
      setMsg('Okumak için kartı yaklaştır...');
      const { records } = await readNfc();
      const contents = records.map((r) => r.value);
      setMsg(!contents.length ? 'Kart boş' : `Kartta: ${contents.join(' | ')}${link && contents.includes(link) ? ' ✓ doğru link' : ' ✗ farklı link'}`);
    } catch (e) {
      setMsg(`Okunamadı: ${errorMessage(e)}`);
    }
  };
  if (!link) return <p className="text-xs text-neutral-500">{emptyText}</p>;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-mono text-white break-all flex-1 min-w-[10rem]">{link}</p>
        {size && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${size.fitsSmallest ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : 'text-amber-300 border-amber-500/40 bg-amber-500/10'}`}
            title="NFC kart hafızası: NTAG213 = 144 bayt (en yaygın), NTAG215 = 504, NTAG216 = 888"
          >
            {size.label}
          </span>
        )}
      </div>
      {size && !size.fitsSmallest && (
        <p className="text-[11px] text-amber-300">
          Link standart karta (NTAG213) sığmıyor. Daha büyük hafızalı kart kullan ya da kısa TapTap linki yaz (Google Yorum Kartları sayfası).
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {hasNfc() && (
          <>
            <button type="button" onClick={write} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 cursor-pointer">
              <Nfc size={14} /> Karta Yaz
            </button>
            <button type="button" onClick={read} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer">
              <Nfc size={14} /> Oku
            </button>
          </>
        )}
        <CopyButton value={link} label="Kopyala" />
        {safeHref(link) && (
          <a href={safeHref(link)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-white">
            <ExternalLink size={14} /> Aç
          </a>
        )}
      </div>
      {msg && <p className="text-xs text-neutral-300">{msg}</p>}
    </div>
  );
}

function OrderCard({ order, onSaved }: { order: CrmOrder; onSaved: (o: Partial<CrmOrder>) => void }) {
  const [fields, setFields] = useState<ExtractedFields>(order.extracted);
  const [cardType, setCardType] = useState(order.card_type as CardType);
  const [open, setOpen] = useState(order.status === 'new');
  const [saving, setSaving] = useState(false);
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => '');

  const cardTypes: CardType[] = fields.card_types?.length ? fields.card_types : [cardType];
  const dirty = JSON.stringify(fields) !== JSON.stringify(order.extracted) || cardType !== order.card_type;
  const profileUrl = (slug?: string | null) => (slug && origin ? `${origin}/${slug}` : undefined);
  const ibanEntries: IbanEntry[] = fields.ibans?.length
    ? fields.ibans
    : fields.iban
      ? [{ iban: fields.iban, valid: true, holder: fields.account_holder, bank: fields.bank, theme: fields.theme, slug: order.customer_slug ?? undefined, customer_id: order.customer_id ?? undefined }]
      : [];

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/crm/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Kaydedilemedi');
    onSaved(body as Partial<CrmOrder>);
  };

  const save = async () => {
    setSaving(true);
    try {
      await patch({ extracted: fields, card_type: cardType });
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const markWritten = () => {
    if (cardTypes.length === 1 && ibanEntries.length <= 1) patch({ status: 'written' }).catch(() => {});
  };

  const setField = (key: keyof ExtractedFields, value: unknown) => setFields((f) => ({ ...f, [key]: value || undefined }));

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Başlık satırı */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-neutral-800/40 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="font-bold text-sm text-white truncate mr-1">{order.buyer_name || 'İsimsiz'}</span>
            {cardTypes.map((t) => (
              <span key={t} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${TYPE_STYLES[t]}`}>
                {CARD_TYPE_LABELS[t] || t}
              </span>
            ))}
            {ibanEntries.length > 1 && <span className="text-[10px] font-bold text-orange-300">×{ibanEntries.length} IBAN</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLES[order.status]}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
            {order.warnings.some((w) => !w.startsWith('Kontrol et') && !w.startsWith('Bu siparişte')) && <AlertTriangle size={14} className="text-amber-400" />}
            {order.refunded && <span className="text-[10px] font-bold text-red-400">İADE</span>}
          </div>
          <p className="text-xs text-neutral-500 truncate">
            #{order.id} · {date(order.date_created)} · {order.line_items.map((li) => `${li.title} ×${li.quantity}`).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold text-neutral-200">{money(order.total, order.currency)}</span>
          {open ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-800 p-4 space-y-4">
          {/* Sipariş notu */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Sipariş Notu</span>
              <CopyButton value={order.note} />
            </div>
            <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words">{order.note || '—'}</p>
          </div>

          {order.warnings.length > 0 && (
            <ul className="text-xs space-y-1">
              {order.warnings.map((w) => (
                <li key={w} className={`flex items-center gap-1.5 ${w.startsWith('Kontrol et') || w.startsWith('Bu siparişte') ? 'text-sky-300' : 'text-amber-400'}`}>
                  <AlertTriangle size={12} /> {w}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400">Ana kart tipi:</span>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value as CardType)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-neutral-600"
            >
              {Object.entries(CARD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button
              type="button"
              onClick={() => {
                // Notu güncel okuyucuyla baştan oku (seçilen Google yorum linki ve oluşturulan profiller korunur)
                const r = parseOrderNote(order.note, { productTitles: order.line_items.map((li) => li.title), buyerName: order.buyer_name });
                const ibans = r.fields.ibans?.map((e, i) => ({ ...e, customer_id: fields.ibans?.[i]?.customer_id, slug: fields.ibans?.[i]?.slug }));
                setFields({ ...r.fields, ...(ibans ? { ibans } : {}), google_review: fields.google_review ?? r.fields.google_review, card_link: fields.card_link });
                setCardType(r.card_type);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              title="Notu yeniden oku (kaydetmeden önce kontrol edebilirsin)"
            >
              <Wand2 size={13} /> Notu yeniden oku
            </button>
          </div>

          {/* Ayıklanan bilgiler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELD_LABELS.map(([key, label]) => (
              <div key={key}>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fields[key] || ''}
                    onChange={(e) => setField(key, e.target.value)}
                    className={`w-full min-w-0 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600 ${key === 'iban' ? 'font-mono' : ''}`}
                  />
                  <CopyButton value={fields[key]} />
                </div>
              </div>
            ))}
          </div>

          {/* Kartlar: siparişteki her kart için ayrı link ve Karta Yaz */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Kartlar ({cardTypes.length + Math.max(0, ibanEntries.length - 1)})</p>
            {cardTypes.map((t) => (
              <div key={t} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-3">
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${TYPE_STYLES[t]}`}>{CARD_TYPE_LABELS[t]}</span>

                {t === 'google' && (
                  <>
                    <GoogleFinder
                      initialName={fields.google_name || fields.business_name || ''}
                      initialLink={fields.google_link || ''}
                      selected={fields.google_review}
                      onPick={(url) => setField('google_review', url)}
                    />
                    {!fields.google_review && fields.google_link && (
                      <p className="text-[11px] text-amber-300">Müşterinin linki ({fields.google_link}) Haritalar sayfasını açar, yorum ekranını değil. Yukarıdan işletmeyi bulup seç.</p>
                    )}
                    <CardLinkRow link={fields.google_review} onWritten={markWritten} emptyText="Yorum linki henüz seçilmedi." />
                  </>
                )}

                {t === 'iban' && ibanEntries.length > 1 && ibanEntries.every((e) => !e.slug) && (
                  <Link
                    href={`/admin/customers/new?fromOrder=${encodeURIComponent(order.id)}&iban=all`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-500/50 text-orange-300 text-xs font-bold hover:bg-orange-500/10"
                    title="Tüm IBAN'ları tek bir kartta göster (her IBAN kendi hesap sahibiyle)"
                  >
                    <UserPlus size={14} /> Hepsini tek kartta oluştur ({ibanEntries.length} IBAN)
                  </Link>
                )}
                {t === 'iban' &&
                  (ibanEntries.length ? (
                    ibanEntries.map((e, i) => {
                      const url = profileUrl(e.slug);
                      return (
                        <div key={i} className={`space-y-2 ${i > 0 ? 'pt-3 border-t border-neutral-800' : ''}`}>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {ibanEntries.length > 1 && <span className="font-bold text-orange-300">{i + 1}.</span>}
                            <span className="font-mono text-neutral-200">{e.iban}</span>
                            {!e.valid && <span className="text-red-400 font-semibold">hatalı IBAN</span>}
                            {e.bank && <span className="text-neutral-500">{e.bank}</span>}
                            <span className="text-neutral-300">· {e.holder || 'hesap sahibi yok'}</span>
                            {e.theme && (
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${e.theme === 'white' ? 'bg-white text-black border-white' : 'bg-black text-white border-neutral-600'}`}>
                                {e.theme === 'white' ? 'BEYAZ' : 'SİYAH'}
                              </span>
                            )}
                          </div>
                          {url ? (
                            <CardLinkRow link={url} onWritten={markWritten} emptyText="" />
                          ) : (
                            <Link
                              href={`/admin/customers/new?fromOrder=${encodeURIComponent(order.id)}&iban=${i}`}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 text-black text-xs font-bold hover:bg-orange-400"
                            >
                              <UserPlus size={14} /> Profil Oluştur
                            </Link>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-neutral-500">Notta IBAN yok — bilgileri yukarıya elle gir.</p>
                  ))}

                {t === 'premium' &&
                  (profileUrl(order.customer_slug) ? (
                    <CardLinkRow link={profileUrl(order.customer_slug)} onWritten={markWritten} emptyText="" />
                  ) : (
                    <Link href={`/admin/customers/new?fromOrder=${encodeURIComponent(order.id)}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 text-black text-xs font-bold hover:bg-orange-400">
                      <UserPlus size={14} /> Profil Oluştur
                    </Link>
                  ))}

                {t === 'whatsapp' && fields.phones && fields.phones.length > 1 ? (
                  // Pakette birden çok numara: her kart için ayrı link
                  <div className="space-y-2">
                    {fields.phones.map((ph, i) => (
                      <div key={ph}>
                        <p className="text-[11px] text-neutral-500 mb-1">{i + 1}. kart · +{ph}</p>
                        <CardLinkRow link={cardLinkFor('whatsapp', { ...fields, phone: ph, whatsapp_link: undefined })} onWritten={markWritten} emptyText="" />
                      </div>
                    ))}
                  </div>
                ) : (t === 'instagram' || t === 'whatsapp' || t === 'other') && (
                  <CardLinkRow
                    link={cardLinkFor(t, fields)}
                    onWritten={markWritten}
                    emptyText={t === 'instagram' ? 'Instagram kullanıcı adı yok — yukarıya gir.' : t === 'whatsapp' ? 'Telefon yok — yukarıya gir.' : 'Link yok.'}
                  />
                )}
              </div>
            ))}
            {order.customer_id && (
              <Link href={`/admin/customers/edit/${order.customer_id}`} className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-white">
                Profili Düzenle
              </Link>
            )}
            {!hasNfc() && <p className="text-[11px] text-neutral-600">Karta Yaz / Oku butonları sadece Android Chrome&apos;da (https) görünür.</p>}
          </div>

          {dirty && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 disabled:opacity-50 cursor-pointer"
            >
              <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          )}

          {/* Alıcı bilgileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-400">
            <div className="flex items-center gap-2">Tel: <span className="text-neutral-200">{order.buyer_phone || '—'}</span> <CopyButton value={order.buyer_phone} /></div>
            <div className="flex items-center gap-2 min-w-0">E-posta: <span className="text-neutral-200 truncate">{order.buyer_email || '—'}</span></div>
            <div className="sm:col-span-2">Adres: <span className="text-neutral-200">{order.address || '—'}</span></div>
            {order.line_items.map((li, i) => (
              <div key={i} className="sm:col-span-2">
                {li.title} ×{li.quantity}{li.variant ? ` (${li.variant})` : ''} — {money(li.total, order.currency)}
              </div>
            ))}
          </div>

          {/* Durum */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800">
            <span className="text-xs text-neutral-400">Durum:</span>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => patch({ status: k }).catch((e) => alert(errorMessage(e)))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer ${
                  order.status === k ? STATUS_STYLES[k] : 'border-neutral-800 text-neutral-500 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Siparişteki tüm kart tipleri (paketler)
const typesOf = (o: CrmOrder): CardType[] => (o.extracted.card_types?.length ? o.extracted.card_types : [o.card_type as CardType]);


export default function CrmPage() {
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [since, setSince] = useState('');
  const [tab, setTab] = useState<'orders' | 'customers' | 'products'>('orders');
  const [typeFilter, setTypeFilter] = useState<'all' | CardType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/crm/orders');
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/crm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(since ? { since } : {}),
      });
      const data = await res.json();
      setSyncMsg(data.success ? `${data.count} sipariş senkronize edildi` : `Hata: ${data.error}`);
      await load();
    } catch {
      setSyncMsg('Sunucuya ulaşılamadı');
    } finally {
      setSyncing(false);
    }
  };

  // Toplu yeniden okuma: iki adımlı onay (tarayıcı confirm() kullanılmıyor)
  const [reparseAsk, setReparseAsk] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const reparse = async () => {
    setReparseAsk(false);
    setReparsing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/crm/reparse', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(data.success ? `${data.checked} sipariş kontrol edildi, ${data.changed} tanesi güncellendi` : `Hata: ${data.error}`);
      await load();
    } catch {
      setSyncMsg('Sunucuya ulaşılamadı');
    } finally {
      setReparsing(false);
    }
  };

  const updateOrder = (id: string, changes: Partial<CrmOrder>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...changes } : o)));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) =>
      (typeFilter === 'all' || typesOf(o).includes(typeFilter)) &&
      (statusFilter === 'all' || o.status === statusFilter) &&
      (!q || [o.id, o.buyer_name, o.buyer_phone, o.note, JSON.stringify(o.extracted)].join(' ').toLowerCase().includes(q))
    );
  }, [orders, typeFilter, statusFilter, search]);

  // Shopier'da müşteri uç noktası yok — siparişlerden telefon/e-posta ile gruplayarak çıkarıyoruz
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email: string; city: string; orders: number; spent: number; last: string }>();
    for (const o of orders) {
      const key = o.buyer_phone || o.buyer_email || o.buyer_name;
      const c = map.get(key) || { name: o.buyer_name, phone: o.buyer_phone, email: o.buyer_email, city: o.city, orders: 0, spent: 0, last: '' };
      c.orders += 1;
      c.spent += o.total;
      if (o.date_created > c.last) c.last = o.date_created;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  }, [orders]);

  const products = useMemo(() => {
    const map = new Map<string, { title: string; qty: number; revenue: number; orders: number }>();
    for (const o of orders) {
      for (const li of o.line_items) {
        const p = map.get(li.title) || { title: li.title, qty: 0, revenue: 0, orders: 0 };
        p.qty += li.quantity;
        p.revenue += li.total;
        p.orders += 1;
        map.set(li.title, p);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [orders]);

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const maxQty = Math.max(1, ...products.map((p) => p.qty));
  const typeCounts = (t: 'all' | CardType) => (t === 'all' ? orders.length : orders.filter((o) => typesOf(o).includes(t)).length);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 pb-4 border-b border-neutral-900">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Panele Dön
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingBag className="text-neutral-400" /> CRM · Shopier Siparişleri
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {orders.length} sipariş · {customers.length} müşteri · {money(totalRevenue)} ciro
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">Başlangıç (opsiyonel)</label>
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
              />
            </div>
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Senkronize ediliyor...' : "Shopier'dan Çek"}
            </button>
            <button
              type="button"
              onClick={() => setReparseAsk((v) => !v)}
              disabled={reparsing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-700 text-sm font-semibold text-neutral-300 hover:text-white hover:border-neutral-500 disabled:opacity-50 cursor-pointer"
            >
              <Wand2 size={16} className={reparsing ? 'animate-pulse' : ''} />
              {reparsing ? 'Okunuyor...' : 'Notları Yeniden Oku'}
            </button>
          </div>
        </div>
        {reparseAsk && (
          <div className="mb-4 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 text-sm text-neutral-300">
            <p>
              Durumu <b>Yeni</b> olan, profili oluşturulmamış ve kart bilgisi elle kaydedilmemiş siparişlerin notları güncel okuyucuyla
              tekrar okunur. Seçtiğin Google yorum linkleri korunur. Elle düzeltip kaydettiğin siparişlere dokunulmaz.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={reparse} className="px-4 py-2 rounded-lg bg-orange-500 text-black text-sm font-bold hover:bg-orange-400 cursor-pointer">
                Evet, yeniden oku
              </button>
              <button type="button" onClick={() => setReparseAsk(false)} className="px-4 py-2 rounded-lg border border-neutral-700 text-sm text-neutral-400 hover:text-white cursor-pointer">
                Vazgeç
              </button>
            </div>
          </div>
        )}
        {syncMsg && <p className="text-sm text-neutral-300 mb-4">{syncMsg}</p>}

        {/* Ana sekmeler */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {([
            ['orders', 'Siparişler', ShoppingBag],
            ['customers', 'Müşteriler', Users],
            ['products', 'Ürünler', Package],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer whitespace-nowrap ${
                tab === key ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-neutral-500 text-sm">Yükleniyor...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-3xl">
            <p className="text-neutral-400">Henüz sipariş yok.</p>
            <p className="text-neutral-600 text-sm mt-1">&quot;Shopier&apos;dan Çek&quot; ile siparişleri getir.</p>
          </div>
        ) : tab === 'orders' ? (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {(['all', ...Object.keys(CARD_TYPE_LABELS)] as ('all' | CardType)[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer ${
                    typeFilter === t ? 'bg-white text-black border-white' : 'border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Tümü' : CARD_TYPE_LABELS[t]} ({typeCounts(t)})
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="İsim, telefon, not, sipariş no ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-neutral-600"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="all">Tüm durumlar</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              {filtered.map((o) => (
                <OrderCard key={o.id} order={o} onSaved={(changes) => updateOrder(o.id, changes)} />
              ))}
              {filtered.length === 0 && <p className="text-neutral-500 text-sm">Filtreye uyan sipariş yok.</p>}
            </div>
          </>
        ) : tab === 'customers' ? (
          <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="text-left p-3">Müşteri</th>
                  <th className="text-left p-3">Telefon</th>
                  <th className="text-left p-3">Şehir</th>
                  <th className="text-right p-3">Sipariş</th>
                  <th className="text-right p-3">Toplam</th>
                  <th className="text-right p-3">Son Sipariş</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i} className="border-b border-neutral-800/60 last:border-0">
                    <td className="p-3">
                      <div className="font-semibold text-neutral-200">{c.name || '—'}</div>
                      <div className="text-xs text-neutral-500">{c.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-300 whitespace-nowrap">{c.phone || '—'}</span>
                        <CopyButton value={c.phone} />
                        {c.phone && (
                          <a
                            href={`https://wa.me/${c.phone.replace(/\D/g, '').replace(/^0/, '90')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg border border-neutral-800 text-emerald-400 hover:border-emerald-500/40"
                            title="WhatsApp'tan yaz"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-neutral-400">{c.city}</td>
                    <td className="p-3 text-right text-neutral-200">{c.orders}</td>
                    <td className="p-3 text-right font-semibold text-neutral-100 whitespace-nowrap">{money(c.spent)}</td>
                    <td className="p-3 text-right text-neutral-400 whitespace-nowrap">{date(c.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
            {products.map((p) => (
              <div key={p.title}>
                <div className="flex justify-between gap-4 text-sm mb-1.5">
                  <span className="font-semibold text-neutral-200 truncate">{p.title}</span>
                  <span className="text-neutral-400 whitespace-nowrap">
                    <b className="text-white">{p.qty}</b> adet · {money(p.revenue)} · %{totalRevenue ? Math.round((p.revenue / totalRevenue) * 100) : 0}
                  </span>
                </div>
                <div className="h-2 bg-neutral-950 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
