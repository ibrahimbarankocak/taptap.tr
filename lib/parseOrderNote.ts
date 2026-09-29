// Shopier sipariş notundan kart bilgilerini ayıklayan saf fonksiyon (DB / ağ yok).
//
// Gerçek siparişlerden öğrenilenler (377 sipariş incelendi):
//  - Çoğu sipariş paket: "Google+Instagram+Whatsapp", "3'lü NFC Paketi" → bir siparişte birden çok kart tipi.
//  - Çoklu IBAN siparişlerinde her IBAN'ın altına/üstüne hesap sahibi yazılır, bazen renk ("1 adet beyaz").
//  - Google için çoğu zaman işletme ADI yazılır ("Google: Özaydın Pide") ya da share.google / maps.app.goo.gl linki.
//  - Instagram: "ins:", "İnstrgramda :", "İntagram adresi :", "@handle" veya ?igsi=... ekli link.
//  - WhatsApp'ta sabit hat (0322..., +90 2..) ve yabancı numaralar (00..., +49...) da var.
//  - Notlarda HTML kodları var (&amp; &#039;), görünmez karakterler var.
//
// Yaklaşım: önce kesin bulunabilenler (IBAN kontrol hanesiyle, link, e-posta, telefon), sonra etiketler
// (Türkçe harf / büyük-küçük harf farkı gözetmeden), en son etiketsiz satırlar. Tahminler "Kontrol et" ile işaretlenir.

export type CardType = 'whatsapp' | 'iban' | 'premium' | 'google' | 'instagram' | 'other';

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  whatsapp: 'WhatsApp',
  iban: 'IBAN',
  premium: 'Premium',
  google: 'Google Yorum',
  instagram: 'Instagram',
  other: 'Diğer',
};

export type CardTheme = 'black' | 'white';

export type IbanEntry = {
  iban: string;
  valid: boolean;
  holder?: string;
  bank?: string;
  theme?: CardTheme; // notta "beyaz" / "siyah" yazıyorsa
  customer_id?: number; // bu IBAN için oluşturulan profil
  slug?: string;
};

export type ExtractedFields = {
  full_name?: string;
  business_name?: string;
  account_holder?: string;
  job_title?: string;
  phone?: string;
  iban?: string;
  bank?: string; // IBAN'daki banka kodundan
  email?: string;
  instagram?: string;
  website?: string;
  google_name?: string; // Google'da görünen işletme adı (Place ID aramak için)
  google_link?: string; // müşterinin gönderdiği Google linki (share.google, maps.app.goo.gl…)
  google_review?: string; // doğrudan yorum ekranı linki (writereview?placeid=…)
  whatsapp_link?: string; // wa.me / WhatsApp kanal linki
  taptap_slug?: string; // notta mevcut bir TapTap kartının linki varsa
  theme?: CardTheme;
  card_link?: string; // elle girilen, karta yazılacak link (boşsa otomatik hesaplanır)
  card_types?: CardType[]; // siparişteki tüm kart tipleri (paketler için)
  ibans?: IbanEntry[]; // siparişteki tüm IBAN'lar (çoklu IBAN kartı)
};

type TextField = Exclude<keyof ExtractedFields, 'card_types' | 'ibans' | 'theme'>;

export type ParsedNote = {
  card_type: CardType;
  card_types: CardType[];
  fields: ExtractedFields;
  warnings: string[];
};

// ---------------------------------------------------------------------------------------------
// Metin temizliği

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

const cleanText = (s: string) =>
  decodeEntities(s || '')
    .normalize('NFC')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '') // görünmez yön/boşluk karakterleri
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\r\n?/g, '\n');

// Türkçe harf katlama: "İŞLETME Adı" -> "isletme adi". Her karakter tek karaktere eşlenir,
// böylece katlanmış metindeki konumlar orijinal metinle birebir aynı kalır.
const FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
function foldChar(ch: string): string {
  const lower = ch === 'I' ? 'ı' : ch === 'İ' ? 'i' : ch.toLowerCase();
  if (lower.length !== 1) return ch;
  return FOLD[lower] ?? lower;
}
export const fold = (s: string) => Array.from(s, foldChar).join('');

// ---------------------------------------------------------------------------------------------
// Kart tipleri (paketlerde birden çok)

const TYPE_KEYWORDS: [CardType, RegExp][] = [
  ['iban', /iban/i],
  ['whatsapp', /wh?ats?\s*ap?p|watsap|vatsap|whatsup|\bwp\b|\bwa\b/i],
  ['google', /goo?g+le|yorum|review/i],
  ['instagram', /[iİı]n?st?[a-z]*gr?am|\binsta\b/i],
  ['premium', /premium|kartvizit|dijital|profil/i],
];

// Tek bir metindeki (ör. ürün adı parçası) ilk kart tipi
function typeOf(text: string): CardType | undefined {
  for (const [type, re] of TYPE_KEYWORDS) if (re.test(text)) return type;
  return undefined;
}

// Geriye dönük uyumluluk: ürün adı öncelikli tek tip
export function detectCardType(productTitles: string[], note: string): CardType {
  return detectCardTypes(productTitles, note)[0] ?? 'other';
}

