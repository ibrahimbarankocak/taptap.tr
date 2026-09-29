'use client';
import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Nfc, ScanLine, PenLine, Eraser, AlertTriangle, Check, X, Link2, MessageCircle,
  Phone, Mail, AtSign, UserSquare, Type, History,
} from 'lucide-react';
import { hasNfc, errorMessage, writeNfc, readNfc, wipeNfc, type NfcCardContent } from '@/lib/nfc';
import { normalizePhone } from '@/lib/parseOrderNote';
import CopyButton from '@/components/CopyButton';

type Mode = 'url' | 'whatsapp' | 'tel' | 'email' | 'instagram' | 'profile' | 'text';

const MODES: { key: Mode; label: string; icon: typeof Link2; placeholder: string }[] = [
  { key: 'url', label: 'Link', icon: Link2, placeholder: 'https://ornek.com' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: '0532 123 45 67' },
  { key: 'tel', label: 'Telefon', icon: Phone, placeholder: '0532 123 45 67' },
  { key: 'email', label: 'E-posta', icon: Mail, placeholder: 'info@ornek.com' },
  { key: 'instagram', label: 'Instagram', icon: AtSign, placeholder: '@kullaniciadi' },
  { key: 'profile', label: 'TapTap Profili', icon: UserSquare, placeholder: 'Müşteri ara...' },
  { key: 'text', label: 'Düz Metin', icon: Type, placeholder: 'Karta yazılacak metin' },
];

type Customer = { id: number; full_name: string; slug: string; card_type?: string };
type LogEntry = { time: string; ok: boolean; text: string };

// Seçilen moda göre karta yazılacak kaydı hesaplar
function buildPayload(mode: Mode, value: string, extra: string, origin: string):
  { type: 'url' | 'text'; data: string } | { error: string } | null {
  const v = value.trim();
  if (!v) return null;
  switch (mode) {
    case 'url': {
      const url = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
      try { new URL(url); } catch { return { error: 'Geçersiz link' }; }
      return { type: 'url', data: url };
    }
    case 'whatsapp': {
      const phone = normalizePhone(v) || (v.replace(/\D/g, '').length >= 10 ? v.replace(/\D/g, '') : '');
      if (!phone) return { error: 'Geçersiz telefon numarası' };
      const msg = extra.trim() ? `?text=${encodeURIComponent(extra.trim())}` : '';
      return { type: 'url', data: `https://wa.me/${phone}${msg}` };
    }
    case 'tel': {
      const digits = normalizePhone(v) || v.replace(/\D/g, '');
      if (digits.length < 7) return { error: 'Geçersiz telefon numarası' };
      return { type: 'url', data: `tel:+${digits}` };
    }
    case 'email':
      if (!/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(v)) return { error: 'Geçersiz e-posta' };
      return { type: 'url', data: `mailto:${v}` };
    case 'instagram': {
      const handle = v.match(/instagram\.com\/([\w.]+)/i)?.[1] || v.replace(/^@/, '');
      if (!/^[\w.]+$/.test(handle)) return { error: 'Geçersiz kullanıcı adı' };
      return { type: 'url', data: `https://instagram.com/${handle}` };
    }
    case 'profile':
      return { type: 'url', data: `${origin}/${v}` };
    case 'text':
      return { type: 'text', data: v };
  }
}

