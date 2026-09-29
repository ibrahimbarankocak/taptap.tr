// Sipariş notu ayrıştırıcı testleri — çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOrderNote, detectCardType, normalizePhone, isValidIban, formatIban, defaultCardLink, slugify,
} from '../lib/parseOrderNote.ts';

const VALID_IBAN = 'TR330006100519786457841326';

test('kart tipi önce ürün adından, sonra nottan', () => {
  assert.equal(detectCardType(['WhatsApp NFC Kart'], ''), 'whatsapp');
  assert.equal(detectCardType(['IBAN Kartı'], 'whatsapp'), 'iban');
  assert.equal(detectCardType(['Premium Dijital Kartvizit'], ''), 'premium');
  assert.equal(detectCardType(['Google Yorum Kartı'], ''), 'google');
  assert.equal(detectCardType(['NFC Kart'], 'iban: TR..'), 'iban');
  assert.equal(detectCardType(['NFC Kart'], 'merhaba'), 'other');
});

test('telefon farklı yazımlarda normalize edilir', () => {
  for (const p of ['0532 123 45 67', '05321234567', '5321234567', '+90 532 123 45 67', '+90 (532) 123-45-67', '90 532 1234567']) {
    assert.equal(normalizePhone(p), '905321234567', p);
  }
  assert.equal(normalizePhone('0212 123 45 67'), undefined); // sabit hat değil cep
  assert.equal(normalizePhone('123'), undefined);
});

test('IBAN kontrol hanesi ve format', () => {
  assert.equal(isValidIban(VALID_IBAN), true);
  assert.equal(isValidIban('TR33 0006 1005 1978 6457 8413 26'), true);
  assert.equal(isValidIban('TR330006100519786457841327'), false);
  assert.equal(isValidIban('TR3300061005'), false);
  assert.equal(formatIban('tr330006100519786457841326'), 'TR33 0006 1005 1978 6457 8413 26');
});

test('WhatsApp notu: telefon bulunur, dolgu kelimeler isim sanılmaz', () => {
  const r = parseOrderNote('numaram 0532 123 45 67 whatsapp için', { productTitles: ['WhatsApp Kart'] });
  assert.equal(r.card_type, 'whatsapp');
  assert.equal(r.fields.phone, '905321234567');
  assert.equal(r.fields.full_name, undefined);
  assert.deepEqual(r.warnings, []);
});

test('WhatsApp notunda telefon yoksa uyarı', () => {
  const r = parseOrderNote('Ahmet Bey için', { productTitles: ['WhatsApp Kart'] });
  assert.ok(r.warnings.some((w) => w.includes('telefon')));
});

test('etiketli IBAN notu', () => {
  const r = parseOrderNote('IBAN: TR33 0006 1005 1978 6457 8413 26\nHesap sahibi: Ahmet Yılmaz\nİşletme adı: Yılmaz Kafe', {
    productTitles: ['IBAN NFC Kart'],
  });
  assert.equal(r.card_type, 'iban');
  assert.equal(r.fields.iban, 'TR33 0006 1005 1978 6457 8413 26');
  assert.equal(r.fields.account_holder, 'Ahmet Yılmaz');
  assert.equal(r.fields.business_name, 'Yılmaz Kafe');
  assert.deepEqual(r.warnings, []);
});

test('etiketsiz IBAN notu: kalan isim hesap sahibi olur, IBAN rakamları telefon sanılmaz', () => {
  const r = parseOrderNote(`${VALID_IBAN} Mehmet Demir`, { productTitles: ['IBAN Kartı'] });
  assert.equal(r.fields.account_holder, 'Mehmet Demir');
  assert.equal(r.fields.phone, undefined);
});

test('hatalı IBAN uyarı verir', () => {
  const r = parseOrderNote('TR330006100519786457841327 Mehmet Demir', { productTitles: ['IBAN Kartı'] });
  assert.ok(r.warnings.some((w) => w.includes('IBAN hatalı')));
});

test('IBAN kartında hesap sahibi yoksa alıcı adı kullanılır ve uyarılır', () => {
  const r = parseOrderNote(VALID_IBAN, { productTitles: ['IBAN Kartı'], buyerName: 'Zeynep Ak' });
  assert.equal(r.fields.account_holder, 'Zeynep Ak');
  assert.ok(r.warnings.some((w) => w.includes('alıcı adı')));
});

