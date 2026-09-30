// Stok / maliyet testleri — çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardsPerUnit, cardSize, colorOf, standsInOption, orderUsage, orderProfit, cleanSettings, monthlyReport, cardKey, STAND } from '../lib/inventory.ts';

test('ürün adından kart sayısı (gerçek Shopier ürün adları)', () => {
  assert.equal(cardsPerUnit('IBAN Nfc Kartı '), 1);
  assert.equal(cardsPerUnit("3&#039;Lü NFC Paketi - Avantaj Paketi"), 3);
  assert.equal(cardsPerUnit("4'lü Nfc Paketi - Avantaj Paket"), 4);
  assert.equal(cardsPerUnit('Google+Instagram NFC Kartı - Avantaj Paket'), 2);
  assert.equal(cardsPerUnit("Google Nfc Yorum+İnstagram Nfc Kartı (1'er Adet Ava"), 2);
  assert.equal(cardsPerUnit("Google+Instagram+Whatsapp NFC Kartı (1'er Adet Avan"), 3);
  assert.equal(cardsPerUnit("2'Li Google+Instagram NFC Kartı (2'şer Ade"), 4);
  assert.equal(cardsPerUnit("10'lu IBAN Nfc Kartı"), 10);
  assert.equal(cardsPerUnit("5'li Google NFC Yorum Kartı - (8x8 Kare)"), 5);
  assert.equal(cardsPerUnit("4'Lü NFC Kartvizit - Avantaj Paket (Cüzdan Boy)"), 4);
  assert.equal(cardsPerUnit('La Du De (20+20)'), 0);
});

test('boyut, renk, stand', () => {
  assert.equal(cardSize('IBAN NFC Kartvizit (Cüzdan Boy)'), 'cuzdan');
  assert.equal(cardSize('Whatsapp NFC Kartı (8x8 Kare)'), '8x8');
  assert.equal(cardSize('Google NFC Yorum Kartı'), '8x8');
  assert.equal(colorOf(['Beyaz']), 'beyaz');
  assert.equal(colorOf(['Siyah']), 'siyah');
  assert.equal(colorOf([]), undefined);
  assert.equal(colorOf([], 'white'), 'beyaz');
  assert.equal(colorOf(['Klasik Tasarım']), undefined);
  assert.equal(standsInOption('2 Adet Şeffaf Stand'), 2);
  assert.equal(standsInOption('Şeffaf Stand'), 1);
  assert.equal(standsInOption('3 Adet Şeffaf Stand&amp;amp;quot;'), 3);
  assert.equal(standsInOption('Hediye paketi'), 0);
});

test('sipariş stok kullanımı', () => {
  const u = orderUsage([
    { title: "3'Lü NFC Paketi - Avantaj Paketi", quantity: 1, selection: ['Siyah'], options: ['3 Adet Şeffaf Stand'] },
    { title: 'IBAN NFC Kartvizit (Cüzdan Boy)', quantity: 2, selection: ['Beyaz'], options: [] },
    { title: 'Google NFC Yorum Kartı', quantity: 1, selection: [], options: [] },
  ]);
  assert.deepEqual(u.items, { [cardKey('8x8', 'siyah')]: 3, [STAND]: 3, [cardKey('cuzdan', 'beyaz')]: 2 });
  assert.deepEqual(u.unknownColor, [{ size: '8x8', qty: 1 }]);
});

test('sipariş kârı: komisyon, kargo, malzeme, ortak payı', () => {
  const s = cleanSettings({
    commission_pct: '5', shipping: 60, packaging: '', unit_costs: { [cardKey('8x8', 'siyah')]: 40, [STAND]: 25, bogus: 1 }, low_stock: {},
  });
  assert.equal(s.packaging, undefined);
  assert.equal(s.unit_costs.bogus, undefined);
  const usage = { items: { [cardKey('8x8', 'siyah')]: 3, [STAND]: 3 }, unknownColor: [] };
  const p = orderProfit(1299, usage, 1, s, 90);
  assert.equal(p.commission, 64.95);
  assert.equal(p.material, 195);
  assert.equal(p.partner, 90);
  assert.equal(p.profit, 1299 - 64.95 - 60 - 195 - 90);
  assert.deepEqual(p.missing, []);
  // Girilmemiş giderler listelenir
  assert.deepEqual(orderProfit(499, { items: { [cardKey('cuzdan', 'beyaz')]: 1 }, unknownColor: [] }, 0, cleanSettings({}), 90).missing.length, 3);
});

test('aylık rapor Türkiye saatine göre gruplar', () => {
  const p = { revenue: 100, commission: 5, shipping: 10, packaging: 0, material: 20, partner: 0, profit: 65, missing: [] };
  const r = monthlyReport([{ date: '2026-08-31T22:30:00Z', p }, { date: '2026-09-15T10:00:00Z', p }]);
  assert.deepEqual(r.map((m) => [m.month, m.orders, m.profit]), [['2026-09', 2, 130]]);
});
