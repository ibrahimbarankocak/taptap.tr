import { unstable_cache } from 'next/cache';

// Tanıtım sayfası için Shopier mağazamızdaki ürünler. Shopier API anahtarımız ürün iznine sahip değil (403),
// bu yüzden kendi herkese açık mağaza sayfamızdan okunur. 1 saat önbellekte tutulur; okunamazsa boş liste
// döner ve sayfa "Tüm ürünler Shopier'da" butonuyla çalışmaya devam eder.

import { parseStoreHtml, STORE_URL, type StoreProduct } from '@/lib/storeParse';

export { STORE_URL, type StoreProduct };

export const getStoreProducts = unstable_cache(
  async (): Promise<StoreProduct[]> => {
    try {
      const res = await fetch(STORE_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TapTapSite/1.0)', 'Accept-Language': 'tr' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      return parseStoreHtml(await res.text());
    } catch {
      return [];
    }
  },
  ['shopier-store-products'],
  { revalidate: 3600 }
);
