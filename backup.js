const fs = require('fs');
const path = require('path');

// Crear carpeta de backups si no existe
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// Copiar base de datos
const dbSource = path.join(__dirname, 'server', 'facturas.db');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const dbBackup = path.join(backupDir, `facturas-backup-${timestamp}.db`);

try {
    fs.copyFileSync(dbSource, dbBackup);
    console.log(`✅ Backup creado: ${dbBackup}`);
    console.log(`📦 Tamaño: ${fs.statSync(dbBackup).size} bytes`);
} catch (err) {
    console.error('❌ Error en backup:', err.message);
}
