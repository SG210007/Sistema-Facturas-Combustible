const express = require('express');
const cors = require('cors');
const path = require('path');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// RUTAS DE LA API

// Obtener todas las facturas
app.get('/api/facturas', (req, res) => {
    database.getAllFacturas((err, facturas) => {
        if (err) {
            console.error('Error obteniendo facturas:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        } else {
            res.json(facturas);
        }
    });
});

// Obtener una factura por ID
app.get('/api/facturas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    database.getFacturaById(id, (err, factura) => {
        if (err) {
            if (err.message === 'Factura no encontrada') {
                res.status(404).json({ error: err.message });
            } else {
                console.error('Error obteniendo factura:', err);
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        } else {
            res.json(factura);
        }
    });
});

// Crear nueva factura
app.post('/api/facturas', (req, res) => {
    try {
        const data = req.body;
        
        console.log('📨 Datos recibidos:', {
            codigo: data.codigo,
            fecha: data.fecha,
            hora: data.hora
        });
        
        // Validar datos requeridos
        const camposRequeridos = ['codigo', 'numero', 'fecha', 'hora', 'cantidad', 
                                 'unidad', 'descripcion', 'precio', 'fovial', 'cotrans', 'iva'];
        
        const faltanCampos = camposRequeridos.filter(campo => !data[campo] && data[campo] !== 0);
        
        if (faltanCampos.length > 0) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos', 
                campos: faltanCampos 
            });
        }
        
        // Validar tipos de datos
        if (isNaN(data.cantidad) || data.cantidad <= 0) {
            return res.status(400).json({ error: 'Cantidad inválida' });
        }
        
        if (isNaN(data.precio) || data.precio <= 0) {
            return res.status(400).json({ error: 'Precio inválido' });
        }
        
        // Calcular valores
        const ventasGravadas = parseFloat(data.cantidad) * parseFloat(data.precio);
        const fovial = parseFloat(data.fovial) || 0;
        const cotrans = parseFloat(data.cotrans) || 0;
        const iva = parseFloat(data.iva) || 0;
        const total = ventasGravadas + fovial + cotrans + iva;
        
        const facturaData = {
            codigo: data.codigo,
            numero: data.numero,
            fecha: data.fecha,
            hora: data.hora,
            cantidad: parseFloat(data.cantidad),
            unidad: data.unidad,
            descripcion: data.descripcion,
            precio: parseFloat(data.precio),
            ventasGravadas: ventasGravadas,
            fovial: fovial,
            cotrans: cotrans,
            iva: iva,
            total: total,
            observaciones: data.observaciones || ''
        };
        
        database.createFactura(facturaData, (err, newId) => {
            if (err) {
                console.error('Error creando factura:', err);
                if (err.message.includes('UNIQUE constraint')) {
                    res.status(400).json({ error: 'El código ya existe' });
                } else {
                    res.status(500).json({ error: 'Error interno del servidor' });
                }
            } else {
                res.status(201).json({ 
                    id: newId, 
                    ...facturaData,
                    message: 'Factura creada exitosamente' 
                });
            }
        });
        
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar factura
app.put('/api/facturas/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        const data = req.body;
        
        // Validar datos requeridos
        const camposRequeridos = ['codigo', 'numero', 'fecha', 'hora', 'cantidad', 
                                 'unidad', 'descripcion', 'precio', 'fovial', 'cotrans', 'iva'];
        
        const faltanCampos = camposRequeridos.filter(campo => !data[campo] && data[campo] !== 0);
        
        if (faltanCampos.length > 0) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos', 
                campos: faltanCampos 
            });
        }
        
        // Calcular valores
        const ventasGravadas = parseFloat(data.cantidad) * parseFloat(data.precio);
        const fovial = parseFloat(data.fovial) || 0;
        const cotrans = parseFloat(data.cotrans) || 0;
        const iva = parseFloat(data.iva) || 0;
        const total = ventasGravadas + fovial + cotrans + iva;
        
        const facturaData = {
            codigo: data.codigo,
            numero: data.numero,
            fecha: data.fecha,
            hora: data.hora,
            cantidad: parseFloat(data.cantidad),
            unidad: data.unidad,
            descripcion: data.descripcion,
            precio: parseFloat(data.precio),
            ventasGravadas: ventasGravadas,
            fovial: fovial,
            cotrans: cotrans,
            iva: iva,
            total: total,
            observaciones: data.observaciones || ''
        };
        
        database.updateFactura(id, facturaData, (err) => {
            if (err) {
                console.error('Error actualizando factura:', err);
                if (err.message === 'Factura no encontrada') {
                    res.status(404).json({ error: err.message });
                } else if (err.message.includes('UNIQUE constraint')) {
                    res.status(400).json({ error: 'El código ya existe' });
                } else {
                    res.status(500).json({ error: 'Error interno del servidor' });
                }
            } else {
                res.json({ 
                    id: id,
                    ...facturaData,
                    message: 'Factura actualizada exitosamente' 
                });
            }
        });
        
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar factura
app.delete('/api/facturas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    database.deleteFactura(id, (err) => {
        if (err) {
            console.error('Error eliminando factura:', err);
            if (err.message === 'Factura no encontrada') {
                res.status(404).json({ error: err.message });
            } else {
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        } else {
            res.status(204).send();
        }
    });
});

