const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups');

// Listar backups disponibles
const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('facturas-backup-'))
    .sort()
    .reverse();

if (backups.length === 0) {
    console.log('❌ No hay backups disponibles');
    process.exit(1);
}

console.log('📦 Backups disponibles:\n');
backups.forEach((backup, index) => {
    const filePath = path.join(backupDir, backup);
    const stats = fs.statSync(filePath);
    const date = backup.replace('facturas-backup-', '').replace('.db', '');
    console.log(`${index + 1}. ${date} (${stats.size} bytes)`);
});

// Restaurar el más reciente
const latestBackup = path.join(backupDir, backups[0]);
const dbTarget = path.join(__dirname, 'server', 'facturas.db');

if (process.argv[2] === 'restore') {
    try {
        // Copiar backup a la BD actual
        fs.copyFileSync(latestBackup, dbTarget);
        console.log(`\n✅ Base de datos restaurada desde: ${backups[0]}`);
        console.log('⚠️  Reinicia el servidor para que los cambios tomen efecto');
    } catch (err) {
        console.error('❌ Error en restauración:', err.message);
    }
}
