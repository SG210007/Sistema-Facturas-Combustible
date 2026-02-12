const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/facturas.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Tablas en la BD:', tables);
    
    if (tables && tables.length > 0) {
        tables.forEach(table => {
            db.all(`SELECT COUNT(*) as count FROM ${table.name}`, (err, result) => {
                console.log(`- ${table.name}: ${result?.[0]?.count || 0} registros`);
            });
        });
    }
    
    setTimeout(() => db.close(), 1000);
});
