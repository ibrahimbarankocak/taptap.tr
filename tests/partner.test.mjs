// Ortaklık (IBAN kartı sayımı) testleri — çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packSize, ibanUnitsForItem, countIbanCards, partnerSummary } from '../lib/partner.ts';

test('paket boyutu ürün adından', () => {
  assert.equal(packSize("3'lü IBAN Nfc Kartı"), 3);
  assert.equal(packSize('10&#039;lu IBAN Nfc Kartı'), 10);
  assert.equal(packSize("5'li IBAN Nfc Kartı"), 5);
  assert.equal(packSize("2'Li Google+Instagram"), 2);
  assert.equal(packSize('IBAN Nfc Kartı '), 1);
});

test('ürün adına göre IBAN kartı sayısı', () => {
  const e = {};
  assert.deepEqual(ibanUnitsForItem({ title: 'IBAN Nfc Kartı ', quantity: 2 }, e), { units: 2, source: 'product' });
  assert.deepEqual(ibanUnitsForItem({ title: "3'lü IBAN Nfc Kartı", quantity: 1 }, e), { units: 3, source: 'product' });
  assert.deepEqual(ibanUnitsForItem({ title: '10&#039;lu IBAN Nfc Kartı', quantity: 2 }, e), { units: 20, source: 'product' });
  assert.deepEqual(ibanUnitsForItem({ title: 'IBAN+Whatsapp Nfc Kartı - Avantaj Paket', quantity: 1 }, e), { units: 1, source: 'product' });
  assert.deepEqual(ibanUnitsForItem({ title: 'IBAN NFC Kartvizit (Cüzdan Boy)', quantity: 1 }, e), { units: 1, source: 'product' });
  assert.deepEqual(ibanUnitsForItem({ title: 'Google NFC Yorum Kartı', quantity: 3 }, e).units, 0);
});

test('genel paket: nottaki IBAN sayısı (paket boyutunu geçmez)', () => {
  assert.deepEqual(ibanUnitsForItem({ title: "3'Lü NFC Paketi - Avantaj Paketi", quantity: 1 }, { iban: 'TR..' }), { units: 1, source: 'note' });
  assert.deepEqual(ibanUnitsForItem({ title: "4'lü Nfc Paketi - Avantaj Paket", quantity: 1 }, { ibans: [1, 2, 3, 4, 5, 6] }), { units: 4, source: 'note' });
  assert.equal(ibanUnitsForItem({ title: "3'Lü NFC Paketi - Avantaj Paketi", quantity: 1 }, {}).units, 0);
  // Google+Instagram paketi IBAN içermez
  assert.equal(ibanUnitsForItem({ title: 'Google+Instagram NFC Kartı - Avantaj Paket', quantity: 1 }, { iban: 'TR..' }).units, 0);
});

test('toplam: iadeler hariç, aylık döküm', () => {
  const r = countIbanCards([
    { id: '1', date_created: '2026-08-10T10:00:00Z', refunded: false, line_items: [{ title: "3'lü IBAN Nfc Kartı", quantity: 1 }], extracted: {} },
    { id: '2', date_created: '2026-09-02T10:00:00Z', refunded: false, line_items: [{ title: 'IBAN Nfc Kartı ', quantity: 1 }, { title: 'Google NFC Yorum Kartı', quantity: 1 }], extracted: {} },
    { id: '3', date_created: '2026-09-03T10:00:00Z', refunded: true, line_items: [{ title: 'IBAN Nfc Kartı ', quantity: 5 }], extracted: {} },
    { id: '4', date_created: '2026-09-04T10:00:00Z', refunded: false, line_items: [{ title: "4'lü Nfc Paketi - Avantaj Paket", quantity: 1 }], extracted: { iban: 'TR..' } },
  ]);
  assert.equal(r.total, 5);
  assert.equal(r.fromNotes, 1);
  assert.deepEqual(r.byMonth, [{ month: '2026-08', units: 3 }, { month: '2026-09', units: 2 }]);
  assert.equal(r.rows[0].id, '4'); // en yeni önce
});

test('ödeme özeti: bekleyen kart ve tutar', () => {
  const s = partnerSummary(100, [{ cards: 30, amount: 2700 }, { cards: 20, amount: 1800 }], 90);
  assert.equal(s.earned, 9000);
  assert.equal(s.paidCards, 50);
  assert.equal(s.paidAmount, 4500);
  assert.equal(s.pendingCards, 50);
  assert.equal(s.pendingAmount, 4500);
  assert.equal(s.progress, 0.5);
  assert.equal(partnerSummary(10, [{ cards: 12, amount: 1080 }], 90).overpaidCards, 2);
});
