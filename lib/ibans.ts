import db from '@/lib/db';
import { ensureTable } from '@/lib/schema';

// IBAN kartındaki ek IBAN'lar. İlk IBAN her zamanki gibi customers.iban / account_holder'da kalır;
// böylece tek IBAN'lı kartlar (mevcut tüm kartlar) hiç değişmez.
export async function ensureIbanTable() {
  await ensureTable('customer_ibans', [
    ['id', 'INTEGER PRIMARY KEY AUTOINCREMENT'],
    ['customer_id', 'INTEGER NOT NULL'],
    ['iban', 'TEXT NOT NULL'],
    ['holder', 'TEXT'],
    ['position', 'INTEGER NOT NULL DEFAULT 0'],
  ]);
}

// Bir müşterinin ek IBAN'larını tamamen yenileyen SQL ifadeleri (toplu işlem içinde kullanılır).
// customerRef: müşteri id'si ya da (yeni kayıtta) slug üzerinden alt sorgu
export function replaceExtraIbansStatements(
  customerRef: { id: string | number } | { slug: string },
  extras: { iban: string; holder: string }[]
) {
  const idSql = 'id' in customerRef ? '?' : '(SELECT id FROM customers WHERE slug = ?)';
  const idArg = 'id' in customerRef ? customerRef.id : customerRef.slug;
  return [
    { sql: `DELETE FROM customer_ibans WHERE customer_id = ${idSql}`, args: [idArg] },
    ...extras.map((e, i) => ({
      sql: `INSERT INTO customer_ibans (customer_id, iban, holder, position) VALUES (${idSql}, ?, ?, ?)`,
      args: [idArg, e.iban, e.holder, i + 1],
    })),
  ];
}

export async function getExtraIbans(customerId: string | number) {
  const r = await db.execute({ sql: 'SELECT iban, holder FROM customer_ibans WHERE customer_id = ? ORDER BY position, id', args: [customerId] });
  return r.rows.map((x) => ({ iban: String(x.iban), holder: String(x.holder ?? '') }));
}
