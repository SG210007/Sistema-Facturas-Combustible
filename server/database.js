const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        // Ruta de la base de datos (se creará en la carpeta del proyecto)
        this.dbPath = path.join(__dirname, 'facturas.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initDatabase();
    }

    // Inicializar la base de datos
    initDatabase() {
        this.db.serialize(() => {
            // Crear tabla de facturas si no existe
            this.db.run(`
                CREATE TABLE IF NOT EXISTS facturas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo TEXT UNIQUE NOT NULL,
                    numero TEXT NOT NULL,
                    fecha TEXT NOT NULL,
                    hora TEXT NOT NULL,
                    cantidad REAL NOT NULL,
                    unidad TEXT NOT NULL,
                    descripcion TEXT NOT NULL,
                    precio REAL NOT NULL,
                    ventasGravadas REAL NOT NULL,
                    fovial REAL NOT NULL,
                    cotrans REAL NOT NULL,
                    iva REAL NOT NULL,
                    total REAL NOT NULL,
                    observaciones TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla:', err);
                } else {
                    console.log('✅ Tabla de facturas lista - Listo para agregar nuevas facturas');
                }
            });

            // Crear tabla de depósitos si no existe
            this.db.run(`
                CREATE TABLE IF NOT EXISTS depositos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    monto REAL NOT NULL,
                    fecha TEXT NOT NULL,
                    descripcion TEXT NOT NULL,
                    referencia TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla de depósitos:', err);
                } else {
                    console.log('✅ Tabla de depósitos lista');
                }
            });
        });
    }

    // Insertar datos iniciales si la tabla está vacía (DESHABILITADO)
    insertInitialData() {
        // Función deshabilitada - la BD se crea limpia sin datos de ejemplo
        return;
        this.getAllFacturas((err, facturas) => {
            if (err) {
                console.error('Error verificando datos iniciales:', err);
                return;
            }

            if (facturas.length === 0) {
                const datosIniciales = [
                    {
                        codigo: "GEN-001-2023",
                        numero: "CTRL-001",
                        fecha: "2023-10-15",
                        hora: "08:30",
                        cantidad: 150.50,
                        unidad: "Galones",
                        descripcion: "DIESEL BAJO AZUFRE",
                        precio: 3.85,
                        ventasGravadas: 579.43,
                        fovial: 5.79,
                        cotrans: 2.90,
                        iva: 69.53,
                        total: 657.65,
                        observaciones: "Camión placa ABC-123"
                    },
                    {
                        codigo: "GEN-002-2023",
                        numero: "CTRL-002",
                        fecha: "2023-10-16",
                        hora: "14:15",
                        cantidad: 120.00,
                        unidad: "Galones",
                        descripcion: "GASOLINA SUPER",
                        precio: 4.25,
                        ventasGravadas: 510.00,
                        fovial: 5.10,
                        cotrans: 2.55,
                        iva: 61.20,
                        total: 578.85,
                        observaciones: "Vehículo de servicio"
                    },
                    {
                        codigo: "GEN-003-2023",
                        numero: "CTRL-003",
                        fecha: "2023-10-17",
                        hora: "10:45",
                        cantidad: 200.00,
                        unidad: "Galones",
                        descripcion: "DIESEL BAJO AZUFRE",
                        precio: 3.82,
                        ventasGravadas: 764.00,
                        fovial: 7.64,
                        cotrans: 3.82,
                        iva: 91.68,
                        total: 867.14,
                        observaciones: "Camión placa XYZ-789"
                    },
                    {
                        codigo: "GEN-004-2023",
                        numero: "CTRL-004",
                        fecha: "2023-10-18",
                        hora: "16:20",
                        cantidad: 85.50,
                        unidad: "Galones",
                        descripcion: "DIESEL REGULAR",
                        precio: 3.75,
                        ventasGravadas: 320.63,
                        fovial: 3.21,
                        cotrans: 1.60,
                        iva: 38.48,
                        total: 363.92,
                        observaciones: "Camión placa DEF-456"
                    }
                ];

                datosIniciales.forEach(factura => {
                    this.createFactura(factura, (err) => {
                        if (err) console.error('Error insertando dato inicial:', err);
                    });
                });
                console.log('📊 Datos iniciales insertados');
            }
        });
    }

    // Método para obtener todas las facturas
    getAllFacturas(callback) {
        const query = `SELECT * FROM facturas ORDER BY fecha DESC, hora DESC`;
        this.db.all(query, [], (err, rows) => {
            if (err) {
                callback(err, null);
            } else {
                // Convertir los valores numéricos
                const facturas = rows.map(row => ({
                    id: row.id,
                    codigo: row.codigo,
                    numero: row.numero,
                    fecha: row.fecha,
                    hora: row.hora,
                    cantidad: parseFloat(row.cantidad),
                    unidad: row.unidad,
                    descripcion: row.descripcion,
                    precio: parseFloat(row.precio),
                    ventasGravadas: parseFloat(row.ventasGravadas),
                    fovial: parseFloat(row.fovial),
                    cotrans: parseFloat(row.cotrans),
                    iva: parseFloat(row.iva),
                    total: parseFloat(row.total),
                    observaciones: row.observaciones,
                    created_at: row.created_at
                }));
                callback(null, facturas);
            }
        });
    }

    // Método para obtener una factura por ID
    getFacturaById(id, callback) {
        const query = `SELECT * FROM facturas WHERE id = ?`;
        this.db.get(query, [id], (err, row) => {
            if (err) {
                callback(err, null);
            } else if (!row) {
                callback(new Error('Factura no encontrada'), null);
            } else {
                const factura = {
                    id: row.id,
                    codigo: row.codigo,
                    numero: row.numero,
                    fecha: row.fecha,
                    hora: row.hora,
                    cantidad: parseFloat(row.cantidad),
                    unidad: row.unidad,
                    descripcion: row.descripcion,
                    precio: parseFloat(row.precio),
                    ventasGravadas: parseFloat(row.ventasGravadas),
                    fovial: parseFloat(row.fovial),
                    cotrans: parseFloat(row.cotrans),
                    iva: parseFloat(row.iva),
                    total: parseFloat(row.total),
                    observaciones: row.observaciones,
                    created_at: row.created_at
                };
                callback(null, factura);
            }
        });
    }

    // Método para crear una nueva factura
    createFactura(facturaData, callback) {
        console.log('💾 Guardando factura con fecha:', facturaData.fecha);
        
        const query = `
            INSERT INTO facturas (
                codigo, numero, fecha, hora, cantidad, unidad, 
                descripcion, precio, ventasGravadas, fovial, 
                cotrans, iva, total, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            facturaData.codigo,
            facturaData.numero,
            facturaData.fecha,
            facturaData.hora,
            facturaData.cantidad,
            facturaData.unidad,
            facturaData.descripcion,
            facturaData.precio,
            facturaData.ventasGravadas,
            facturaData.fovial,
            facturaData.cotrans,
            facturaData.iva,
            facturaData.total,
            facturaData.observaciones || ''
        ];

        this.db.run(query, params, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, this.lastID);
            }
        });
    }

    // Método para actualizar una factura
    updateFactura(id, facturaData, callback) {
        const query = `
            UPDATE facturas SET 
                codigo = ?, numero = ?, fecha = ?, hora = ?, 
                cantidad = ?, unidad = ?, descripcion = ?, precio = ?, 
                ventasGravadas = ?, fovial = ?, cotrans = ?, iva = ?, 
                total = ?, observaciones = ?
            WHERE id = ?
        `;
        
        const params = [
            facturaData.codigo,
            facturaData.numero,
            facturaData.fecha,
            facturaData.hora,
            facturaData.cantidad,
            facturaData.unidad,
            facturaData.descripcion,
            facturaData.precio,
            facturaData.ventasGravadas,
            facturaData.fovial,
            facturaData.cotrans,
            facturaData.iva,
            facturaData.total,
            facturaData.observaciones || '',
            id
        ];

        this.db.run(query, params, function(err) {
            if (err) {
                callback(err);
            } else if (this.changes === 0) {
                callback(new Error('Factura no encontrada'));
            } else {
                callback(null);
            }
        });
    }

    // Método para eliminar una factura
    deleteFactura(id, callback) {
        const query = `DELETE FROM facturas WHERE id = ?`;
        
        this.db.run(query, [id], function(err) {
            if (err) {
                callback(err);
            } else if (this.changes === 0) {
                callback(new Error('Factura no encontrada'));
            } else {
                callback(null);
            }
        });
    }

    // Método para buscar facturas
    searchFacturas(searchTerm, callback) {
        const query = `
            SELECT * FROM facturas 
            WHERE codigo LIKE ? OR numero LIKE ? OR descripcion LIKE ? OR observaciones LIKE ?
            ORDER BY fecha DESC, hora DESC
        `;
        const term = `%${searchTerm}%`;
        
        this.db.all(query, [term, term, term, term], (err, rows) => {
            if (err) {
                callback(err, null);
            } else {
                const facturas = rows.map(row => ({
                    id: row.id,
                    codigo: row.codigo,
                    numero: row.numero,
                    fecha: row.fecha,
                    hora: row.hora,
                    cantidad: parseFloat(row.cantidad),
                    unidad: row.unidad,
                    descripcion: row.descripcion,
                    precio: parseFloat(row.precio),
                    ventasGravadas: parseFloat(row.ventasGravadas),
                    fovial: parseFloat(row.fovial),
                    cotrans: parseFloat(row.cotrans),
                    iva: parseFloat(row.iva),
                    total: parseFloat(row.total),
                    observaciones: row.observaciones
                }));
                callback(null, facturas);
            }
        });
    }

    // Cerrar la base de datos
    close() {
        this.db.close();
    }

    // MÉTODOS PARA DEPÓSITOS

    // Obtener todos los depósitos
    getAllDepositos(callback) {
        const query = `SELECT * FROM depositos ORDER BY fecha DESC`;
        this.db.all(query, [], (err, rows) => {
            if (err) {
                callback(err, null);
            } else {
                const depositos = rows.map(row => ({
                    id: row.id,
                    monto: parseFloat(row.monto),
                    fecha: row.fecha,
                    descripcion: row.descripcion,
                    referencia: row.referencia,
                    created_at: row.created_at
                }));
                callback(null, depositos);
            }
        });
    }

    // Crear nuevo depósito
    createDeposito(depositoData, callback) {
        const query = `
            INSERT INTO depositos (monto, fecha, descripcion, referencia)
            VALUES (?, ?, ?, ?)
        `;
        
        const params = [
            depositoData.monto,
            depositoData.fecha,
            depositoData.descripcion,
            depositoData.referencia
        ];

        this.db.run(query, params, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, this.lastID);
            }
        });
    }

    // Actualizar depósito
    updateDeposito(id, depositoData, callback) {
        const query = `
            UPDATE depositos SET 
                monto = ?, fecha = ?, descripcion = ?, referencia = ?
            WHERE id = ?
        `;
        
        const params = [
            depositoData.monto,
            depositoData.fecha,
            depositoData.descripcion,
            depositoData.referencia,
            id
        ];

        this.db.run(query, params, function(err) {
            if (err) {
                callback(err);
            } else if (this.changes === 0) {
                callback(new Error('Depósito no encontrado'));
            } else {
                callback(null);
            }
        });
    }

    // Eliminar depósito
    deleteDeposito(id, callback) {
        const query = `DELETE FROM depositos WHERE id = ?`;
        
        this.db.run(query, [id], function(err) {
            if (err) {
                callback(err);
            } else if (this.changes === 0) {
                callback(new Error('Depósito no encontrado'));
            } else {
                callback(null);
            }
        });
    }

    // Obtener depósitos por mes
    getDepositosByMes(mes, callback) {
        const query = `
            SELECT * FROM depositos 
            WHERE fecha LIKE ? 
            ORDER BY fecha DESC
        `;
        this.db.all(query, [`${mes}%`], (err, rows) => {
            if (err) {
                callback(err, null);
            } else {
                const depositos = rows.map(row => ({
                    id: row.id,
                    monto: parseFloat(row.monto),
                    fecha: row.fecha,
                    descripcion: row.descripcion,
                    referencia: row.referencia
                }));
                callback(null, depositos);
            }
        });
    }

    // Obtener total depositado por mes
    getTotalDepositadoByMes(mes, callback) {
        const query = `
            SELECT SUM(monto) as total FROM depositos 
            WHERE fecha LIKE ?
        `;
        this.db.get(query, [`${mes}%`], (err, row) => {
            if (err) {
                callback(err, 0);
            } else {
                callback(null, row?.total || 0);
            }
        });
    }

    // Obtener total facturado por mes
    getTotalFacturadasByMes(mes, callback) {
        const query = `
            SELECT SUM(total) as total FROM facturas 
            WHERE fecha LIKE ?
        `;
        this.db.get(query, [`${mes}%`], (err, row) => {
            if (err) {
                callback(err, 0);
            } else {
                callback(null, row?.total || 0);
            }
        });
    }

}

// Exportar una instancia única de la base de datos
module.exports = new Database();