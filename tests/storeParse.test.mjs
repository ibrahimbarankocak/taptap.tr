// Shopier mağaza sayfası ayrıştırıcı testi — çalıştır: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStoreHtml } from '../lib/storeParse.ts';

// Gerçek mağaza sayfasındaki yapının kısaltılmış hali (fazla boşluklar dahil)
const card = (id, title, price, old, badges = '') => `
<div class="product-card"> <a href="https://www.shopier.com/TapTapTr/${id}"                class="product-image-link-store shopier-store--store-product-card-link" data-back-id="${id}">
<div class="product-card-header"><picture> <img src="https://cdn.shopier.app/pictures_mid/TapTapTr_${id}.jpg" width="226" alt="${title}"> </picture></div>
<div class="product-card-body"><div class="product-card-badges">${badges}</div>
<div class="product-card-title"><h3 class="shopier-store--store-product-card-title">${title}</h3></div>
<div class="product-card-price"><div class="price price-current price-new" data-price="${price}"></div>
${old ? `<div class="price price-old shopier-store--store-product-card-price-old" data-price="${old}"></div>` : ''}</div></div></a></div>`;

test('ürünler, fiyatlar, indirim ve görsel', () => {
  const html = card('111', 'IBAN Nfc Kartı ', '499,00 TL', '589,00 TL', '<span class="badge badge-discount">%15 İndirim</span> <span class="badge">Yeni</span>')
    + card('222', '3&#039;lü IBAN Nfc Kartı', '1.199,00 TL', '')
    + card('111', 'IBAN Nfc Kartı ', '499,00 TL', ''); // tekrar eden ürün
  const list = parseStoreHtml(html);
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], {
    id: '111', title: 'IBAN Nfc Kartı', url: 'https://www.shopier.com/TapTapTr/111',
    image: 'https://cdn.shopier.app/pictures_mid/TapTapTr_111.jpg', price: '499,00 TL', oldPrice: '589,00 TL', discount: '%15 İndirim', isNew: true,
  });
  assert.equal(list[1].title, "3'lü IBAN Nfc Kartı");
  assert.equal(list[1].oldPrice, undefined);
  assert.equal(list[1].isNew, false);
});

test('boş / bozuk sayfa: boş liste', () => {
  assert.deepEqual(parseStoreHtml(''), []);
  assert.deepEqual(parseStoreHtml('<html>captcha</html>'), []);
});
