// Gerçek siparişlerdeki kalıplar (377 siparişten öğrenildi) — kişisel veri içermeyen örneklerle. Çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderNote, detectCardTypes, normalizeWhatsapp } from '../lib/parseOrderNote.ts';

const P = (note, title) => parseOrderNote(note, { productTitles: [title], buyerName: 'Alıcı Kişi' });
// geçerli IBAN üret: TR + kontrol hanesi + 22 hane
const IB = (body) => {
  let rem = 0;
  for (const ch of body + '292700') rem = (rem * 10 + Number(ch)) % 97;
  return 'TR' + String(98 - rem).padStart(2, '0') + body;
};
const A = IB('0006200000000000000001');
const B = IB('0001000000000000000002');
const C = IB('0006400000000000000003');

test('paket ürünler: bir siparişte birden çok kart tipi', () => {
  assert.deepEqual(detectCardTypes(['Google+Instagram+Whatsapp NFC Kartı (1&#039;er Adet Avan'], ''), ['google', 'instagram', 'whatsapp']);
  assert.deepEqual(detectCardTypes(['IBAN+Whatsapp Nfc Kartı - Avantaj Paket'], ''), ['iban', 'whatsapp']);
  // genel paket: tipler nottan çıkarılır
  assert.deepEqual(
    detectCardTypes(['3&#039;Lü NFC Paketi - Avantaj Paketi'], 'Google: Demir Döner\nİnstagram: demirdoner\nWhatsapp: 0532 111 22 33'),
    ['whatsapp', 'google', 'instagram']
  );
  assert.deepEqual(detectCardTypes(['IBAN NFC Kartvizit (Cüzdan Boy)'], ''), ['iban']); // "kartvizit" yüzünden premium sanılmaz
});

test('çoklu IBAN: isimler altta, renkler', () => {
  const r = P(`${A}\nAli Veli\n1 adet beyaz\n\n${B}\nKaya Otomotiv Sanayi Ticaret Limited Şirketi\n1 adet siyah`, '10&#039;lu IBAN Nfc Kartı');
  assert.equal(r.fields.ibans.length, 2);
  assert.equal(r.fields.ibans[0].holder, 'Ali Veli');
  assert.equal(r.fields.ibans[0].theme, 'white');
  assert.equal(r.fields.ibans[1].holder, 'Kaya Otomotiv Sanayi Ticaret Limited Şirketi');
  assert.equal(r.fields.ibans[1].theme, 'black');
  assert.ok(r.warnings.some((w) => w.includes('2 IBAN kartı')));
});

test('çoklu IBAN: isimler üstte', () => {
  const r = P(`1 tanesinde bu isim yazsın\nAli Veli\n${A}\n\n1 tanesinde bu isim yazsın\nAyşe Kaya\n${B}`, '3&#039;lü IBAN Nfc Kartı');
  assert.deepEqual(r.fields.ibans.map((e) => e.holder), ['Ali Veli', 'Ayşe Kaya']);
});

test('çoklu IBAN: satır içinde işletme - kişi - IBAN', () => {
  const r = P(`1. nfs kart ( gökdeniz büfe - cenk zengin -${A}\n\n2. nfs kart ( kafkas cafe - umut yiğit - ${B}`, '3&#039;lü IBAN Nfc Kartı');
  assert.deepEqual(r.fields.ibans.map((e) => e.holder), ['Cenk Zengin', 'Umut Yiğit']);
});

test('şirket hesabı: IBAN altındaki unvan hesap sahibi olur', () => {
  const r = P(`${C}\nDOĞAN PERAKENDE HIRDAVAT AKSESUAR SANAYİ VE TİCARET LTD.ŞTİ.`, 'IBAN Nfc Kartı ');
  assert.match(r.fields.account_holder, /^DOĞAN PERAKENDE/);
  assert.ok(!r.warnings.some((w) => w.includes('alıcı adı')));
});

test('işletme + kişi aynı satırda', () => {
  const r = P(`${A} Berberim Alınteri Kuaför Musa bozkaya`, 'IBAN Nfc Kartı ');
  assert.equal(r.fields.business_name, 'Berberim Alınteri Kuaför');
  assert.equal(r.fields.account_holder, 'Musa bozkaya');
});

test('"İban isim:" ve "İsim:" etiketleri', () => {
  assert.equal(P(`Şirket adı:Enes kuyumculuk\nİban:${A}\nİban isim:GNZ ENES KUYUMCULUK`, 'IBAN Nfc Kartı').fields.account_holder, 'GNZ ENES KUYUMCULUK');
  assert.equal(P(`İşletme İsmi: Yener Yapı Market\nİban: ${A}\nİsim: İsmail Yener`, 'IBAN Nfc Kartı').fields.account_holder, 'İsmail Yener');
});

