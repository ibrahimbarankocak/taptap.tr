// İstatistik hesaplama testleri — çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../lib/stats.ts';

const order = (o) => ({
  date_created: '2026-09-01T10:00:00Z', total: 100, buyer_name: 'A', buyer_phone: '905321111111', buyer_email: '',
  city: 'İstanbul', card_type: 'whatsapp', status: 'new', refunded: false, warnings: [],
  payment_method: 'creditCard', installments: false, line_items: [{ title: 'WhatsApp Kart', quantity: 1, total: 100 }], ...o,
});
const NOW = new Date('2026-09-29T12:00:00Z');

test('özet: ciro, ortalama, adet, tekrar eden müşteri', () => {
  const s = computeStats([
    order({ total: 100 }),
    order({ total: 300, line_items: [{ title: 'IBAN Kart', quantity: 2, total: 300 }], card_type: 'iban' }),
    order({ total: 200, buyer_phone: '905322222222' }),
  ], [], null, NOW).summary;
  assert.equal(s.revenue, 600);
  assert.equal(s.orders, 3);
  assert.equal(s.avgOrder, 200);
  assert.equal(s.units, 4);
  assert.equal(s.buyers, 2);
  assert.equal(s.repeatBuyers, 1);
  assert.equal(s.repeatRate, 0.5);
});

test('tarih aralığı eski siparişleri dışarıda bırakır', () => {
  const orders = [order({ date_created: '2026-09-20T10:00:00Z' }), order({ date_created: '2026-01-05T10:00:00Z' })];
  assert.equal(computeStats(orders, [], 30, NOW).summary.orders, 1);
  assert.equal(computeStats(orders, [], null, NOW).summary.orders, 2);
});

test('aylar boşluksuz doldurulur', () => {
  const s = computeStats([order({ date_created: '2026-06-10T10:00:00Z' }), order({ date_created: '2026-09-10T10:00:00Z' })], [], null, NOW);
  assert.deepEqual(s.byMonth.map((m) => m.key), ['2026-06', '2026-07', '2026-08', '2026-09']);
  assert.deepEqual(s.byMonth.map((m) => m.orders), [1, 0, 0, 1]);
  assert.equal(s.byMonth[0].label, 'Haz 26');
});

test('kart tipi, ürün, şehir ve durum dağılımı', () => {
  const s = computeStats([
    order({ card_type: 'iban', total: 500, city: 'Ankara', status: 'written' }),
    order({ card_type: 'whatsapp', total: 100 }),
    order({ card_type: 'whatsapp', total: 100, city: '' }),
  ], [], null, NOW);
  assert.equal(s.byCardType[0].key, 'iban');
  assert.equal(s.byCardType[1].orders, 2);
  assert.equal(s.topProducts[0].qty, 3);
  assert.deepEqual(s.topCities.map((c) => c.city).sort(), ['Ankara', 'Bilinmiyor', 'İstanbul']);
  assert.deepEqual(s.status.map((x) => x.count), [2, 0, 1, 0]);
});

test('haftanın günü Pazartesi başlar', () => {
  // 2026-09-28 Pazartesi, 2026-09-27 Pazar
  const s = computeStats([order({ date_created: '2026-09-28T10:00:00Z' }), order({ date_created: '2026-09-27T10:00:00Z' })], [], null, NOW);
  assert.equal(s.weekday[0].label, 'Pzt');
  assert.equal(s.weekday[0].orders, 1);
  assert.equal(s.weekday[6].orders, 1);
});

test('ilgi bekleyen: uyarılı ve yeni olanlar; iadeler sayılır', () => {
  const s = computeStats([
    order({ warnings: ['Notta IBAN bulunamadı'] }),
    order({ warnings: ['x'], status: 'written' }),
    order({ refunded: true }),
  ], [], null, NOW).summary;
  assert.equal(s.needsAttention, 1);
  assert.equal(s.refunded, 1);
});

test('profiller: tip ve SQLite tarih formatı', () => {
  const p = computeStats([], [
    { card_type: 'iban', created_at: '2026-08-01 10:00:00' },
    { card_type: 'premium', created_at: '2026-09-02 10:00:00' },
    { card_type: null, created_at: null },
  ], null, NOW).profiles;
  assert.equal(p.total, 3);
  assert.equal(p.iban, 1);
  assert.equal(p.premium, 2);
  assert.deepEqual(p.byMonth.map((m) => m.count), [1, 1]);
});

test('boş veri çökmez', () => {
  const s = computeStats([], [], 30, NOW);
  assert.equal(s.summary.avgOrder, 0);
  assert.deepEqual(s.byMonth, []);
});

test('bugün: Türkiye saatine göre gün sınırı ve dünle karşılaştırma', () => {
  // Şimdi: 29 Eylül 12:00 UTC = 15:00 TR
  const s = computeStats([
    order({ date_created: '2026-09-28T22:30:00Z', total: 100 }), // TR 29 Eyl 01:30 -> bugün
    order({ date_created: '2026-09-29T11:00:00Z', total: 200 }), // TR 14:00 -> bugün
    order({ date_created: '2026-09-28T20:00:00Z', total: 50 }),  // TR 28 Eyl 23:00 -> dün (saat 15:00'ten sonra)
    order({ date_created: '2026-09-28T08:00:00Z', total: 70 }),  // TR 28 Eyl 11:00 -> dün, bu saatten önce
  ], [{ card_type: 'google', created_at: '2026-09-29 06:00:00' }], 30, NOW);
  assert.equal(s.today.date, '2026-09-29');
  assert.equal(s.today.orders, 2);
  assert.equal(s.today.revenue, 300);
  assert.equal(s.today.yesterday.orders, 2);
  assert.equal(s.today.yesterdaySoFar.orders, 1);
  assert.equal(s.today.yesterdaySoFar.revenue, 70);
  assert.equal(s.today.byHour.length, 16); // 00..15
  assert.equal(s.today.byHour[1].orders, 1);
  assert.equal(s.today.byHour[14].orders, 1);
  assert.equal(s.today.latest[0].time, '14:00');
  assert.equal(s.today.newProfiles, 1);
  assert.equal(s.profiles.google, 1);
});

test("aralık 'today' sadece bugünün siparişlerini sayar", () => {
  const s = computeStats([order({ date_created: '2026-09-28T22:30:00Z' }), order({ date_created: '2026-09-28T20:00:00Z' })], [], 'today', NOW);
  assert.equal(s.summary.orders, 1);
});
