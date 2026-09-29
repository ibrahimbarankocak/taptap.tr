// Shopier mağaza sayfası HTML'inden ürün listesi (saf fonksiyon, testlenebilir — import yok)

export const STORE_URL = 'https://www.shopier.com/TapTapTr';

export type StoreProduct = {
  id: string;
  title: string;
  url: string;
  image: string;
  price?: string; // "499,00 TL"
  oldPrice?: string;
  discount?: string; // "%15 İndirim"
  isNew: boolean;
};

const decode = (s: string) =>
  s
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();

export function parseStoreHtml(html: string): StoreProduct[] {
  const products: StoreProduct[] = [];
  const seen = new Set<string>();
  const re = /href="https:\/\/www\.shopier\.com\/TapTapTr\/(\d+)"\s+class="product-image-link-store/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    // bu kartın HTML'i: sonraki ürün linkine kadar
    const next = html.indexOf('product-image-link-store', m.index + m[0].length);
    const card = html.slice(m.index, next === -1 ? m.index + 6000 : next);
    const image = card.match(/<img\s[^>]*?src="([^"]+)"/)?.[1];
    const title = card.match(/<h3[^>]*>([^<]+)<\/h3>/)?.[1] ?? card.match(/<img\s[^>]*?alt="([^"]*)"/)?.[1];
    if (!image || !title || !/^https:\/\/cdn\.shopier\.app\//.test(image)) continue;
    products.push({
      id,
      title: decode(title),
      url: `${STORE_URL}/${id}`,
      image: image.replace('/pictures_mid/', '/pictures_large/'),
      price: card.match(/price-current[^>]*data-price="([^"]+)"/)?.[1],
      oldPrice: card.match(/price-old[^>]*data-price="([^"]+)"/)?.[1],
      discount: card.match(/badge-discount">([^<]+)</)?.[1]?.trim(),
      isNew: /class="badge">\s*Yeni\s*</.test(card),
    });
  }
  return products;
}
