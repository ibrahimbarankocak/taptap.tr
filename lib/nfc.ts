// Web NFC yardımcıları (sadece tarayıcı; Android Chrome + https).
// TS lib'inde Web NFC tipleri olmadığı için ihtiyaç duyduğumuz kısmı burada tanımlıyoruz.

type NdefRecordInit = { recordType: 'url' | 'text' | 'empty'; data?: string };
type NdefRecord = { recordType: string; mediaType?: string; encoding?: string; data?: DataView };
type NdefReadingEvent = { serialNumber: string; message: { records: NdefRecord[] } };
type NdefReader = {
  write: (msg: { records: NdefRecordInit[] }, opts?: { signal?: AbortSignal }) => Promise<void>;
  scan: (opts?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((e: NdefReadingEvent) => void) | null;
  onreadingerror: (() => void) | null;
};

export type NfcCardContent = { serialNumber: string; records: { type: string; value: string }[] };

export const hasNfc = () => typeof window !== 'undefined' && 'NDEFReader' in window;

const newReader = () => new (window as unknown as { NDEFReader: new () => NdefReader }).NDEFReader();

export const errorMessage = (e: unknown) => {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError') return 'NFC izni verilmedi (tarayıcı ayarlarından izin ver)';
    if (e.name === 'NotSupportedError') return 'Bu cihaz NFC desteklemiyor ya da NFC kapalı';
    if (e.name === 'AbortError') return 'İşlem iptal edildi / süre doldu';
    if (e.name === 'NetworkError') return 'Kart ile bağlantı koptu, kartı sabit tut ve tekrar dene';
  }
  return e instanceof Error ? e.message : String(e);
};

const withTimeout = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer), abort: () => controller.abort() };
};

const TIMEOUT_MS = 20000;

// Karta tek bir kayıt yazar (url / text). Kart yaklaştırılınca tamamlanır.
export async function writeNfc(value: string, type: 'url' | 'text' = 'url') {
  const t = withTimeout(TIMEOUT_MS);
  try {
    await newReader().write({ records: [{ recordType: type, data: value }] }, { signal: t.signal });
  } finally {
    t.done();
  }
}

// Kartı siler: içeriği tek bir boş kayıtla değiştirir (kart tekrar yazılabilir kalır)
export async function wipeNfc() {
  const t = withTimeout(TIMEOUT_MS);
  try {
    await newReader().write({ records: [{ recordType: 'empty' }] }, { signal: t.signal });
  } finally {
    t.done();
  }
}

const decodeRecord = (r: NdefRecord) => {
  if (r.recordType === 'empty') return '';
  if (!r.data) return '';
  return new TextDecoder(r.encoding || 'utf-8').decode(r.data);
};

// Kartı okur; ilk okunan kartın içeriğini döner
export function readNfc(): Promise<NfcCardContent> {
  return new Promise((resolve, reject) => {
    const t = withTimeout(TIMEOUT_MS);
    const reader = newReader();
    reader.onreading = ({ serialNumber, message }) => {
      t.done();
      t.abort(); // taramayı durdur
      resolve({
        serialNumber,
        records: message.records
          .filter((r) => r.recordType !== 'empty')
          .map((r) => ({ type: r.mediaType || r.recordType, value: decodeRecord(r) })),
      });
    };
    reader.onreadingerror = () => {
      t.done();
      t.abort();
      reject(new Error('Kart okunamadı; kart boş/formatsız olabilir ya da çok çabuk çekildi'));
    };
    t.signal.addEventListener('abort', () => reject(new DOMException('Süre doldu', 'AbortError')));
    reader.scan({ signal: t.signal }).catch((e) => {
      t.done();
      reject(e);
    });
  });
}
