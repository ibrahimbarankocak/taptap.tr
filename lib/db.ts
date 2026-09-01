import { createClient } from '@libsql/client';

// Eğer .env okunamazsa uygulama direkt çökmesin, hatayı açıkça göstersin
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("KRİTİK HATA: TURSO_DATABASE_URL veya TURSO_AUTH_TOKEN bulunamadı! Lütfen .env dosyanı kontrol et.");
}

const db = createClient({
  url: url,
  authToken: authToken,
});

export default db;