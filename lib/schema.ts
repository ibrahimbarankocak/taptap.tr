import db from '@/lib/db';

// Tabloyu yoksa oluşturur; varsa eksik kolonları ekler (sadece EKLEME — asla silme/değiştirme yok).
// Neden: "CREATE TABLE IF NOT EXISTS" var olan tabloya yeni kolon eklemez. Kodda kolon eklenince
// canlıdaki eski tablo geride kalıyor ve INSERT'ler "no column named ..." hatası veriyordu.
const ready = new Set<string>();

export async function ensureTable(name: string, columns: [column: string, definition: string][]) {
  if (ready.has(name)) return;
  if (!/^[a-z_]+$/.test(name)) throw new Error('Geçersiz tablo adı');

  await db.execute(`CREATE TABLE IF NOT EXISTS ${name} (${columns.map(([c, d]) => `${c} ${d}`).join(', ')})`);

  const existing = new Set((await db.execute(`PRAGMA table_info(${name})`)).rows.map((r) => String(r.name)));
  for (const [column, definition] of columns) {
    if (existing.has(column)) continue;
    // ALTER TABLE ADD COLUMN: PRIMARY KEY / UNIQUE eklenemez; bunlar zaten tablo ilk oluşurken gelir
    const def = definition.replace(/\bPRIMARY KEY\b|\bAUTOINCREMENT\b|\bUNIQUE\b/gi, '').trim();
    await db.execute(`ALTER TABLE ${name} ADD COLUMN ${column} ${def}`);
  }
  ready.add(name);
}