export function detectCardTypes(productTitles: string[], note: string): CardType[] {
  const types: CardType[] = [];
  const add = (t?: CardType) => t && !types.includes(t) && types.push(t);
  let genericPack = false;
  for (const raw of productTitles) {
    const title = decodeEntities(raw);
    // "Google+Instagram+Whatsapp NFC Kartı" -> 3 tip
    const parts = title.split('+');
    const found = parts.map(typeOf).filter(Boolean);
    found.forEach(add);
    // "IBAN NFC Kartvizit (Cüzdan Boy)": kartvizit kelimesi yüzünden premium sanılmasın
    if (!found.length) {
      if (/paket|nfc\s*kart/i.test(title)) genericPack = true;
      else add(typeOf(title));
    }
  }
  // "3'lü NFC Paketi" gibi genel paketler: kart tiplerini nottan çıkar
  if (genericPack || !types.length) {
    const f = fold(note);
    if (/iban|tr\s*\d{2}[\s\d]{20,}/.test(f)) add('iban');
    if (/wh?ats?\s*ap?p|watsap|vatsap|whatsup|\bwp\b|telefon|tel\s*no/.test(f)) add('whatsapp');
    if (/goo?g+le|harita|maps|share\.google|goo\.gl|yorum/.test(f)) add('google');
    if (/\bi[a-z]{1,5}gr?am|\binsta\b|\bins\b|instagram\.com|(^|\s)@[\w.]{2,}/.test(f)) add('instagram');
  }
  return types;
}

// ---------------------------------------------------------------------------------------------
// Telefon

// Türk cep telefonu -> "905xxxxxxxxx" (geriye dönük: sadece cep)
export function normalizePhone(raw: string): string | undefined {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0090')) d = d.slice(2);
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  if (d.length === 10 && d.startsWith('5')) return '90' + d;
  return undefined;
}

// WhatsApp için her tür numara: TR cep, TR sabit hat (WhatsApp Business), yabancı numara
export function normalizeWhatsapp(raw: string): { phone: string; kind: 'mobile' | 'landline' | 'foreign' } | undefined {
  const mobile = normalizePhone(raw);
  if (mobile) return { phone: mobile, kind: 'mobile' };
  const trimmed = raw.trim();
  let d = trimmed.replace(/\D/g, '');
  const intl = trimmed.startsWith('+') || d.startsWith('00');
  if (d.startsWith('00')) d = d.slice(2);
  // TR sabit hat / 0850: 0212..., +90 212..., 90 212...
  let tr = d;
  if (tr.startsWith('90') && tr.length === 12) tr = tr.slice(2);
  else if (tr.startsWith('0') && tr.length === 11) tr = tr.slice(1);
  if (tr.length === 10 && /^[2-48]/.test(tr) && (!intl || d.startsWith('90'))) return { phone: '90' + tr, kind: 'landline' };
  if (intl && !d.startsWith('90') && d.length >= 8 && d.length <= 15) return { phone: d, kind: 'foreign' };
  return undefined;
}

