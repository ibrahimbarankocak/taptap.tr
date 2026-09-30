'use client';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { StoreProduct } from '@/lib/storeParse';

const TABS = [
  { key: 'all', label: 'Tümü' },
  { key: 'paket', label: 'Avantaj Paketleri' },
  { key: 'iban', label: 'IBAN' },
  { key: 'google', label: 'Google Yorum' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'cuzdan', label: 'Cüzdan Boy' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// Ürün adından kategori: "+" içeren ya da "Paket" yazan ürünler paket
function categoryOf(title: string): Exclude<TabKey, 'cuzdan'> {
  const t = title.toLocaleLowerCase('tr');
  if (title.includes('+') || /paket/.test(t)) return 'paket';
  if (/iban/.test(t)) return 'iban';
  if (/google|yorum/.test(t)) return 'google';
  if (/[iı]nstagram/.test(t)) return 'instagram';
  if (/whatsapp/.test(t)) return 'whatsapp';
  return 'all';
}

export default function ProductGrid({ products, storeUrl }: { products: StoreProduct[]; storeUrl: string }) {
  const [tab, setTab] = useState<TabKey>('all');
  // "Cüzdan Boy" bir boyut filtresi: kategoriden bağımsız, adında Cüzdan geçen tüm ürünler
  const visible = products.filter((p) => tab === 'all' || (tab === 'cuzdan' ? /c[üu]zdan/i.test(p.title) : categoryOf(p.title) === tab));

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`press shrink-0 px-4 py-2 rounded-full text-sm font-semibold border cursor-pointer ${
              tab === t.key ? 'bg-white text-black border-white' : 'border-white/15 text-neutral-400 hover:text-white hover:border-white/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {visible.map((p, i) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-white/25 transition-colors animate-fade-up"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <div className="relative aspect-square overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element -- Shopier CDN görseli */}
              <img
                src={p.image}
                alt={p.title}
                loading="lazy"
                decoding="async"
                width={452}
                height={452}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {p.discount && (
                <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-full bg-orange-500 text-black text-[10px] sm:text-xs font-extrabold">
                  {p.discount}
                </span>
              )}
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-100 line-clamp-2 min-h-[2.5em]">{p.title}</h3>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  {p.oldPrice && <p className="text-[10px] sm:text-xs text-neutral-500 line-through">{p.oldPrice}</p>}
                  <p className="text-sm sm:text-lg font-bold text-white">{p.price}</p>
                </div>
                <span className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-black flex items-center justify-center transition-transform duration-300 group-hover:rotate-45">
                  <ArrowUpRight size={16} />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-10 text-center">
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/20 text-sm font-bold text-white hover:bg-white hover:text-black"
        >
          Tüm ürünler Shopier mağazamızda <ArrowUpRight size={16} />
        </a>
      </div>
    </div>
  );
}