// Buscar facturas
app.get('/api/facturas/search/:term', (req, res) => {
    const searchTerm = req.params.term;
    
    database.searchFacturas(searchTerm, (err, facturas) => {
        if (err) {
            console.error('Error buscando facturas:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        } else {
            res.json(facturas);
        }
    });
});

// ==================== RUTAS DE DEPÓSITOS ====================

// Obtener todos los depósitos
app.get('/api/depositos', (req, res) => {
    database.getAllDepositos((err, depositos) => {
        if (err) {
            console.error('Error obteniendo depósitos:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        } else {
            res.json(depositos);
        }
    });
});

// Crear nuevo depósito
app.post('/api/depositos', (req, res) => {
    try {
        const data = req.body;
        
        // Validar datos requeridos
        if (!data.monto || !data.fecha || !data.descripcion || !data.referencia) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos: monto, fecha, descripcion, referencia'
            });
        }

        const depositoData = {
            monto: parseFloat(data.monto),
            fecha: data.fecha,
            descripcion: data.descripcion,
            referencia: data.referencia
        };
        
        database.createDeposito(depositoData, (err, newId) => {
            if (err) {
                console.error('Error creando depósito:', err);
                res.status(500).json({ error: 'Error interno del servidor' });
            } else {
                res.status(201).json({ 
                    id: newId, 
                    ...depositoData,
                    message: 'Depósito creado exitosamente' 
                });
            }
        });
        
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar depósito
app.put('/api/depositos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        const data = req.body;
        
        // Validar datos requeridos
        if (!data.monto || !data.fecha || !data.descripcion || !data.referencia) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos: monto, fecha, descripcion, referencia'
            });
        }

        const depositoData = {
            monto: parseFloat(data.monto),
            fecha: data.fecha,
            descripcion: data.descripcion,
            referencia: data.referencia
        };
        
        database.updateDeposito(id, depositoData, (err) => {
            if (err) {
                console.error('Error actualizando depósito:', err);
                if (err.message === 'Depósito no encontrado') {
                    res.status(404).json({ error: err.message });
                } else {
                    res.status(500).json({ error: 'Error interno del servidor' });
                }
            } else {
                res.json({ 
                    id: id,
                    ...depositoData,
                    message: 'Depósito actualizado exitosamente' 
                });
            }
        });
        
    } catch (error) {
        console.error('Error procesando solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar depósito
app.delete('/api/depositos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    
    database.deleteDeposito(id, (err) => {
        if (err) {
            console.error('Error eliminando depósito:', err);
            if (err.message === 'Depósito no encontrado') {
                res.status(404).json({ error: err.message });
            } else {
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        } else {
            res.status(204).send();
        }
    });
});

// Obtener depósitos por mes
app.get('/api/depositos/mes/:month', (req, res) => {
    const mes = req.params.month;
    
    database.getDepositosByMes(mes, (err, depositos) => {
        if (err) {
            console.error('Error obteniendo depósitos del mes:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        } else {
            res.json(depositos);
        }
    });
});

// Ruta para estadísticas
app.get('/api/estadisticas', (req, res) => {
    database.getAllFacturas((err, facturas) => {
        if (err) {
            console.error('Error obteniendo estadísticas:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        } else {
            const totalFacturas = facturas.length;
            const dieselFacturas = facturas.filter(f => f.descripcion === "DIESEL BAJO AZUFRE").length;
            const otrasFacturas = totalFacturas - dieselFacturas;
            
            const totales = facturas.reduce((acc, factura) => {
                acc.ventasGravadas += factura.ventasGravadas;
                acc.fovial += factura.fovial;
                acc.cotrans += factura.cotrans;
                acc.iva += factura.iva;
                acc.total += factura.total;
                return acc;
            }, { ventasGravadas: 0, fovial: 0, cotrans: 0, iva: 0, total: 0 });
            
            res.json({
                totalFacturas,
                dieselFacturas,
                otrasFacturas,
                totales
            });
        }
    });
});

// Servir archivos estáticos
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Gestión de saldos y depósitos eliminada

// Gestión de saldos y depósitos eliminada (rutas de actualización/eliminación y resumen quitadas)


// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 API disponible en http://localhost:${PORT}/api/facturas`);
    console.log(`💾 Base de datos: ${path.join(__dirname, 'facturas.db')}`);
});