// Rakam + ayraç dizileri: "0532.123.45.67", "(0532) 123 45 67", "+90 532-123-4567"
const PHONE_CANDIDATE_RE = /(?:\+|00)?\(?\d[\d\s.\-()/]{7,20}\d/g;

// ---------------------------------------------------------------------------------------------
// IBAN

export function formatIban(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s/g, '').toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

// EFT banka kodları (IBAN'ın 5-9. rakamları) — IBAN'ın hangi bankaya ait olduğunu göstermek için
const BANKS: Record<string, string> = {
  '00010': 'Ziraat Bankası', '00012': 'Halkbank', '00015': 'VakıfBank', '00032': 'TEB', '00046': 'Akbank',
  '00059': 'Şekerbank', '00062': 'Garanti BBVA', '00064': 'İş Bankası', '00067': 'Yapı Kredi', '00099': 'ING',
  '00111': 'QNB (Enpara)', '00123': 'HSBC', '00134': 'DenizBank', '00135': 'Anadolubank', '00146': 'Odeabank',
  '00203': 'Albaraka Türk', '00205': 'Kuveyt Türk', '00206': 'Türkiye Finans', '00209': 'Ziraat Katılım',
  '00210': 'Vakıf Katılım', '00211': 'Emlak Katılım',
};
export const bankFromIban = (iban: string) => BANKS[iban.replace(/\s/g, '').slice(4, 9)];

type Span = { start: number; end: number };
type IbanHit = Span & { iban: string; valid: boolean };

// "TR" + 24 rakam (araya boşluk/nokta/tire girebilir, 0 yerine O yazılmış olabilir).
// "TR" unutulmuşsa 24 rakamlık dizi de denenir ama sadece kontrol hanesi tutarsa kabul edilir.
function findIbans(text: string): IbanHit[] {
  const hits: IbanHit[] = [];
  const withTr = /T\s*R[\s:.\-]*((?:[\dOo][ .\-]*){24})/gi;
  for (const m of text.matchAll(withTr)) {
    const digits = m[1].replace(/[\s.\-]/g, '').replace(/[Oo]/g, '0');
    const iban = 'TR' + digits;
    hits.push({ iban, valid: isValidIban(iban), start: m.index!, end: m.index! + m[0].trimEnd().length });
  }
  // Eksik/fazla yazılmış TR... dizileri: hatalı IBAN olarak işaretle ki kullanıcı görsün
  const partial = /T\s*R[\s:.\-]*((?:[\dOo][ .\-]*){18,27})/gi;
  for (const m of text.matchAll(partial)) {
    if (hits.some((h) => m.index! >= h.start && m.index! < h.end)) continue;
    const digits = m[1].replace(/[\s.\-]/g, '').replace(/[Oo]/g, '0');
    hits.push({ iban: 'TR' + digits, valid: false, start: m.index!, end: m.index! + m[0].trimEnd().length });
  }
  const bare = /(?<![\dA-Za-z])((?:\d[ .\-]*){23}\d)(?!\d)/g;
  for (const m of text.matchAll(bare)) {
    if (hits.some((h) => m.index! >= h.start && m.index! < h.end)) continue;
    const iban = 'TR' + m[1].replace(/[\s.\-]/g, '');
    if (isValidIban(iban)) hits.push({ iban, valid: true, start: m.index!, end: m.index! + m[0].length });
  }
  return hits.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------------------------
// İsim / işletme sezgileri

const FILLER = new Set([
  'numara', 'numaram', 'numarasi', 'numaramiz', 'telefon', 'telefonum', 'telefonu', 'tel', 'cep', 'gsm', 'no', 'whatsapp', 'whatsap',
  'watsap', 'wp', 'wa', 'iban', 'ibanim', 'ibani', 'hesap', 'hesabi', 'kart', 'karti', 'karta', 'kartim', 'kartlar', 'icin', 've', 'ile',
  'bu', 'su', 'lutfen', 'rica', 'ederim', 'tesekkurler', 'tesekkur', 'merhaba', 'merhabalar', 'merabalar', 'selam', 'slm', 'mrb',
  'iyi', 'gunler', 'calismalar', 'instagram', 'insta', 'link', 'linki', 'site', 'mail', 'eposta', 'yazilacak', 'yazacak', 'olsun',
  'yaz', 'yazin', 'yazar', 'misiniz', 'bilgiler', 'bilgileri', 'bilgilerim', 'bank', 'banka', 'bankasi', 'adina', 'google', 'yorum',
  'not', 'siparis', 'ekte', 'asagida', 'tr', 'nfc', 'adet', 'tane', 'beyaz', 'siyah', 'card', 'bilgimiz', 'bilgisi', 'bilgim', 'nfs',
  'adresim', 'adres', 'adresi', 'adresimiz', 'profil', 'profili', 'cok', 'adi', 'konum', 'konumu', 'sayfasi', 'sayfamiz', 'hesabimiz',
  'var', 'varya', 'yok', 'ismi', 'isim', 'harita', 'haritalar', 'maps',
]);

// Cümle belirten kelimeler: bu kelimeleri içeren satır isim değildir
const SENTENCE_WORDS = /\b(istiyorum|isteriz|sevinirim|olacak|olacaktir|olsun|yazsin|yazilsin|tanimlanacak|mevcut|attim|bilmiyorum|ederim|yapacagiz|birakabilirsiniz|konusmustuk|geciyor|olarak|ama|varya|tanesinde|linkimiz|linkleri|ekleniyorsa|ekleyelim|olur|kendim|gonderirseniz|hazirlanmasini|bulamadim|ayarlayabilirseniz|anlamadigi|degil|lazim|gerek|sizden|bize|bizim|sizin|arayip|burdan|oradan|tikladim|yerine|kontrol|etmenizi|olan|yazan|ayri|diger|digerini|kisisel|hediye|yaptiriyorum|arkadasima|bos|sekilde|dm|uzerinde|konum|adresi|adres|mah|mahallesi|cad|caddesi|sok|sokak|no:)\b/;

const BUSINESS_WORDS = /\b(kafe|cafe|coffee|kahve|restoran|restaurant|lokanta|lokantasi|kuafor|kuaforu|berber|berberi|guzellik|beauty|market|marketi|bakkal|eczane|eczanesi|doner|kebap|kebab|pide|pizza|burger|firin|pastane|pastanesi|unlu|avm|ltd|sti|a\.?s|insaat|emlak|oto|otomotiv|yikama|tamir|servis|gida|tekstil|butik|magaza|magazasi|kuyumcu|kuyumculuk|mucevherat|optik|klinik|klinigi|poliklinigi|dis|hastane|studyo|studio|ajans|mobilya|elektrik|elektronik|nakliyat|turizm|otel|pansiyon|cicek|cicekcilik|organizasyon|sanayi|ticaret|koftecisi|kofteci|tatlici|tantuni|cigkofte|spor|fitness|gym|club|kulubu|dernek|vakfi|okulu|kurs|kursu|akademi|sigorta|muhasebe|hukuk|avukatlik|petshop|veteriner|dugun|salonu|salon|tesisleri|home|shop|store|zuccaciye|taksi|iletisim|parfum|atolye|atolyesi|hirdavat|aksesuar|perakende|grup|limited|sirketi|sirket|ticaret|yazilim|garage|garaj|repair|lastik|aktar|pilates|yoga|nail|bar|mutfak|ekmek|abiye|outlet|gold|motor|moto|cars|car|oto|teknik|medikal|saglik|sagligi)\b/;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const URL_RE = /(?:https?:\/\/|www\.)[^\s,;<>"]+|\b(?:g\.page|maps\.app\.goo\.gl|goo\.gl|share\.google|instagram\.com|wa\.me)\/[^\s,;<>"]+/gi;
const HANDLE = /[A-Za-z0-9._]{2,30}/;

const isFillerWord = (w: string) => FILLER.has(fold(w).replace(/[^a-z]/g, ''));

function trimFiller(s: string): string {
  const words = s.split(/\s+/).filter(Boolean);
  while (words.length && isFillerWord(words[0])) words.shift();
  while (words.length && isFillerWord(words[words.length - 1])) words.pop();
  return words.join(' ');
}

const cleanName = (s: string) =>
  s
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, ' ') // emoji
    .replace(/\([^)]*\)?/g, ' ') // parantez içi açıklamalar: "(işletme ismi)", "( otomatik mesaj)"
    .replace(/[*_"`)]/g, ' ')
    .replace(/^\s*(?:\d{1,2}\s*[.)\-]+|\d{1,2}(?=\s+\p{L}))\s*/u, '') // liste numarası: "1.", "2-)", "1 ELYAN"
    .replace(/\s+/g, ' ')
    .replace(/^[\s.\-:/=>#)(]+|[\s.\-:/=>#(]+$/g, '')
    .trim();

// Tamamı küçük harfle yazılmışsa baş harfleri büyüt ("ahmet yılmaz" -> "Ahmet Yılmaz"); diğer durumlarda dokunma
function tidyCase(s: string): string {
  if (s !== s.toLocaleLowerCase('tr')) return s;
  return s.replace(/(^|\s)(\p{L})/gu, (_, sp, ch) => sp + ch.toLocaleUpperCase('tr'));
}

const isBusiness = (s: string) => BUSINESS_WORDS.test(fold(s));
const isSentence = (s: string) => SENTENCE_WORDS.test(fold(s));

// Kişi adı gibi mi: 2-4 kelime, harf ağırlıklı, rakam yok, cümle değil
function isPersonName(s: string): boolean {
  const words = s.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 4 && !/\d|@|:|\?|!/.test(s) && !isSentence(s) && words.every((w) => /^\p{L}[\p{L}.'-]*$/u.test(w));
}

// İşletme/başlık gibi mi: 1-12 kelime (şirket unvanları uzun olabilir), cümle değil, tek kelimeyse etiket/dolgu değil
function isTitleLike(s: string): boolean {
  const words = s.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  if (words.length === 1 && (isFillerWord(words[0]) || words[0].length < 3 || /^[@#]/.test(words[0]))) return false;
  if (/^(?:i[a-z]{1,5}gr?am|insta|whats?app|google)$/.test(fold(words[0])) && words.length === 1) return false;
  return words.length >= 1 && words.length <= 12 && /\p{L}{2,}/u.test(s) && !isSentence(s) && !/[?!@]/.test(s);
}

// "Berberim Alınteri Kuaför Musa bozkaya" -> işletme "Berberim Alınteri Kuaför" + kişi "Musa bozkaya"
function splitBusinessAndPerson(s: string): { business?: string; person?: string } {
  const words = s.split(/\s+/);
  let last = -1;
  words.forEach((w, i) => BUSINESS_WORDS.test(fold(w)) && (last = i));
  if (last >= 0 && last < words.length - 1) {
    const person = words.slice(last + 1).join(' ');
    if (isPersonName(person)) return { business: words.slice(0, last + 1).join(' '), person };
  }
  return isBusiness(s) ? { business: s } : isPersonName(s) ? { person: s } : {};
}

// ---------------------------------------------------------------------------------------------
// Etiketler (katlanmış metinde aranır)

type Label = { key: TextField; re: RegExp };
const LABELS: Label[] = [
  { key: 'account_holder', re: /(?:hesap\s*sahibi(?:nin)?|iban\s*sahibi|iban\s*(?:isim|ismi|adi)|alici|hesap\s*adi|hesap\s*ismi)(?:\s*(?:adi\s*soyadi|ad\s*soyad|adi|ismi|isim))?(?![a-z])/g },
  // (?![a-z]): etiket tam kelime olmalı — "…Limited Şirketi" içindeki "şirket" etiket sanılmasın
  { key: 'business_name', re: /(?:(?:(?:isletme|isetlme|isleme)(?:nin)?|firma(?:nin)?|dukkan(?:in)?|magaza(?:nin)?|sirket(?:in)?|kurum)(?:\s*(?:adi|ismi|unvani))?|kartta\s*(?:yazacak|yazilacak|yazsin)\s*(?:isim|baslik|yazi)?|baslik)(?![a-z])/g },
  { key: 'job_title', re: /(?:unvan(?:i|im)?|meslek(?:i|im)?|pozisyon(?:u|um)?|gorev(?:i|im)?)(?![a-z])/g },
  { key: 'full_name', re: /(?:ad[\s\-]*soyad(?:i|im)?|adi\s*soyadi|isim\s*soyisim|ismim|adim)(?=[\s:=\-]|$)|(?:isim|ad)(?=\s*[:=])/g },
];

// Satırdan etiketi atıp değeri al: "Google haritalarda yazan ismimiz:EFSANE ABİYE" -> "EFSANE ABİYE"
function valueAfterLabel(line: string, labelEnd: number): string {
  const rest = line.slice(labelEnd);
  const sep = rest.match(/^[^:=]*?[:=]/); // en yakın ':' veya '='
  const v = sep && sep[0].length < 40 ? rest.slice(sep[0].length) : rest;
  return v.replace(/^[\s.\-:=>)(#]+/, '');
}

// ---------------------------------------------------------------------------------------------

export function parseOrderNote(
  note: string | null | undefined,
  opts: { productTitles?: string[]; buyerName?: string } = {}
): ParsedNote {
  const text = cleanText(note || '');
  const titles = (opts.productTitles || []).map(decodeEntities);
  const card_types = detectCardTypes(titles, text);
  const card_type: CardType = card_types[0] ?? 'other';
  const fields: ExtractedFields = {};
  const warnings: string[] = [];
  const guessed: string[] = [];
  const has = (t: CardType) => card_types.includes(t);

  // Bulunan parçaları metinden "sil" (aynı uzunlukta boşlukla değiştir ki konumlar ve satırlar kaymasın)
  let work = text;
  const blank = (s: Span) => {
    const piece = work.slice(s.start, s.end).replace(/[^\n]/g, ' ');
    work = work.slice(0, s.start) + piece + work.slice(s.end);
  };

  // 1) Linkler ve e-posta
  for (const m of work.matchAll(EMAIL_RE)) {
    fields.email ??= m[0];
    blank({ start: m.index!, end: m.index! + m[0].length });
  }
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.),]+$/, '');
    const full = /^https?:/i.test(url) ? url : `https://${url}`;
    const f = fold(url);
    const insta = url.match(/instagram\.com\/([\w.]+)/i);
    if (insta) fields.instagram ??= insta[1].replace(/\.$/, '');
    else if (/search\.google\.com\/local\/writereview|g\.page\/r\/[\w-]+\/review/.test(f)) fields.google_review ??= full;
    else if (/share\.google|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|google\.[a-z.]+\/maps|maps\.google/.test(f)) fields.google_link ??= full;
    else if (/wa\.me|whatsapp\.com/.test(f)) fields.whatsapp_link ??= full;
    else if (/google\.[a-z.]+\/search/.test(f)) {
      // Google arama linki: işletme adı q= parametresinde
      fields.google_link ??= full;
      try {
        const q = new URL(full).searchParams.get('q');
        if (q) fields.google_name ??= q.trim();
      } catch {
        /* bozuk link */
      }
    } else if (/taptap/.test(f)) {
      // müşteri mevcut bir TapTap kartının linkini yazmış
      const slug = full.replace(/[?#].*$/, '').split('/').filter(Boolean).pop();
      if (slug && !/taptap/.test(slug)) fields.taptap_slug ??= slug;
    } else if (!/google\.com\/goto/.test(f)) fields.website ??= full;
    blank({ start: m.index!, end: m.index! + m[0].length });
  }

  // 2) IBAN'lar
  const ibanHits = findIbans(work);
  ibanHits.forEach(blank);

  // Banka adı yazılmışsa ("/ Garanti", "Ziraat bankası") isim sanılmasın
  // (katlanmış metinde aranır: "GARANTİ BANKASI" gibi Türkçe büyük harfler de yakalansın; konumlar aynı)
  const bankRe = /(?<!\p{L})(ziraat(?:\s*katilim)?|halk\s*bank|vakif\s*bank|vakif|garanti(?:\s*bbva)?|akbank|yapi\s*kredi|is\s*bankasi|deniz\s*bank|qnb|finansbank|en\s*para|teb|ing|kuveyt\s*turk|albaraka(?:\s*turk)?|turkiye\s*finans|sekerbank|odeabank|papara|nkolay|hsbc)(?:\s*bankasi)?(?!\p{L})/gu;
  const bankMentions: (Span & { name: string })[] = [];
  for (const fm of fold(work).matchAll(bankRe)) {
    const m = { index: fm.index, 0: work.slice(fm.index!, fm.index! + fm[0].length) };
    bankMentions.push({ start: m.index!, end: m.index! + m[0].length, name: m[0].trim() });
    blank({ start: m.index!, end: m.index! + m[0].length });
  }

  // 3) Telefonlar
  const phones: { phone: string; kind: string }[] = [];
  for (const m of work.matchAll(PHONE_CANDIDATE_RE)) {
    const p = normalizeWhatsapp(m[0]);
    if (p) {
      if (!phones.some((x) => x.phone === p.phone)) phones.push(p);
      blank({ start: m.index!, end: m.index! + m[0].length });
    }
  }
  if (phones.length) {
    fields.phone = phones[0].phone;
    if (phones[0].kind === 'landline') warnings.push('Sabit hat numarası: WhatsApp Business kullanılıyorsa çalışır, kontrol et');
    if (phones[0].kind === 'foreign') warnings.push('Yabancı numara (Türkiye dışı), kontrol et');
  }
  if (phones.length > 1) warnings.push(`Notta ${phones.length} farklı telefon var, ilki alındı`);

  // Satırlar (konumlar orijinal metinle aynı)
  const lines: { text: string; start: number }[] = [];
  {
    let pos = 0;
    for (const l of work.split('\n')) {
      lines.push({ text: l, start: pos });
      pos += l.length + 1;
    }
  }
  const lineAt = (idx: number) => lines.findIndex((l) => idx >= l.start && idx <= l.start + l.text.length);
  const setLine = (i: number, value: string) => {
    blank({ start: lines[i].start, end: lines[i].start + lines[i].text.length });
    lines[i].text = value;
  };

  // 4) Google işletme adı: "Google: X", "Google haritalar : X", "Goggle adı. X", "Google için X", "Harita ismi X"
  // Aynı satırda başka etiket varsa ("Google: X   İnstagram: y") sadece Google kısmı alınır.
  const OTHER_LABEL = /\s{3,}|\b(?:i[a-z]{1,5}gr?am\S*|insta|whats?\S*|watsap\S*|iban|tel(?:efon)?)\b/;
  for (let i = 0; i < lines.length; i++) {
    const f = fold(lines[i].text);
    const g = f.match(/go+g+l?e\S*|\bharita\S*|\bmaps\b/);
    if (!g) continue;
    const afterLabel = g.index! + g[0].length;
    const stop = f.slice(afterLabel).search(OTHER_LABEL);
    const segEnd = stop === -1 ? lines[i].text.length : afterLabel + stop;
    let v = cleanName(valueAfterLabel(lines[i].text.slice(0, segEnd), afterLabel));
    // "Google haritalar" / "yorum" / "için" gibi etiket kelimelerini baştan at
    // (?!\p{L}): sadece tam kelime — "Demir" içindeki "De" silinmesin
    v = v.replace(/^((?:haritalar\S*|harita\S*|maps|yorum\S*|ad[ıi]\S*|isim\S*|ism\S*|hesab\S*|i[çc]in|nfc|card|kart\S*|i[şs]letme\S*|yazan|profil\S*|sayfa\S*|konum\S*|link\S*|de|da)(?!\p{L})\s*[:.=\-]*\s*)+/iu, '');
    v = v.replace(/\s+olarak\s+ge[çc]iyor.*$/i, '').replace(/\s+\S+\s+olan\b.*$/i, '').replace(/\/.*$/, ''); // "... bornovada olan"
    v = trimFiller(cleanName(v));
    if (!v && lines[i + 1] && isTitleLike(cleanName(lines[i + 1].text)) && !/@|https?:/.test(lines[i + 1].text)) {
      v = cleanName(lines[i + 1].text);
      setLine(i + 1, '');
    }
    if (v && isTitleLike(v) && !fields.google_name) fields.google_name = tidyCase(v);
    // sadece Google kısmını sil; satırın geri kalanı (ör. Instagram etiketi) kalsın
    blank({ start: lines[i].start, end: lines[i].start + segEnd });
    lines[i].text = work.slice(lines[i].start, lines[i].start + lines[i].text.length);
  }

  // 5) Instagram kullanıcı adı: "İnstagram : handle", "ins: handle", "handle İnstagram", "@handle"
  if (!fields.instagram) {
    for (let i = 0; i < lines.length && !fields.instagram; i++) {
      const l = lines[i].text;
      const f = fold(l);
      const lab = f.match(/\b(?:i[a-z]{1,5}gr?am[a-z]*|insta|ins|ig)\b/);
      if (lab) {
        // "instagram/handle", "İnstagram: handle", "instagram adı “handle”"
        let v = l.slice(lab.index! + lab[0].length).replace(/^[\s:=/\-.>]+/, '');
        v = valueAfterLabel(v, 0).trim();
        v = v.replace(/^(ad[ıi]\S*|adres\S*|hesab\S*|sayfa\S*|kullan[ıi]c[ıi]\s*ad[ıi])\s*[:.=\-]*\s*/i, '').replace(/^["'“”]+/, '').replace(/^@/, '');
        let handle = v.match(new RegExp('^' + HANDLE.source))?.[0];
        // "handle İnstagram" (etiket sonda)
        if (!handle) handle = l.slice(0, lab.index!).trim().match(new RegExp(HANDLE.source + '$'))?.[0];
        // değer sonraki satırlarda (arada boş satır olabilir)
        for (let k = i + 1; !handle && k < Math.min(lines.length, i + 4); k++) {
          const t = lines[k].text.trim();
          if (!t) continue;
          handle = t.replace(/^@/, '').match(new RegExp('^' + HANDLE.source + '$'))?.[0];
          if (handle) setLine(k, '');
          break;
        }
        if (handle && handle.length >= 4 && !FILLER.has(fold(handle)) && /[a-z]/i.test(handle)) {
          fields.instagram = handle.replace(/\.$/, '');
          setLine(i, '');
        }
      }
    }
    if (!fields.instagram) {
      const at = work.match(/(?:^|[\s:(])@\s?([A-Za-z0-9._]{2,30})/);
      if (at) {
        fields.instagram = at[1].replace(/\.$/, '');
        const idx = work.indexOf(at[0]);
        blank({ start: idx, end: idx + at[0].length });
      }
    }
    // Instagram kartı var ama etiket yok: tek başına "gardrobeankara" gibi bir satır kullanıcı adıdır
    if (!fields.instagram && has('instagram')) {
      const i = lines.findIndex((l) => /^[a-z0-9._]{3,30}$/.test(l.text.trim()) && /[a-z]/.test(l.text) && !FILLER.has(l.text.trim()));
      if (i >= 0) {
        fields.instagram = lines[i].text.trim().replace(/\.$/, '');
        setLine(i, '');
        guessed.push('instagram');
      }
    }
  }
  if (fields.instagram) {
    // "…@handle" metinde tekrar yazıldıysa isim sanılmasın
    for (let i = 0; i < lines.length; i++) if (fold(lines[i].text).trim().replace(/^@/, '') === fold(fields.instagram)) setLine(i, '');
  }

  // 6) Etiketli alanlar
  const folded = fold(work);
  const labelHits: { key: TextField; start: number; end: number }[] = [];
  for (const { key, re } of LABELS) {
    for (const m of folded.matchAll(re)) {
      const start = m.index!;
      if (start > 0 && /\p{L}/u.test(folded[start - 1])) continue;
      if (labelHits.some((h) => start < h.end && start + m[0].length > h.start)) continue;
      labelHits.push({ key, start, end: start + m[0].length });
    }
  }
  labelHits.sort((a, b) => a.start - b.start);
  for (let i = 0; i < labelHits.length; i++) {
    const hit = labelHits[i];
    const li = lineAt(hit.start);
    const lineEnd = li >= 0 ? lines[li].start + lines[li].text.length : work.length;
    const next = Math.min(labelHits[i + 1]?.start ?? work.length, lineEnd);
    const rest = work.slice(hit.end, next);
    const cut = rest.search(/[,;|/]|\d|@/);
    const consumed = cut === -1 ? rest.length : cut;
    let span: Span = { start: hit.start, end: hit.end + consumed };
    let v = trimFiller(cleanName(rest.slice(0, consumed).replace(/^[\s:=\-.>)(]+/, '')));
    // "Gastro pimak (işletme ismi)" — etiket sonda: değeri satırın başından al
    if (!v && li >= 0) {
      v = trimFiller(cleanName(work.slice(lines[li].start, hit.start).replace(/[(]\s*$/, '')));
      span = { start: lines[li].start, end: hit.end };
    }
    if (v && (hit.key === 'business_name' ? isTitleLike(v) : isPersonName(v) || isTitleLike(v)) && !fields[hit.key]) {
      fields[hit.key] = tidyCase(v);
      // sadece etiket + değeri sil; aynı satırdaki diğer etiketler kalsın
      blank(span);
      if (li >= 0) lines[li].text = work.slice(lines[li].start, lineEnd);
    } else {
      blank(hit);
      if (li >= 0) lines[li].text = work.slice(lines[li].start, lineEnd);
    }
  }

  // "Ahmet Yılmaz adına"
  if (!fields.account_holder) {
    const m = fold(work).match(/((?:\p{L}+\s+){1,4}\p{L}+)\s+adina\b/u);
    if (m) {
      const start = m.index!;
      const words = trimFiller(cleanName(work.slice(start, start + m[1].length))).split(' ');
      const v = words.slice(-3).join(' ');
      if (words.length >= 2 && isPersonName(v)) {
        fields.account_holder = tidyCase(v);
        blank({ start, end: start + m[0].length });
        const li = lineAt(start);
        if (li >= 0) lines[li].text = work.slice(lines[li].start, lines[li].start + lines[li].text.length);
      }
    }
  }

  // Satırı temizlenmiş aday parçalara böl
  const candidates = (s: string) =>
    s
      .split(/[,;|]+|\s\/\s|\s-\s|\s{3,}/)
      .map((p) => trimFiller(cleanName(p)))
      // Instagram/WhatsApp etiketi içeren parça isim değildir ("İnsatagram ismi X" gibi yazım hataları dahil)
      .filter((p) => p && /\p{L}{2,}/u.test(p) && !isSentence(p) && !/\b(?:i?n?s[a-z]{0,3}t?a?gr?am\S*|insta|whats?\S*|watsap\S*|kaynak)\b/.test(fold(p)));

  // 7) IBAN girdileri: her IBAN için hesap sahibi (aynı satırda, altında ya da üstünde) ve renk
  const ibanLines = ibanHits.map((h) => lineAt(h.start));
  // Düzeni anla: çoklu IBAN'da isimler IBAN'ların üstünde mi altında mı yazılmış?
  // İlk IBAN'ın üstünde kişi adı var ve son IBAN'ın altında yoksa → "isim üstte" düzeni.
  const hasPersonIn = (from: number, to: number) =>
    lines.slice(Math.max(0, from), Math.max(0, to)).some((l) => candidates(l.text).some((c) => !!splitBusinessAndPerson(c).person));
  const namesAbove =
    ibanLines.length > 1 && hasPersonIn(0, ibanLines[0]) && !hasPersonIn(ibanLines[ibanLines.length - 1] + 1, lines.length);

  const entries: IbanEntry[] = ibanHits.map((h, n) => {
    const entry: IbanEntry = { iban: formatIban(h.iban), valid: h.valid };
    const bank = bankFromIban(h.iban);
    if (bank && h.valid) entry.bank = bank;
    const li = ibanLines[n];
    const nextIban = ibanLines[n + 1] ?? lines.length;
    const prevIban = n > 0 ? ibanLines[n - 1] : -1;
    // renk: bu IBAN'dan sonraki satırlarda (bir sonraki IBAN'a kadar) "beyaz" / "siyah"
    const zone = lines.slice(li, nextIban).map((l) => fold(l.text)).join(' ') + ' ' + fold(text.split('\n')[li] ?? '');
    if (/\bbeyaz/.test(zone)) entry.theme = 'white';
    else if (/\bsiyah/.test(zone)) entry.theme = 'black';
    // yazılmış banka adı (IBAN kodundan bulunamadıysa)
    // önce bu IBAN ile sonrakinin arasına, yoksa öncekiyle bunun arasına yazılmış banka adı
    const mention =
      bankMentions.find((b) => { const bl = lineAt(b.start); return bl >= li && bl < nextIban; }) ??
      bankMentions.find((b) => { const bl = lineAt(b.start); return bl > prevIban && bl < li; });
    if (!entry.bank && mention) entry.bank = mention.name;

    const tryLine = (i: number) => {
      if (i < 0 || i >= lines.length || entry.holder) return;
      for (const c of candidates(lines[i].text)) {
        const split = splitBusinessAndPerson(c);
        if (split.person) {
          entry.holder = tidyCase(split.person);
          if (split.business && !fields.business_name) fields.business_name = tidyCase(split.business);
          lines[i].text = '';
          return;
        }
      }
    };
    tryLine(li); // aynı satır: "TR… Mehmet Demir"
    if (namesAbove) {
      // "İsim \n TR…" düzeni: önce üstüne bak
      for (let i = li - 1; i > prevIban && !entry.holder; i--) tryLine(i);
      for (let i = li + 1; i < nextIban && !entry.holder; i++) tryLine(i);
    } else {
      for (let i = li + 1; i < nextIban && !entry.holder; i++) tryLine(i); // altındaki satırlar
      for (let i = li - 1; i > prevIban && !entry.holder; i--) tryLine(i); // üstündeki satırlar
    }
    // Kişi adı yoksa: IBAN'ın hemen altındaki şirket adı hesap sahibidir (şirket hesabı, ör. "… Ltd. Şti.")
    for (let i = li + 1; i < nextIban && !entry.holder; i++) {
      const c = candidates(lines[i].text)[0];
      if (c && isBusiness(c) && isTitleLike(c.replace(/[.]/g, ' '))) {
        entry.holder = tidyCase(c);
        if (!fields.business_name) fields.business_name = entry.holder;
        lines[i].text = '';
      } else if (c) break;
    }
    return entry;
  });

  // 8) Etiketsiz kalan satırlar: işletme adı ve kişi adı
  for (const l of lines) {
    for (const c of candidates(l.text)) {
      const split = splitBusinessAndPerson(c);
      if (split.business && !fields.business_name) {
        fields.business_name = tidyCase(split.business);
        guessed.push('işletme adı');
      }
      if (split.person) {
        const key: TextField = has('iban') && !entries.length && !fields.account_holder ? 'account_holder' : 'full_name';
        if (!fields[key]) {
          fields[key] = tidyCase(split.person);
          guessed.push(key === 'account_holder' ? 'hesap sahibi' : 'ad soyad');
        }
      } else if (!split.business && !fields.business_name && isTitleLike(c) && c.split(' ').length <= 5 && (has('iban') || has('google'))) {
        // İşletme kelimesi olmayan başlık ("Nazar Züccaciye" gibi değil, "Dünyamarketim" gibi)
        fields.business_name = tidyCase(c);
        guessed.push('işletme adı');
      }
    }
  }

  // Hesap sahibi bulunamayan IBAN'lar: notta şirket unvanı varsa hesap şirkete aittir
  // (kişi adı etiketle yazılmışsa bu kural uygulanmaz)
  if (fields.business_name && isBusiness(fields.business_name) && !fields.account_holder && !fields.full_name) {
    for (const e of entries) if (!e.holder) e.holder = fields.business_name;
  }

  // IBAN alanlarını ilk girdiden doldur
  if (entries.length) {
    const first = entries.find((e) => e.valid) ?? entries[0];
    fields.iban = first.iban;
    if (first.bank) fields.bank = first.bank;
    if (first.theme) fields.theme = first.theme;
    if (!fields.account_holder && first.holder) {
      fields.account_holder = first.holder;
      if (!labelHits.some((h) => h.key === 'account_holder')) guessed.push('hesap sahibi');
    }
    if (entries.length > 1) fields.ibans = entries;
    const invalid = entries.filter((e) => !e.valid).length;
    if (invalid) warnings.push(entries.length > 1 ? `${invalid} IBAN hatalı görünüyor (kontrol hanesi tutmuyor)` : 'IBAN hatalı görünüyor (kontrol hanesi tutmuyor)');
    if (entries.length > 1) warnings.push(`Bu siparişte ${entries.length} IBAN kartı var — her biri için ayrı profil oluştur`);
  } else if (bankMentions.length) {
    fields.bank = bankMentions[0].name;
  }
  if (!fields.theme) {
    const f = fold(text);
    if (/\bbeyaz/.test(f) && !/\bsiyah/.test(f)) fields.theme = 'white';
    else if (/\bsiyah/.test(f) && !/\bbeyaz/.test(f)) fields.theme = 'black';
  }
  // IBAN kartında kişi adı ad soyad alanına düştüyse hesap sahibine taşı
  if (has('iban') && !fields.account_holder && fields.full_name) {
    fields.account_holder = fields.full_name;
    delete fields.full_name;
  }
  // Google adı yoksa işletme adını kullan
  if (has('google') && !fields.google_name && fields.business_name) fields.google_name = fields.business_name;

  // 9) Tipe göre eksik kontrolü
  if (has('whatsapp') && !fields.phone && !fields.whatsapp_link) warnings.push('Notta telefon numarası bulunamadı');
  if (has('iban')) {
    if (!entries.length) warnings.push('Notta IBAN bulunamadı');
    if (!fields.account_holder) {
      fields.account_holder = opts.buyerName;
      if (fields.account_holder) warnings.push('Hesap sahibi notta yok, alıcı adı kullanıldı');
    }
  }
  if (has('google') && !fields.google_review && !fields.google_link && !fields.google_name && !fields.website && text.trim()) {
    warnings.push('Notta Google işletme adı ya da linki bulunamadı');
  }
  if (has('instagram') && !fields.instagram && text.trim()) warnings.push('Notta Instagram kullanıcı adı bulunamadı');
  if (guessed.length) warnings.push(`Kontrol et: ${[...new Set(guessed)].join(', ')} etiketsiz yazılmış, tahmin edildi`);
  if (!text.trim()) warnings.push('Sipariş notu boş');

  if (card_types.length > 1) fields.card_types = card_types;
  for (const k of Object.keys(fields) as (keyof ExtractedFields)[]) if (fields[k] === undefined || fields[k] === '') delete fields[k];
  return { card_type, card_types, fields, warnings };
}

// ---------------------------------------------------------------------------------------------
// Karta yazılacak link

export const googleReviewUrl = (placeId: string) => `https://search.google.com/local/writereview?placeid=${placeId}`;

// Belirli bir kart tipi için karta yazılacak link (elle girilen card_link sadece ana tipte önceliklidir)
export function cardLinkFor(type: CardType, f: ExtractedFields, profileUrl?: string): string | undefined {
  switch (type) {
    case 'whatsapp':
      return f.phone ? `https://wa.me/${f.phone}` : f.whatsapp_link;
    case 'iban':
    case 'premium':
      return profileUrl;
    case 'google':
      // Doğrudan yorum ekranı linki öncelikli; yoksa müşterinin gönderdiği link
      return f.google_review || profileUrl || f.google_link;
    case 'instagram':
      return f.instagram ? `https://instagram.com/${f.instagram}` : undefined;
    default:
      return f.website || profileUrl;
  }
}

export function defaultCardLink(type: CardType, f: ExtractedFields, profileUrl?: string): string | undefined {
  if (f.card_link) return f.card_link;
  if (type === 'google') return f.google_review || profileUrl || f.google_link || f.website;
  if (type === 'instagram') return cardLinkFor(type, f) ?? f.website;
  return cardLinkFor(type, f, profileUrl);
}

export function slugify(s: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' };
  return s
    .replace(/[çğıöşüİ]/g, (c) => map[c] || c)
    .replace(/[ÇĞÖŞÜ]/g, (c) => map[c.toLowerCase()] || c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
