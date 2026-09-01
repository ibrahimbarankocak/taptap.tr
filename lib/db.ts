import { createClient } from '@libsql/client';

// Vercel build aşamasında veya lokalde değişkenler okunamazsa boş string vererek build'in çökmesini engelliyoruz
const url = process.env.TURSO_DATABASE_URL || '';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

const db = createClient({
  url: url,
  authToken: authToken,
});

export default db;