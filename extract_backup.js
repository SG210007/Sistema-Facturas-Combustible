const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Abrir la BD antigua
const dbPath = path.join(__dirname, 'server', 'facturas.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error abriendo BD:', err);
        process.exit(1);
    }
    console.log('✅ BD abierta correctamente');
});

// Obtener todas las facturas
db.all('SELECT * FROM facturas ORDER BY fecha DESC, hora DESC', (err, facturas) => {
    if (err) {
        console.error('❌ Error obteniendo facturas:', err);
        process.exit(1);
    }
    
    console.log(`\n📊 FACTURAS ENCONTRADAS: ${facturas.length}\n`);
    
    if (facturas.length > 0) {
        console.log('Primeras 5 facturas:');
        facturas.slice(0, 5).forEach(f => {
            console.log(`- ${f.codigo}: ${f.fecha} - ${f.descripcion} - $${f.total}`);
        });
        
        // Guardar como JSON para importar después
        fs.writeFileSync(
            path.join(__dirname, 'backup_facturas.json'), 
            JSON.stringify(facturas, null, 2)
        );
        console.log('\n✅ Datos guardados en: backup_facturas.json');
    } else {
        console.log('No hay facturas en la BD');
    }
    
    db.close();
});
