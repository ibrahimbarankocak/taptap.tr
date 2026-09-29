import { createHmac, timingSafeEqual } from 'crypto';

// Shopier REST API istemcisi — https://developer.shopier.com
const BASE_URL = 'https://api.shopier.com/v1';

export type ShopierOrder = {
  id: string;
  status: 'fulfilled' | 'unfulfilled';
  paymentStatus?: string;
  dateCreated: string;
  currency: string;
  paymentMethod?: string;
  installments?: boolean;
  note?: string;
  totals?: { subtotal?: string; shipping?: string; discount?: string; total?: string };
  shippingInfo?: Record<string, string>;
  billingInfo?: Record<string, string>;
  lineItems?: {
    productId: string;
    title: string;
    quantity: number;
    price: string;
    total: string;
    selection?: { title?: string; variationTitle?: string }[];
    options?: { title?: string }[];
  }[];
  fulfillments?: Record<string, unknown>[];
  refunds?: { type?: string; status?: string; total?: string }[];
};

async function shopierFetch(path: string, params: Record<string, string | number> = {}) {
  const token = process.env.SHOPIER_TOKEN;
  if (!token) throw new Error('SHOPIER_TOKEN tanımlı değil (.env / Vercel ortam değişkeni)');

  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Shopier API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

// Shopier tarih formatı: yyyy-MM-ddTHH:mm:ssZ
const shopierDate = (d: Date) => d.toISOString().slice(0, 19) + 'Z';

const WINDOW_DAYS = 60;
const PAGE_SIZE = 50;

// Verilen tarihten bugüne kadar tüm siparişleri 60 günlük pencereler ve sayfalar halinde çeker
export async function fetchAllOrders(since: Date, until = new Date()): Promise<ShopierOrder[]> {
  const all: ShopierOrder[] = [];
  let windowStart = since;

  while (windowStart < until) {
    const windowEnd = new Date(Math.min(windowStart.getTime() + WINDOW_DAYS * 86400000, until.getTime()));

    for (let page = 1; ; page++) {
      const data = await shopierFetch('/orders', {
        dateStart: shopierDate(windowStart),
        dateEnd: shopierDate(windowEnd),
        limit: PAGE_SIZE,
        page,
        sort: 'dateAsc',
      });
      const orders: ShopierOrder[] = Array.isArray(data) ? data : data?.data || data?.orders || [];
      all.push(...orders);
      if (orders.length < PAGE_SIZE) break;
    }

    windowStart = windowEnd;
  }

  // Pencere sınırında iki kez gelen siparişleri tekilleştir
  return [...new Map(all.map((o) => [o.id, o])).values()];
}

// Shopier-Signature: HS256 (HMAC-SHA256, anahtar = webhook token).
// Dokümanda kodlama net değil; JWT, hex ve base64 biçimlerinin hepsini kabul ediyoruz.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SHOPIER_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const safeEqual = (a: string, b: string) => {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  };

  const parts = signature.split('.');
  if (parts.length === 3) {
    const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    return safeEqual(expected, parts[2]);
  }

  const mac = createHmac('sha256', secret).update(rawBody);
  const digest = mac.digest();
  return (
    safeEqual(digest.toString('hex'), signature.toLowerCase()) ||
    safeEqual(digest.toString('base64'), signature) ||
    safeEqual(digest.toString('base64url'), signature)
  );
}