// Sunucuda false, tarayıcıda gerçek değer — hydration uyumsuzluğu olmadan
const useIsClient = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export default function NfcPage() {
  const isClient = useIsClient();
  const nfcSupported = isClient && hasNfc();
  const origin = isClient ? window.location.origin : '';

  const [busy, setBusy] = useState<'read' | 'write' | 'wipe' | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [card, setCard] = useState<NfcCardContent | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const [mode, setMode] = useState<Mode>('url');
  const [value, setValue] = useState('');
  const [extra, setExtra] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setCustomers(data))
      .catch(() => {});
  }, []);

  const payload = useMemo(() => buildPayload(mode, value, extra, origin), [mode, value, extra, origin]);
  const validPayload = payload && !('error' in payload) ? payload : null;

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => !q || c.full_name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, customerSearch]);

  const finish = (ok: boolean, text: string) => {
    setStatus({ ok, text });
    setLog((prev) => [{ time: new Date().toLocaleTimeString('tr-TR'), ok, text }, ...prev].slice(0, 20));
    setBusy(null);
  };

  const run = async (kind: 'read' | 'write' | 'wipe', action: () => Promise<string>) => {
    setBusy(kind);
    setStatus({ ok: true, text: 'Kartı telefonun arkasına yaklaştır ve sabit tut...' });
    try {
      finish(true, await action());
    } catch (e) {
      finish(false, errorMessage(e));
    }
  };

  const onRead = () =>
    run('read', async () => {
      const content = await readNfc();
      setCard(content);
      return content.records.length ? `Okundu: ${content.records.map((r) => r.value).join(' | ')}` : 'Okundu: kart boş';
    });

  const onWrite = () => {
    if (!validPayload) return;
    run('write', async () => {
      await writeNfc(validPayload.data, validPayload.type);
      return `Yazıldı: ${validPayload.data}`;
    });
  };

  const onWipe = () => {
    setConfirmWipe(false);
    run('wipe', async () => {
      await wipeNfc();
      setCard(null);
      return 'Kart silindi';
    });
  };

  // Okunan içeriği düzenlemek için yazma formuna aktar
  const editRecord = (r: { type: string; value: string }) => {
    setMode(r.type === 'text' ? 'text' : 'url');
    setValue(r.value);
    setExtra('');
  };

  const selectedMode = MODES.find((m) => m.key === mode)!;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 pb-4 border-b border-neutral-900">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Panele Dön
          </Link>
        </div>

        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 mb-6">
          <Nfc className="text-neutral-400" /> NFC Kart Yönetimi
        </h1>

        {isClient && !nfcSupported && (
          <div className="flex gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl p-4 mb-6 text-sm">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Bu tarayıcıda NFC kullanılamıyor.</p>
              <p className="text-amber-300/80 mt-1">
                Kart okuma/yazma sadece <b>Android telefonda Chrome</b> ile, <b>https</b> üzerinden ve telefonun NFC&apos;si açıkken çalışır.
                Linkleri burada hazırlayıp kopyalayabilirsin.
              </p>
            </div>
          </div>
        )}

        {/* Durum mesajı */}
        {status && (
          <div
            className={`flex items-start gap-2 rounded-2xl p-4 mb-6 text-sm border break-all ${
              busy
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : status.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {busy ? <Nfc size={18} className="shrink-0 animate-pulse" /> : status.ok ? <Check size={18} className="shrink-0" /> : <X size={18} className="shrink-0" />}
            {status.text}
          </div>
        )}

        {/* KARTI OKU */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold flex items-center gap-2"><ScanLine size={18} /> Kartı Oku</h2>
              <p className="text-xs text-neutral-500 mt-1">Kartta ne yazılı olduğunu gösterir.</p>
            </div>
            <button
              type="button"
              onClick={onRead}
              disabled={!nfcSupported || !!busy}
              className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {busy === 'read' ? 'Bekleniyor...' : 'Oku'}
            </button>
          </div>

          {card && (
            <div className="mt-4 bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
              <p className="text-[11px] text-neutral-500">Seri no: <span className="font-mono text-neutral-300">{card.serialNumber || '—'}</span></p>
              {card.records.length === 0 && <p className="text-sm text-neutral-400">Kart boş.</p>}
              {card.records.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-500 w-10 shrink-0">{r.type}</span>
                  <span className="text-sm font-mono text-white break-all flex-1 min-w-0">{r.value || '(boş)'}</span>
                  <CopyButton value={r.value} />
                  <button
                    type="button"
                    onClick={() => editRecord(r)}
                    className="px-2.5 py-2 rounded-lg border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer shrink-0"
                  >
                    Düzenle
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* KARTA YAZ */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-5">
          <h2 className="font-bold flex items-center gap-2"><PenLine size={18} /> Karta Yaz</h2>
          <p className="text-xs text-neutral-500 mt-1 mb-4">Karttaki mevcut içeriğin yerine yazılır.</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {MODES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMode(key); setValue(''); setExtra(''); }}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer ${
                  mode === key ? 'bg-white text-black border-white' : 'border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {mode === 'profile' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={selectedMode.placeholder}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setValue(c.slug)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-sm cursor-pointer ${
                      value === c.slug ? 'border-white bg-neutral-800' : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <span className="font-semibold truncate">{c.full_name}</span>
                    <span className="text-xs text-neutral-500 font-mono shrink-0">/{c.slug}{c.card_type === 'iban' ? ' · IBAN' : ''}</span>
                  </button>
                ))}
                {customers.length === 0 && <p className="text-xs text-neutral-500">Müşteri listesi yüklenemedi.</p>}
              </div>
            </div>
          ) : mode === 'text' ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              placeholder={selectedMode.placeholder}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 resize-none"
            />
          ) : (
            <input
              type={mode === 'email' ? 'email' : mode === 'whatsapp' || mode === 'tel' ? 'tel' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selectedMode.placeholder}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
            />
          )}

          {mode === 'whatsapp' && (
            <input
              type="text"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Hazır mesaj (opsiyonel), örn: Merhaba, bilgi almak istiyorum"
              className="w-full mt-2 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600"
            />
          )}

          {/* Önizleme */}
          <div className="mt-4 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Karta yazılacak</span>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-sm font-mono break-all flex-1 min-w-0 ${payload && 'error' in payload ? 'text-red-400' : 'text-white'}`}>
                {!payload ? '—' : 'error' in payload ? payload.error : payload.data}
              </p>
              <CopyButton value={validPayload?.data} />
            </div>
          </div>

          <button
            type="button"
            onClick={onWrite}
            disabled={!nfcSupported || !validPayload || !!busy}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <Nfc size={18} /> {busy === 'write' ? 'Kartı yaklaştır...' : 'Karta Yaz'}
          </button>
        </section>

        {/* KARTI SİL */}
        <section className="bg-neutral-900 border border-red-500/20 rounded-3xl p-5 mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold flex items-center gap-2 text-red-300"><Eraser size={18} /> Kartı Sil</h2>
              <p className="text-xs text-neutral-500 mt-1">Karttaki tüm içeriği siler. Kart tekrar yazılabilir kalır.</p>
            </div>
            {!confirmWipe && (
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                disabled={!nfcSupported || !!busy}
                className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-300 text-sm font-bold hover:bg-red-500/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {busy === 'wipe' ? 'Kartı yaklaştır...' : 'Sil'}
              </button>
            )}
          </div>
          {confirmWipe && (
            <div className="mt-4 flex flex-wrap items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-sm text-red-200 flex-1 min-w-[12rem]">Karttaki içerik geri alınamaz şekilde silinecek. Emin misin?</p>
              <button type="button" onClick={onWipe} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-400 cursor-pointer">
                Evet, sil
              </button>
              <button type="button" onClick={() => setConfirmWipe(false)} className="px-4 py-2 rounded-lg border border-neutral-700 text-sm text-neutral-300 cursor-pointer">
                Vazgeç
              </button>
            </div>
          )}
        </section>

        {/* İŞLEM GEÇMİŞİ (bu oturum) */}
        {log.length > 0 && (
          <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <h2 className="font-bold flex items-center gap-2 mb-3"><History size={18} /> Son İşlemler</h2>
            <ul className="space-y-1.5">
              {log.map((l, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className="text-neutral-500 font-mono shrink-0">{l.time}</span>
                  <span className={`break-all ${l.ok ? 'text-neutral-300' : 'text-red-400'}`}>{l.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