test('premium notu: isim, telefon, instagram, site', () => {
  const r = parseOrderNote('Ad Soyad: Ayşe Kaya, tel 05321234567, instagram.com/ayse.kaya, www.aysekaya.com', {
    productTitles: ['Premium Dijital Kartvizit'],
  });
  assert.equal(r.card_type, 'premium');
  assert.equal(r.fields.full_name, 'Ayşe Kaya');
  assert.equal(r.fields.phone, '905321234567');
  assert.equal(r.fields.instagram, 'ayse.kaya');
  assert.equal(r.fields.website, 'https://www.aysekaya.com');
});

test('@handle instagram olarak alınır, e-posta ile karışmaz', () => {
  const r = parseOrderNote('insta @kafe.istanbul mail: info@kafe.com', { productTitles: ['Instagram Kart'] });
  assert.equal(r.fields.instagram, 'kafe.istanbul');
  assert.equal(r.fields.email, 'info@kafe.com');
});

test('boş not uyarı verir', () => {
  const r = parseOrderNote('', { productTitles: ['Google Yorum Kartı'] });
  assert.ok(r.warnings.includes('Sipariş notu boş'));
  assert.deepEqual(r.fields, {});
});

test('karta yazılacak link', () => {
  assert.equal(defaultCardLink('whatsapp', { phone: '905321234567' }), 'https://wa.me/905321234567');
  assert.equal(defaultCardLink('iban', {}, 'https://taptap.tr/kafe'), 'https://taptap.tr/kafe');
  assert.equal(defaultCardLink('iban', {}), undefined);
  assert.equal(defaultCardLink('instagram', { instagram: 'kafe' }), 'https://instagram.com/kafe');
  assert.equal(defaultCardLink('whatsapp', { phone: '905321234567', card_link: 'https://x.com' }), 'https://x.com');
});

test('slugify Türkçe karakterler', () => {
  assert.equal(slugify('Yılmaz Kafe & Çay Evi'), 'yilmaz-kafe-cay-evi');
  assert.equal(slugify('İŞLETME Ğüzel'), 'isletme-guzel');
});

// ---- Düzensiz yazılmış gerçekçi notlar ----
const G = VALID_IBAN.replace(/(.{4})/g, '$1 ').trim();
const P = (note, title) => parseOrderNote(note, { productTitles: [title], buyerName: 'Alıcı Kişi' });

test('düzensiz IBAN notları', () => {
  // küçük harf, "adına" kalıbı, dolgu kelimeler
  let r = P(`iban ${G.toLowerCase()} hesap ahmet yılmaz adına`, 'IBAN NFC Kart');
  assert.equal(r.fields.iban, G);
  assert.equal(r.fields.account_holder, 'Ahmet Yılmaz');
  // "TR" unutulmuş
  r = P(`${VALID_IBAN.slice(2)} Mehmet Demir`, 'IBAN NFC Kart');
  assert.equal(r.fields.iban, G);
  // 0 yerine O harfi
  assert.equal(P('TR33 OOO6 1005 1978 6457 8413 26\nAYŞE KAYA', 'IBAN NFC Kart').fields.iban, G);
  // noktalı IBAN, etiketler karışık yerde, sonda teşekkür
  r = P('merhaba iban: TR33.0006.1005.1978.6457.8413.26 adı soyadı: fatma şahin işletme: şahin kuaför teşekkürler', 'IBAN NFC Kart');
  assert.equal(r.fields.iban, G);
  assert.equal(r.fields.account_holder, 'Fatma Şahin');
  assert.equal(r.fields.business_name, 'Şahin Kuaför');
  // etiket + tire + banka adı
  r = P(`Hesap Sahibinin Adı Soyadı - Can Öztürk / Garanti\nTR 33 0006 1005 1978 6457 8413 26`, 'IBAN NFC Kart');
  assert.equal(r.fields.account_holder, 'Can Öztürk');
  assert.equal(r.fields.bank, 'Garanti');
});

