// Güvenlik / doğrulama testleri — çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, slugError, toSlugInput, parseCustomerInput, profileImageError } from '../lib/validate.ts';

test('safeUrl tehlikeli şemaları engeller', () => {
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'file:///etc/passwd']) {
    assert.equal(safeUrl(bad), null, bad);
  }
});

test('safeUrl normal linkleri kabul eder, şemasıza https ekler', () => {
  assert.equal(safeUrl('https://instagram.com/x'), 'https://instagram.com/x');
  assert.equal(safeUrl('instagram.com/x'), 'https://instagram.com/x');
  assert.equal(safeUrl('http://site.com'), 'http://site.com/');
  assert.equal(safeUrl(''), null);
});

test('slug kuralları', () => {
  assert.equal(slugError('ahmet-yilmaz'), null);
  assert.equal(slugError('kafe2'), null);
  assert.equal(slugError('baran_iban'), null); // canlıdaki eski kart adresleri
  assert.equal(slugError('muhlis_kale'), null);
  assert.ok(slugError('ahmet__kaya'));
  assert.ok(slugError('_ahmet'));
  assert.ok(slugError('admin'));
  assert.ok(slugError('api'));
  assert.ok(slugError('Ahmet Yılmaz'));
  assert.ok(slugError('a/b'));
  assert.ok(slugError('-ahmet'));
  assert.ok(slugError(''));
});

test('slug yazarken otomatik düzeltilir', () => {
  assert.equal(toSlugInput('Ahmet Yılmaz'), 'ahmet-yilmaz');
  assert.equal(toSlugInput('İŞLETME Çiçek'), 'isletme-cicek');
  assert.equal(toSlugInput('ahmet-'), 'ahmet-'); // yazmaya devam edilebilsin
  assert.equal(toSlugInput('a  //  b'), 'a-b');
  assert.equal(toSlugInput('baran_iban'), 'baran_iban'); // alt çizgi korunur (mevcut kart bozulmasın)
});

test('profil fotoğrafı: sadece görsel data URI ve boyut sınırı', () => {
  assert.equal(profileImageError(''), null);
  assert.equal(profileImageError('data:image/jpeg;base64,AAAA'), null);
  assert.ok(profileImageError('data:text/html;base64,AAAA'));
  assert.ok(profileImageError('https://evil.com/x.jpg'));
  assert.ok(profileImageError('data:image/jpeg;base64,' + 'A'.repeat(2_000_000)));
});

test('müşteri formu: javascript: sosyal link reddedilir', () => {
  const r = parseCustomerInput({ full_name: 'A', slug: 'a', instagram: 'javascript:alert(1)' });
  assert.ok('error' in r);
});

test('müşteri formu: temizlenmiş veri', () => {
  const r = parseCustomerInput({ full_name: '  Ayşe  ', slug: ' Ayse ', card_type: 'iban', instagram: 'instagram.com/ayse', youtube: '' });
  assert.ok('data' in r);
  assert.equal(r.data.full_name, 'Ayşe');
  assert.equal(r.data.slug, 'ayse');
  assert.equal(r.data.card_type, 'iban');
  assert.deepEqual(r.data.socials, [{ platform: 'instagram', url: 'https://instagram.com/ayse' }]);
});

test('müşteri formu: bilinmeyen kart tipi premium olur', () => {
  const r = parseCustomerInput({ full_name: 'A', slug: 'a', card_type: '<script>' });
  assert.equal(r.data.card_type, 'premium');
});