test('banka adı Türkçe büyük harfle yazılmış', () => {
  // IBAN kodu listede olmayan bir banka (00099 değil) — yazılı banka adı kullanılır
  const r = P(`${IB('0098800000000000000009')}\nGARANTİ BANKASI\nAli Veli`, 'IBAN Nfc Kartı');
  assert.equal(r.fields.bank, 'GARANTİ BANKASI');
  assert.equal(r.fields.account_holder, 'Ali Veli');
});

test('Google işletme adı: farklı yazımlar', () => {
  const g = (n) => P(n, 'Google NFC Yorum Kartı').fields.google_name;
  assert.equal(g('Google : GYM BACK'), 'GYM BACK');
  assert.equal(g('Google : Demir Döner Narlıdere'), 'Demir Döner Narlıdere'); // baştaki "De" etiket kelimesi sanılmaz
  assert.equal(g('Google da : Datça Balıkçısı'), 'Datça Balıkçısı');
  assert.equal(g('Google haritalarda yazan ismimiz:EFSANE ABİYE'), 'EFSANE ABİYE');
  assert.equal(g('Goggle adı.                  MELODİM VETERİNER KLİNİĞİ'), 'MELODİM VETERİNER KLİNİĞİ');
  assert.equal(g('Google için SPORTLINE FITNESS CLUB KOCAELİ/KÖRFEZ'), 'SPORTLINE FITNESS CLUB KOCAELİ');
  assert.equal(g('Google haritalar : Özcan Ekmek bornovada olan.       İnstrgramda : ozcan.ekmek'), 'Özcan Ekmek');
  assert.equal(g('Harita ismi Costa Rica Coffee Hereke Sahil'), 'Costa Rica Coffee Hereke Sahil');
  assert.equal(g('instagram adı : ozaydin_pide\n\nGoogle: Özaydın Pide &amp; Çorba Narlıdere'), 'Özaydın Pide & Çorba Narlıdere');
  assert.equal(g('https://www.google.com/search?q=MKN%20GARAGE&kgmid=x'), 'MKN GARAGE');
});

test('Google + Instagram aynı satırda: ikisi de bulunur', () => {
  const f = P('Google haritalar : Özcan Ekmek bornovada olan.       İnstrgramda : ozcan.ekmek', '2&#039;Li Google+Instagram NFC Kartı').fields;
  assert.equal(f.google_name, 'Özcan Ekmek');
  assert.equal(f.instagram, 'ozcan.ekmek');
});

test('Google linkleri: yorum linki ayrı, harita/paylaşım linki ayrı', () => {
  const r = P('GOOGLE : https://search.google.com/local/writereview?placeid=ChIJabc123', 'Google NFC Yorum Kartı');
  assert.equal(r.fields.google_review, 'https://search.google.com/local/writereview?placeid=ChIJabc123');
  assert.equal(P('https://share.google/abcDEF123', 'Google NFC Yorum Kartı').fields.google_link, 'https://share.google/abcDEF123');
  assert.equal(P('https://maps.app.goo.gl/abc?g_st=ic', 'Google NFC Yorum Kartı').fields.google_link, 'https://maps.app.goo.gl/abc?g_st=ic');
});

test('Instagram: farklı yazımlar', () => {
  const ig = (n) => P(n, 'Instagram NFC Kartı').fields.instagram;
  assert.equal(ig('https://www.instagram.com/mfkparfumm?igsi=NGabc&amp;utm_source=qr'), 'mfkparfumm');
  assert.equal(ig('İntagram adresi : genclikhediyelik.esya'), 'genclikhediyelik.esya');
  assert.equal(ig('ins: kanvasevim'), 'kanvasevim');
  assert.equal(ig('instagram/umkaplastikmelamin'), 'umkaplastikmelamin');
  assert.equal(ig('Sematalip_friseur  İnstagram'), 'sematalip_friseur');
  assert.equal(ig('İnstagram: \n\nlepa.cumhuriyet'), 'lepa.cumhuriyet');
  assert.equal(ig('1.instagram adı “merter_furry34”'), 'merter_furry34');
  assert.equal(ig('gardrobeankara'), 'gardrobeankara');
  assert.equal(ig('Kartlara instagram adresimiz tanımlanacak  \n@cigkoftem   olacaktır.'), 'cigkoftem');
});

