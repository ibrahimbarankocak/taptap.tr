import { createClient, Client } from '@libsql/client';

// Singleton yapısı ile istemciyi sadece ihtiyaç duyulduğunda ve bir kez oluşturuyoruz
let dbInstance: Client | null = null;

const getDb = () => {
  if (!dbInstance) {
    const url = process.env.TURSO_DATABASE_URL || 'libsql://dummy-url.turso.io';
    const authToken = process.env.TURSO_AUTH_TOKEN || 'dummy-token';

    dbInstance = createClient({
      url: url,
      authToken: authToken,
    });
  }
  return dbInstance;
};

// Projedeki mevcut import yapısının bozulmaması için Proxy kullanıyoruz
const db = new Proxy({} as Client, {
  get(target, prop) {
    const client = getDb();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default db;