test('Google yorum linki doğrudan yorum ekranına çevrilir', async () => {
  const { toGoogleReviewUrl } = await import('../lib/validate.ts');
  assert.deepEqual(toGoogleReviewUrl('https://g.page/r/CabcDEF123/review'), { url: 'https://g.page/r/CabcDEF123/review' });
  assert.deepEqual(toGoogleReviewUrl('g.page/r/CabcDEF123'), { url: 'https://g.page/r/CabcDEF123/review' });
  assert.deepEqual(toGoogleReviewUrl('ChIJN1t_tDeuEmsRUsoyG83frY4'), { url: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4' });
  assert.deepEqual(
    toGoogleReviewUrl('https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4&foo=1'),
    { url: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4' }
  );
  assert.ok(toGoogleReviewUrl('https://maps.app.goo.gl/xyz').warning); // çalışır ama uyarı
  assert.ok('error' in toGoogleReviewUrl('https://evil.com/review'));
  assert.ok('error' in toGoogleReviewUrl('javascript:alert(1)'));
  assert.ok('error' in toGoogleReviewUrl(''));
});

test('Google kartı: yorum linki zorunlu ve socials içine girer', () => {
  assert.ok('error' in parseCustomerInput({ full_name: 'Kafe', slug: 'kafe', card_type: 'google' }));
  const r = parseCustomerInput({ full_name: 'Kafe', slug: 'kafe', card_type: 'google', google_review: 'g.page/r/Cxyz' });
  assert.equal(r.data.card_type, 'google');
  assert.deepEqual(r.data.socials, [{ platform: 'google_review', url: 'https://g.page/r/Cxyz/review' }]);
});

test('başlıktan otomatik slug: mevcut kartlardaki alışkanlıkla aynı', async () => {
  const { suggestSlug } = await import('../lib/validate.ts');
  assert.equal(suggestSlug('ENES ULU'), 'enesulu');
  assert.equal(suggestSlug('SARAN AVM / Kuveyttürk'), 'saranavm'); // "/ Banka" eki atılır
  assert.equal(suggestSlug('ÖMER ŞAHİN / ALBARAKA'), 'omersahin');
  assert.equal(suggestSlug('Yeşilova Közde Döner'), 'yesilovakozdedo'); // 15 karaktere kesilir
  assert.equal(suggestSlug('Café Ağaç & Çiçek'), 'cafeagaccicek');
  assert.ok(suggestSlug('Çok Uzun Bir İşletme Adı Burada').length <= 15);
});

test('yeni adres en fazla 15 karakter; mevcut uzun adresler değişmedikçe geçerli', async () => {
  const { MAX_SLUG_LENGTH } = await import('../lib/validate.ts');
  assert.equal(MAX_SLUG_LENGTH, 15);
  assert.equal(slugError('abcdefghijklmno'), null); // 15
  assert.ok(slugError('berberimalinteri')); // 16: yeni kartta olmaz
  assert.equal(slugError('berberimalinteri', true), null); // mevcut kartın değişmeyen adresi: olur
  // düzenleme: adres aynı kaldıysa kabul, değiştirilip uzun yazıldıysa ret
  assert.ok('data' in parseCustomerInput({ full_name: 'X', slug: 'berberimalinteri' }, 'berberimalinteri'));
  assert.ok('error' in parseCustomerInput({ full_name: 'X', slug: 'berberimalintery' }, 'berberimalinteri'));
  assert.ok('error' in parseCustomerInput({ full_name: 'X', slug: 'berberimalinteri' }));
  assert.equal(toSlugInput('abcdefghijklmnopqrstu').length, 15);
});

test('çoklu IBAN: ek IBANlar sadece IBAN kartında, boş satırlar atlanır', () => {
  const r = parseCustomerInput({
    full_name: 'Kafe', slug: 'kafe', card_type: 'iban', iban: 'TR1', account_holder: 'Ali',
    extra_ibans: [{ iban: 'TR2', holder: 'Veli' }, { iban: '', holder: '' }, { iban: 'TR3', holder: '' }],
  });
  assert.deepEqual(r.data.extra_ibans, [{ iban: 'TR2', holder: 'Veli' }, { iban: 'TR3', holder: '' }]);
  // IBAN'ı boş ama ismi dolu satır -> hata
  assert.ok('error' in parseCustomerInput({ full_name: 'K', slug: 'k', card_type: 'iban', extra_ibans: [{ iban: '', holder: 'X' }] }));
  // Premium kartta ek IBAN yok sayılır
  assert.deepEqual(parseCustomerInput({ full_name: 'K', slug: 'k', extra_ibans: [{ iban: 'TR2', holder: 'V' }] }).data.extra_ibans, []);
  // tek IBAN: ek liste boş (mevcut kartlar değişmez)
  assert.deepEqual(parseCustomerInput({ full_name: 'K', slug: 'k', card_type: 'iban', iban: 'TR1' }).data.extra_ibans, []);
});
