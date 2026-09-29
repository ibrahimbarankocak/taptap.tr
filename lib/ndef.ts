// NFC kart hafızası hesabı (saf fonksiyon, testlenebilir).
// Web NFC karta NDEF mesajı yazar: TLV (03 + uzunluk) + kayıt başlığı + tip "U" + ön ek kodu + link + FE.
// "https://" gibi ön ekler 1 bayta sıkıştırılır.

// NDEF URI ön ek kodları (en uzundan kısaya kontrol edilir)
const URI_PREFIXES = ['https://www.', 'http://www.', 'https://', 'http://', 'tel:', 'mailto:'];

// Yaygın NFC çiplerinin kullanıcı hafızası (NDEF mesajının sığması gereken alan, bayt)
export const NFC_CHIPS = [
  { name: 'NTAG213', bytes: 144 },
  { name: 'NTAG215', bytes: 504 },
  { name: 'NTAG216', bytes: 888 },
] as const;

const utf8Length = (s: string) => new TextEncoder().encode(s).length;

// Tek bir URL / metin kaydının karttaki toplam boyutu (bayt)
export function ndefSize(value: string, type: 'url' | 'text' = 'url'): number {
  let payload: number;
  if (type === 'url') {
    const prefix = URI_PREFIXES.find((p) => value.toLowerCase().startsWith(p));
    payload = 1 + utf8Length(prefix ? value.slice(prefix.length) : value); // 1 bayt ön ek kodu
  } else {
    payload = 1 + 2 + utf8Length(value); // durum baytı + "tr" dil kodu + metin
  }
  const record = 1 /* başlık */ + 1 /* tip uzunluğu */ + (payload < 256 ? 1 : 4) /* yük uzunluğu */ + 1 /* tip */ + payload;
  return 1 /* TLV etiketi 0x03 */ + (record < 255 ? 1 : 3) /* TLV uzunluğu */ + record + 1 /* sonlandırıcı 0xFE */;
}

// En küçük uygun çip; hiçbirine sığmıyorsa undefined
export function smallestChip(bytes: number) {
  return NFC_CHIPS.find((c) => bytes <= c.bytes);
}

// Kullanıcıya gösterilecek özet: "79 bayt · NTAG213'e sığar"
export function fitSummary(value: string, type: 'url' | 'text' = 'url') {
  const bytes = ndefSize(value, type);
  const chip = smallestChip(bytes);
  return {
    bytes,
    chip: chip?.name,
    fitsSmallest: bytes <= NFC_CHIPS[0].bytes, // en yaygın/ucuz çip NTAG213
    label: chip ? `${bytes} bayt · ${chip.name}${chip === NFC_CHIPS[0] ? "'e sığar" : ' gerekir'}` : `${bytes} bayt · hiçbir karta sığmaz`,
  };
}