test('etiketsiz çok satırlı not: işletme kelimesi işletme adına, kişi hesap sahibine gider', () => {
  const r = P(`Yılmaz Kafe\nAhmet Yılmaz\n${G}`, 'IBAN NFC Kart');
  assert.equal(r.fields.business_name, 'Yılmaz Kafe');
  assert.equal(r.fields.account_holder, 'Ahmet Yılmaz');
  assert.ok(r.warnings.some((w) => w.startsWith('Kontrol et')), 'tahmin edilen alanlar işaretlenmeli');
});

test('kartta yazacak isim etiketi', () => {
  const r = P(`kartta yazacak isim: DENİZ BÖREK SALONU , hesap sahibi: Deniz Arslan , ${G}`, 'IBAN NFC Kart');
  assert.equal(r.fields.business_name, 'DENİZ BÖREK SALONU');
  assert.equal(r.fields.account_holder, 'Deniz Arslan');
});

test('eksik IBAN hatalı olarak işaretlenir', () => {
  const r = P('IBAN TR33 0006 1005 1978 6457 8413 2', 'IBAN NFC Kart');
  assert.ok(r.warnings.some((w) => w.includes('IBAN hatalı')));
});

test('IBAN banka kodundan banka bulunur', () => {
  // Garanti (00062) kodlu geçerli bir IBAN üret
  const body = '0006200000000000012345';
  let rem = 0;
  for (const ch of body + '292700') rem = (rem * 10 + Number(ch)) % 97;
  const iban = 'TR' + String(98 - rem).padStart(2, '0') + body;
  assert.equal(P(iban + ' Ali Veli', 'IBAN NFC Kart').fields.bank, 'Garanti BBVA');
});

test('düzensiz telefonlar', () => {
  for (const n of ['whatsapp numaram (0532) 123 45 67', '0532.123.45.67', '+90 532-123-4567 yazarmısınız lütfen 🙏', '905321234567', '0090 532 123 45 67']) {
    assert.equal(P(n, 'WhatsApp NFC Kart').fields.phone, '905321234567', n);
  }
  const two = P('0532.123.45.67 ve 0555 444 33 22', 'WhatsApp NFC Kart');
  assert.equal(two.fields.phone, '905321234567');
  assert.ok(two.warnings.some((w) => w.includes('2 farklı telefon')));
});

test('premium: satır satır etiketli not', () => {
  const r = P('Ad Soyad: Ayşe Kaya\nÜnvan: Mimar\nŞirket: Kaya Mimarlık\nTel: 0532 123 45 67\ninsta: @ayse.kaya\nmail ayse@kaya.com', 'Premium Dijital Kartvizit');
  assert.deepEqual(r.fields, {
    email: 'ayse@kaya.com', instagram: 'ayse.kaya', phone: '905321234567',
    full_name: 'Ayşe Kaya', job_title: 'Mimar', business_name: 'Kaya Mimarlık',
  });
  assert.deepEqual(r.warnings, []);
});

test('premium: hiç etiket yok, küçük harf', () => {
  const r = P('emre çelik 05321234567 instagram.com/emrecelik www.emrecelik.com', 'Premium Dijital Kartvizit');
  assert.equal(r.fields.full_name, 'Emre Çelik');
  assert.equal(r.fields.phone, '905321234567');
  assert.equal(r.fields.website, 'https://www.emrecelik.com');
});

test('google: yorum linki ve işletme', () => {
  const r = P('işletme adı: Demir Döner https://g.page/r/CabcDEF123/review', 'Google Yorum NFC Kart');
  assert.equal(r.fields.business_name, 'Demir Döner');
  assert.equal(r.fields.google_name, 'Demir Döner');
  // doğrudan yorum linki ayrı alana gider ve karta yazılacak link olur
  assert.equal(r.fields.google_review, 'https://g.page/r/CabcDEF123/review');
  assert.ok(P('', 'Google Yorum NFC Kart').warnings.includes('Sipariş notu boş'));
});

test('WhatsApp yazım hataları kart tipini bulur', () => {
  for (const t of ['watsap kartı', 'Whatsap NFC', 'vatsap']) assert.equal(detectCardType([t], ''), 'whatsapp', t);
});
