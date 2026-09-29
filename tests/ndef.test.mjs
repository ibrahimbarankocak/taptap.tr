// NFC hafıza hesabı testleri — çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ndefSize, smallestChip, fitSummary } from '../lib/ndef.ts';

test('https:// ön eki 1 bayta sıkışır', () => {
  // "https://a.co" -> yük = 1 + "a.co"(4) = 5; kayıt = 1+1+1+1+5 = 9; toplam = 1+1+9+1 = 12
  assert.equal(ndefSize('https://a.co'), 12);
  assert.equal(ndefSize('https://www.a.co'), 12); // "https://www." de tek bayt
});

test('Google yorum linki (normal Place ID) NTAG213e sığar', () => {
  const url = 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4';
  const s = fitSummary(url);
  assert.equal(s.chip, 'NTAG213');
  assert.ok(s.fitsSmallest);
  assert.ok(s.bytes < 144);
});

test('çok uzun link büyük çip ister', () => {
  const long = 'https://search.google.com/local/writereview?placeid=' + 'E'.repeat(120);
  const s = fitSummary(long);
  assert.equal(s.fitsSmallest, false);
  assert.equal(s.chip, 'NTAG215');
  assert.equal(smallestChip(2000), undefined);
});

test('kısa TapTap linki çok küçük', () => {
  assert.ok(ndefSize('https://taptap.tr/enesulu') < 30);
});