test('WhatsApp: sabit hat ve yabancı numara', () => {
  assert.deepEqual(normalizeWhatsapp('0322 123 45 67'), { phone: '903221234567', kind: 'landline' });
  assert.deepEqual(normalizeWhatsapp('+90 212 123 45 67'), { phone: '902121234567', kind: 'landline' });
  assert.deepEqual(normalizeWhatsapp('+49 151 23456789'), { phone: '4915123456789', kind: 'foreign' });
  assert.deepEqual(normalizeWhatsapp('0532 123 45 67'), { phone: '905321234567', kind: 'mobile' });
  const r = P('Whatsapp : 0322 123 45 67', 'Whatsapp NFC Kartı');
  assert.equal(r.fields.phone, '903221234567');
  assert.ok(r.warnings.some((w) => w.includes('Sabit hat')));
});

test('cümleler isim sanılmaz', () => {
  for (const n of ['Merhaba kartları boş şekilde istiyorum.', 'Kendim ayarlayabileceğim şekilde gönderirseniz sevinirim', 'Dm üzerinde bilgiler mevcut']) {
    const f = P(n, 'Google NFC Yorum Kartı').fields;
    assert.equal(f.full_name, undefined, n);
    assert.equal(f.google_name, undefined, n);
  }
});

test('mevcut TapTap kartı linki', () => {
  assert.equal(P('Iban Nfc Card: https://www.taptaptr.com/muhlis_kale', 'IBAN Nfc Kartı').fields.taptap_slug, 'muhlis_kale');
});

test('HTML kodları çözülür', () => {
  assert.equal(P('Google: Salon Ayla Güzellik &amp; Bayan Kuaförü', 'Google NFC Yorum Kartı').fields.google_name, 'Salon Ayla Güzellik & Bayan Kuaförü');
});

test('Son siparişlerden düzeltmeler (2026-09-30)', () => {
  // Türkçe harfli / büyük harfli kullanıcı adı, bizim hesabımız sayılmaz
  const r1 = P('DÖNERCY_ instagram\nhttps://instagram.com/taptap.tr', 'Instagram NFC Kartı');
  assert.equal(r1.fields.instagram, 'donercy_');
  // "Kanal" / "Telegram" işletme adı değildir
  assert.notEqual(P('Kanal linki: https://whatsapp.com/channel/abc', 'Whatsapp NFC Kartı').fields.business_name, 'Kanal');
  // "IBAN isim soyisim:" etiketi hesap sahibidir
  const r2 = P('TR33 0006 1005 1978 6457 8413 26\nIban isim soyisim: Ahmet Yılmaz', 'IBAN NFC Kartı');
  assert.equal(r2.fields.account_holder, 'Ahmet Yılmaz');
  // Etiketli Instagram satırı işletme adı olmaz
  const r3 = P('İG kullanıcı adı : bhveteriner', 'Google+Instagram NFC Kartı');
  assert.equal(r3.fields.instagram, 'bhveteriner');
  assert.notEqual(r3.fields.business_name, 'bhveteriner');
  // İki boşlukla ayrılan açıklama isimden ayrılır
  const r4 = P('Muhyettin Aksoy  ek olarak kartın arkasına logo', 'Premium NFC Kartvizit');
  assert.equal(r4.fields.full_name, 'Muhyettin Aksoy');
  // Birden fazla WhatsApp numarası: hepsi tutulur
  const r5 = P('0532 111 22 33\n0533 444 55 66\n0544 777 88 99', "3'lü Whatsapp NFC Kartı");
  assert.equal(r5.fields.phones.length, 3);
  // Google kartı: uzun adresin sonundaki işletme adı
  const r6 = P('Yeni Mahalle 12. Sokak No:5 Biberzade çiğköfte', 'Google NFC Yorum Kartı');
  assert.match(r6.fields.google_name, /Biberzade Çiğköfte/i);
});

test('Etiket sonda / "için de" / "kullanıcı adı" yazımları', () => {
  const r1 = P('ES Kırtasiye- Google\nes.kirtasiiye - ınstagram', 'Google+Instagram NFC Kartı');
  assert.equal(r1.fields.google_name, 'ES Kırtasiye');
  assert.equal(r1.fields.instagram, 'es.kirtasiiye');
  assert.equal(P('İnstagram için de sahin.yap.dek', 'Instagram NFC Kartı').fields.instagram, 'sahin.yap.dek');
  assert.equal(P('İnstagram\n\nMICRO PIZZA isim\nmicro_pizza kullanıcı adı', 'Google+Instagram NFC Kartı').fields.instagram, 'micro_pizza');
  assert.equal(P('Manisa/ Demirci \nKümeçınarlar uçar restorant', 'Google NFC Yorum Kartı').fields.google_name, 'Kümeçınarlar uçar restorant');
});
