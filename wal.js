const Database = require('better-sqlite3');
const db = new Database('taptap.sqlite'); // Resimdeki dosya adın
db.pragma('journal_mode = WAL');
console.log('Dosya WAL moduna geçirildi, artık Tursoya yüklenebilir!');
db.close();