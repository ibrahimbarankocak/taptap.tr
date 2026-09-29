// İmzalı admin oturum çerezi. Web Crypto kullanır; hem middleware'de hem route handler'larda çalışır.
// Çerez değeri: "<bitişZamanıMs>.<HMAC-SHA256 imzası>" — imza şifreyi bilmeden üretilemez.

export const SESSION_COOKIE = 'taptap_admin_auth';
export const SESSION_MAX_AGE = 60 * 60 * 24; // 1 gün (saniye)

// Ayrı bir secret tanımlanmamışsa admin şifresi anahtar olarak kullanılır;
// şifre değişince tüm oturumlar otomatik düşer.
const getSecret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';

const toBase64Url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(payload: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, enc.encode(`taptap-admin:${payload}`)));
}

export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error('ADMIN_PASSWORD tanımlı değil');
  const expires = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expires}.${await sign(expires, secret)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const secret = getSecret();
  if (!token || !secret) return false;

  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;

  const expected = await sign(expires, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
