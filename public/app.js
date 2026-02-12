// Sistema de Facturas de Combustible - Frontend

class FacturaSystem {
    constructor() {
        this.facturas = [];
        this.currentEditId = null;
        this.apiBaseUrl = 'http://localhost:3000/api';
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadFacturas();
        await this.loadDepositos();
        this.updateStats();
        this.updateCurrentDate();
    }
    
    setupEventListeners() {
        // Botones principales
        document.getElementById('add-invoice').addEventListener('click', () => this.openModal());
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadFacturas());
        document.getElementById('export-btn').addEventListener('click', () => this.exportToExcel());
        document.getElementById('help-btn').addEventListener('click', () => this.showHelp());
        
        // Botones de navegación de meses
        document.getElementById('prev-month').addEventListener('click', () => this.previousMonth());
        document.getElementById('next-month').addEventListener('click', () => this.nextMonth());
        
        // Modal
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
            btn.addEventListener('click', () => this.closeDepositoModal());
        });
        
        // Formulario de facturas
        document.getElementById('invoice-form').addEventListener('submit', (e) => this.saveFactura(e));
        
        // Formulario de depósitos
        document.getElementById('deposito-form').addEventListener('submit', (e) => this.saveDeposito(e));
        
        // Filtros
        document.getElementById('search-input').addEventListener('input', () => this.filterFacturas());
        document.getElementById('filter-month').addEventListener('change', () => {
            this.filterFacturas();
            this.updateDepositosStats();
        });
        document.getElementById('filter-type').addEventListener('change', () => this.filterFacturas());
        
        // Selector de día
        document.getElementById('day-picker').addEventListener('change', (e) => this.filterByDay(e.target.value));
        
        // Cálculos en tiempo real
        document.getElementById('cantidad').addEventListener('input', () => this.calculateValues());
        document.getElementById('precio').addEventListener('input', () => this.calculateValues());
        document.getElementById('fovial').addEventListener('input', () => this.calculateValues());
        document.getElementById('cotrans').addEventListener('input', () => this.calculateValues());
        document.getElementById('iva').addEventListener('input', () => this.calculateValues());
        document.getElementById('descripcion').addEventListener('change', () => this.updateDieselNote());
        
        // Botones de depósitos
        document.getElementById('add-deposito').addEventListener('click', () => this.openDepositoModal());
        document.getElementById('refresh-depositos').addEventListener('click', () => this.loadDepositos());
        
        // Fecha actual por defecto (en zona horaria local) - formato texto YYYY-MM-DD
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('fecha').value = `${year}-${month}-${day}`;
        
        // Hora actual por defecto
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        document.getElementById('hora').value = currentTime;

        
    }
    
    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = 
            now.toLocaleDateString('es-ES', options);
    }
    
    async loadFacturas() {
        try {
        const response = await fetch(`${this.apiBaseUrl}/facturas`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        this.facturas = await response.json();
        this.renderFacturas();
        this.updateStats();
        
        console.log(`✅ Cargadas ${this.facturas.length} facturas`);
    } catch (error) {
        console.error('❌ Error cargando facturas:', error);
        this.showNotification('Error al cargar las facturas', 'error');
        }
    }
    
    renderFacturas(filteredFacturas = null) {
        const facturas = filteredFacturas || this.facturas;
        const tbody = document.getElementById('facturas-body');
        
        // Ordenar por fecha (más reciente primero)
        const sorted = [...facturas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        tbody.innerHTML = '';
        
        if (sorted.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="15" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
                        <h3>No hay facturas registradas</h3>
                        <p>Haz clic en "Nueva Factura" para agregar la primera</p>
                    </td>
                </tr>
            `;
            this.updateDailySummary(sorted);
            return;
        }
        
        sorted.forEach(factura => {
            const row = document.createElement('tr');
            
            // Agregar clase si no es DIESEL BAJO AZUFRE
            if (factura.descripcion !== "DIESEL BAJO AZUFRE") {
                row.classList.add('non-diesel-row');
            }
            
            row.innerHTML = `
                <td><strong>${factura.codigo}</strong></td>
                <td>${factura.numero}</td>
                <td>${this.formatDate(factura.fecha)}</td>
                <td>${factura.hora}</td>
                <td>${factura.cantidad.toFixed(5)}</td>
                <td>${factura.unidad}</td>
                <td>
                    <span class="fuel-type ${factura.descripcion === 'DIESEL BAJO AZUFRE' ? 'diesel' : 'non-diesel'}">
                        ${factura.descripcion}
                    </span>
                </td>
                <td>$${factura.precio.toFixed(2)}</td>
                <td>$${factura.ventasGravadas.toFixed(2)}</td>
                <td>$${factura.fovial.toFixed(2)}</td>
                <td>$${factura.cotrans.toFixed(2)}</td>
                <td>$${factura.iva.toFixed(2)}</td>
                <td><strong>$${factura.total.toFixed(2)}</strong></td>
                <td>${factura.observaciones || '-'}</td>
                <td>
                    <button class="btn btn-primary btn-sm edit-btn" data-id="${factura.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${factura.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Actualizar contador
        document.getElementById('facturas-count').textContent = `${sorted.length} factura${sorted.length !== 1 ? 's' : ''}`;
        
        // Actualizar totales
        this.updateTotals(sorted);
        
        // Actualizar resumen diario
        this.updateDailySummary(sorted);
        
        // Agregar event listeners a los botones dinámicos
        this.setupDynamicButtons();
    }
    
    setupDynamicButtons() {
        // Botones de editar
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const button = e.currentTarget;
                const id = parseInt(button.getAttribute('data-id'));
                this.editFactura(id);
            });
        });
        
        // Botones de eliminar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const button = e.currentTarget;
                const id = parseInt(button.getAttribute('data-id'));
                this.deleteFactura(id);
            });
        });
    }
    
    updateTotals(facturas) {
        const totals = facturas.reduce((acc, factura) => {
            acc.ventasGravadas += factura.ventasGravadas;
            acc.fovial += factura.fovial;
            acc.cotrans += factura.cotrans;
            acc.iva += factura.iva;
            acc.total += factura.total;
            return acc;
        }, { ventasGravadas: 0, fovial: 0, cotrans: 0, iva: 0, total: 0 });
        
        document.getElementById('total-ventas').textContent = `$${totals.ventasGravadas.toFixed(2)}`;
        document.getElementById('total-fovial').textContent = `$${totals.fovial.toFixed(2)}`;
        document.getElementById('total-cotrans').textContent = `$${totals.cotrans.toFixed(2)}`;
        document.getElementById('total-iva').textContent = `$${totals.iva.toFixed(2)}`;
        document.getElementById('total-general').textContent = `$${totals.total.toFixed(2)}`;
    }
    
    updateStats(facturas = null) {
        const facturasToCount = facturas || this.facturas;
        const totalFacturas = facturasToCount.length;
        const dieselFacturas = facturasToCount.filter(f => f.descripcion === "DIESEL BAJO AZUFRE").length;
        const otrasFacturas = totalFacturas - dieselFacturas;
        const totalMonto = facturasToCount.reduce((sum, f) => sum + f.total, 0);
        
        document.getElementById('total-facturas').textContent = totalFacturas;
        document.getElementById('diesel-facturas').textContent = dieselFacturas;
        document.getElementById('otras-facturas').textContent = otrasFacturas;
        document.getElementById('total-monto').textContent = `$${totalMonto.toFixed(2)}`;
    }
    
    formatDate(dateString) {
        // dateString viene en formato YYYY-MM-DD
        // Lo dividimos y creamos la fecha localmente sin conversión de zona horaria
        const [year, month, day] = dateString.split('-');
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${day}/${month}/${year}`;
    }
    
    openModal(facturaId = null) {
        const modal = document.getElementById('invoice-modal');
        const title = document.getElementById('modal-title');
        
        if (facturaId) {
            // Modo edición
            title.textContent = "Editar Factura";
            this.currentEditId = facturaId;
            this.loadFacturaData(facturaId);
        } else {
            // Modo nuevo
            title.textContent = "Nueva Factura";
            this.currentEditId = null;
            this.resetForm();
            this.generateAutoCode();
        }
        
        modal.style.display = 'flex';
        this.calculateValues();
        this.updateDieselNote();
    }
    
    resetForm() {
        document.getElementById('invoice-form').reset();
        
        // Valores por defecto
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        document.getElementById('fecha').value = `${year}-${month}-${day}`;
        document.getElementById('hora').value = currentTime;
        document.getElementById('unidad').value = "Galones";
        document.getElementById('descripcion').value = "DIESEL BAJO AZUFRE";
        document.getElementById('fovial').value = "0.00";
        document.getElementById('cotrans').value = "0.00";
        document.getElementById('iva').value = "0.00";
        document.getElementById('factura-id').value = "";
    }
    
    generateAutoCode() {
        // Usar el número total de facturas + 1 para generar un código único
        const nextNumber = this.facturas.length + 1;
        const year = new Date().getFullYear();
        document.getElementById('codigo').value = `GEN-${String(nextNumber).padStart(3, '0')}-${year}`;
        document.getElementById('numero').value = `CTRL-${String(nextNumber).padStart(3, '0')}`;
    }
    
    async loadFacturaData(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/facturas/${id}`);
            if (!response.ok) throw new Error('Factura no encontrada');
            
            const factura = await response.json();
            document.getElementById('codigo').value = factura.codigo;
            document.getElementById('numero').value = factura.numero;
            document.getElementById('fecha').value = factura.fecha;
            document.getElementById('hora').value = factura.hora;
            document.getElementById('cantidad').value = factura.cantidad;
            document.getElementById('unidad').value = factura.unidad;
            document.getElementById('descripcion').value = factura.descripcion;
            document.getElementById('precio').value = factura.precio;
            document.getElementById('fovial').value = factura.fovial.toFixed(2);
            document.getElementById('cotrans').value = factura.cotrans.toFixed(2);
            document.getElementById('iva').value = factura.iva.toFixed(2);
            document.getElementById('observaciones').value = factura.observaciones || '';
            document.getElementById('factura-id').value = factura.id;
            
            // Calcular valores después de cargar
            this.calculateValues();
        } catch (error) {
            console.error('Error cargando factura:', error);
            this.showNotification('Error al cargar la factura', 'error');
        }
    }
    
    closeModal() {
        document.getElementById('invoice-modal').style.display = 'none';
        this.resetForm();
        this.currentEditId = null;
    }
    
    calculateValues() {
        const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
        const precio = parseFloat(document.getElementById('precio').value) || 0;
        const fovial = parseFloat(document.getElementById('fovial').value) || 0;
        const cotrans = parseFloat(document.getElementById('cotrans').value) || 0;
        const iva = parseFloat(document.getElementById('iva').value) || 0;
        
        // Cálculos
        const ventasGravadas = cantidad * precio;
        const total = ventasGravadas + fovial + cotrans + iva;
        
        // Actualizar displays
        document.getElementById('calc-ventas').textContent = `$${ventasGravadas.toFixed(2)}`;
        document.getElementById('calc-total').textContent = `$${total.toFixed(2)}`;
    }
    
    updateDieselNote() {
        const descripcion = document.getElementById('descripcion').value;
        const note = document.getElementById('diesel-note');
        
        if (descripcion !== "DIESEL BAJO AZUFRE") {
            note.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Esta factura se mostrará en <strong class="highlight-red">ROJO</strong> en la tabla';
            note.style.color = '#e74c3c';
        } else {
            note.innerHTML = '<i class="fas fa-info-circle"></i> Factura normal';
            note.style.color = '#7f8c8d';
        }
    }
    
    async saveFactura(event) {
        event.preventDefault();
        
        // Obtener valores del formulario
        const fechaValue = document.getElementById('fecha').value.trim();
        
        // Validar formato de fecha YYYY-MM-DD
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fechaValue)) {
            this.showNotification('Formato de fecha inválido. Use YYYY-MM-DD', 'error');
            return;
        }
        
        const facturaData = {
            codigo: document.getElementById('codigo').value.trim(),
            numero: document.getElementById('numero').value.trim(),
            fecha: fechaValue, // Usar directamente sin conversión
            hora: document.getElementById('hora').value,
            cantidad: parseFloat(document.getElementById('cantidad').value),
            unidad: document.getElementById('unidad').value,
            descripcion: document.getElementById('descripcion').value,
            precio: parseFloat(document.getElementById('precio').value),
            fovial: parseFloat(document.getElementById('fovial').value),
            cotrans: parseFloat(document.getElementById('cotrans').value),
            iva: parseFloat(document.getElementById('iva').value),
            observaciones: document.getElementById('observaciones').value.trim()
        };
        
        // Calcular valores derivados
        const ventasGravadas = facturaData.cantidad * facturaData.precio;
        const total = ventasGravadas + facturaData.fovial + facturaData.cotrans + facturaData.iva;
        
        // Agregar valores calculados a los datos
        facturaData.ventasGravadas = ventasGravadas;
        facturaData.total = total;
        
        // Validaciones
        if (!this.validateFactura(facturaData)) return;
        
        // Guardar el mes actual del filtro antes de recargar
        const currentMonthFilter = document.getElementById('filter-month').value;
        // Si no hay filtro aplicado, extraer el mes de la factura que se está guardando
        const monthToApply = currentMonthFilter || facturaData.fecha.split('-')[1];
        
        try {
            if (this.currentEditId) {
                // Actualizar factura existente
                const response = await fetch(`${this.apiBaseUrl}/facturas/${this.currentEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(facturaData)
                });
                
                if (!response.ok) throw new Error('Error al actualizar');
                this.showNotification('✅ Factura actualizada correctamente', 'success');
            } else {
                // Crear nueva factura
                const response = await fetch(`${this.apiBaseUrl}/facturas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(facturaData)
                });
                
                if (!response.ok) throw new Error('Error al crear');
                this.showNotification('✅ Factura creada correctamente', 'success');
            }
            
            // Recargar datos
            await this.loadFacturas();
            this.closeModal();
            
            // Mantener o aplicar el filtro del mes
            document.getElementById('filter-month').value = monthToApply;
            this.filterFacturas();
        } catch (error) {
            console.error('Error guardando factura:', error);
            this.showNotification('❌ Error al guardar la factura', 'error');
        }
    }
    
    validateFactura(data) {
        if (!data.codigo || !data.numero || !data.fecha || !data.hora) {
            this.showNotification('Complete todos los campos obligatorios', 'error');
            return false;
        }
        
        if (isNaN(data.cantidad) || data.cantidad <= 0) {
            this.showNotification('Cantidad inválida', 'error');
            return false;
        }
        
        if (isNaN(data.precio) || data.precio <= 0) {
            this.showNotification('Precio inválido', 'error');
            return false;
        }
        
        if (isNaN(data.fovial) || data.fovial < 0) {
            this.showNotification('FOVIAL inválido', 'error');
            return false;
        }
        
        if (isNaN(data.cotrans) || data.cotrans < 0) {
            this.showNotification('COTRANS inválido', 'error');
            return false;
        }
        
        if (isNaN(data.iva) || data.iva < 0) {
            this.showNotification('IVA inválido', 'error');
            return false;
        }
        
        return true;
    }
    
    editFactura(id) {
        this.openModal(id);
    }
    
    async deleteFactura(id) {
        if (!confirm('¿Está seguro de eliminar esta factura?\nEsta acción no se puede deshacer.')) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/facturas/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showNotification('✅ Factura eliminada correctamente', 'success');
                await this.loadFacturas();
            } else {
                throw new Error('Error del servidor');
            }
        } catch (error) {
            console.error('Error eliminando factura:', error);
            this.showNotification('❌ Error al eliminar la factura', 'error');
        }
    }
    
    filterFacturas() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const filterMonth = document.getElementById('filter-month').value;
        const filterType = document.getElementById('filter-type').value;
        
        let filtered = this.facturas;
        
        // Buscar por término
        if (searchTerm) {
            filtered = filtered.filter(f => 
                f.codigo.toLowerCase().includes(searchTerm) ||
                f.numero.toLowerCase().includes(searchTerm) ||
                f.descripcion.toLowerCase().includes(searchTerm) ||
                (f.observaciones && f.observaciones.toLowerCase().includes(searchTerm))
            );
        }
        
        // Filtrar por mes - parseando la fecha como texto YYYY-MM-DD
        if (filterMonth) {
            filtered = filtered.filter(f => {
                // f.fecha está en formato YYYY-MM-DD
                const [year, month, day] = f.fecha.split('-');
                return month === filterMonth;
            });
        }
        
        // Filtrar por tipo
        if (filterType) {
            if (filterType === 'OTRO') {
                filtered = filtered.filter(f => f.descripcion !== 'DIESEL BAJO AZUFRE');
            } else {
                filtered = filtered.filter(f => f.descripcion === filterType);
            }
        }
        
        this.renderFacturas(filtered);
        this.updateStats(filtered);
        this.updateMonthDisplay(filterMonth);
    }
    
    exportToExcel() {
        if (this.facturas.length === 0) {
            this.showNotification('No hay datos para exportar', 'error');
            return;
        }
        
        const data = this.facturas.map(f => ({
            Código: f.codigo,
            'Número Control': f.numero,
            Fecha: f.fecha,
            Hora: f.hora,
            Cantidad: f.cantidad,
            Unidad: f.unidad,
            Descripción: f.descripcion,
            'Precio Unitario': f.precio,
            'Ventas Gravadas': f.ventasGravadas,
            FOVIAL: f.fovial,
            COTRANS: f.cotrans,
            IVA: f.iva,
            'Total a Pagar': f.total,
            Observaciones: f.observaciones || ''
        }));
        
        // Crear CSV
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');
        
        // Descargar
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `facturas-combustible-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('✅ Datos exportados exitosamente', 'success');
    }
    
    showHelp() {
        alert(`SISTEMA DE FACTURAS DE COMBUSTIBLE\n\n
Funcionalidades:
1. Agregar nuevas facturas con el botón "Nueva Factura"
2. Las facturas NO DIESEL BAJO AZUFRE se muestran en ROJO
3. Filtros por mes y tipo de combustible
4. Exportar datos a Excel/CSV
5. Cálculos automáticos de ventas gravadas y total

Instrucciones:
- Ventas Gravadas se calcula automáticamente (Cantidad × Precio)
- FOVIAL, COTRANS e IVA se ingresan manualmente
- Total a Pagar = Ventas Gravadas + FOVIAL + COTRANS + IVA`);
    }
    
    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        // Estilos de notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    previousMonth() {
        const currentMonth = document.getElementById('filter-month').value;
        const monthNames = ['', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const monthNames_es = ['Todos los meses', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        let currentIndex = monthNames.indexOf(currentMonth);
        let newIndex = currentIndex - 1;
        
        if (newIndex < 0) newIndex = monthNames.length - 1;
        
        const newMonth = monthNames[newIndex];
        document.getElementById('filter-month').value = newMonth;
        this.updateMonthDisplay(newMonth);
        this.filterFacturas();
        this.updateDepositosStats();
    }
    
    nextMonth() {
        const currentMonth = document.getElementById('filter-month').value;
        const monthNames = ['', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const monthNames_es = ['Todos los meses', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        let currentIndex = monthNames.indexOf(currentMonth);
        let newIndex = currentIndex + 1;
        
        if (newIndex >= monthNames.length) newIndex = 0;
        
        const newMonth = monthNames[newIndex];
        document.getElementById('filter-month').value = newMonth;
        this.updateMonthDisplay(newMonth);
        this.filterFacturas();
        this.updateDepositosStats();
    }
    
    updateMonthDisplay(month) {
        const monthNames_es = {
            '': 'Todos los meses',
            '01': 'Enero',
            '02': 'Febrero',
            '03': 'Marzo',
            '04': 'Abril',
            '05': 'Mayo',
            '06': 'Junio',
            '07': 'Julio',
            '08': 'Agosto',
            '09': 'Septiembre',
            '10': 'Octubre',
            '11': 'Noviembre',
            '12': 'Diciembre'
        };
        
        document.getElementById('current-month-display').textContent = monthNames_es[month] || 'Todos los meses';
    }
    
    
    updateDailySummary(facturas) {
        const summaryPanel = document.getElementById('daily-summary-panel');
        const summaryScroll = document.getElementById('daily-summary-scroll');
        
        if (facturas.length === 0) {
            summaryPanel.style.display = 'none';
            return;
        }
        
        // Agrupar facturas por día
        const dailyTotals = {};
        
        facturas.forEach(factura => {
            if (!dailyTotals[factura.fecha]) {
                dailyTotals[factura.fecha] = {
                    total: 0,
                    count: 0
                };
            }
            dailyTotals[factura.fecha].total += factura.total;
            dailyTotals[factura.fecha].count += 1;
        });
        
        // Ordenar fechas
        const sortedDates = Object.keys(dailyTotals).sort().reverse();
        
        // Crear elementos HTML
        summaryScroll.innerHTML = '';
        sortedDates.forEach(fecha => {
            const data = dailyTotals[fecha];
            const day = fecha.split('-')[2]; // Extraer el día
            const monthNames_es = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const month = monthNames_es[parseInt(fecha.split('-')[1]) - 1];
            
            const item = document.createElement('div');
            item.className = 'daily-item';
            item.innerHTML = `
                <div class="daily-date">${day} ${month.substring(0, 3)}</div>
                <div class="daily-amount">$${data.total.toFixed(2)}</div>
                <div class="daily-count">${data.count} ${data.count === 1 ? 'factura' : 'facturas'}</div>
            `;
            
            // Hacer clickeable la tarjeta diaria
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => this.selectDayFromCard(fecha));
            
            summaryScroll.appendChild(item);
        });
        
        summaryPanel.style.display = 'block';
    }
    
    selectDayFromCard(fecha) {
        // Establecer el valor del input de fecha
        document.getElementById('day-picker').value = fecha;
        // Filtrar por ese día
        this.filterByDay(fecha);
    }
    
    filterByDay(selectedDate) {
        if (!selectedDate) {
            // Si se limpia la búsqueda, volver a filtro normal
            document.getElementById('selected-day-info').textContent = '';
            this.filterFacturas();
            return;
        }
        
        const filterMonth = document.getElementById('filter-month').value;
        const filterType = document.getElementById('filter-type').value;
        let filtered = this.facturas;
        
        // Filtrar por mes si está seleccionado
        if (filterMonth) {
            filtered = filtered.filter(f => {
                const [year, month, day] = f.fecha.split('-');
                return month === filterMonth;
            });
        }
        
        // Filtrar por día específico
        filtered = filtered.filter(f => f.fecha === selectedDate);
        
        // Filtrar por tipo si está seleccionado
        if (filterType) {
            if (filterType === 'OTRO') {
                filtered = filtered.filter(f => f.descripcion !== 'DIESEL BAJO AZUFRE');
            } else {
                filtered = filtered.filter(f => f.descripcion === filterType);
            }
        }
        
        // Calcular total del día
        const dayTotal = filtered.reduce((sum, f) => sum + f.total, 0);
        
        // Mostrar información del día seleccionado
        const monthNames_es = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const [year, month, day] = selectedDate.split('-');
        const monthName = monthNames_es[parseInt(month) - 1];
        
        document.getElementById('selected-day-info').textContent = 
            `${day} ${monthName}: $${dayTotal.toFixed(2)}`;
        
        // Renderizar facturas filtradas
        this.renderFacturas(filtered);
    }
    
    // ==================== MÉTODOS DE DEPÓSITOS ====================

    async loadDepositos() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/depositos`);
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            this.depositos = await response.json();
            this.renderDepositos();
            this.updateDepositosStats();
            
            console.log(`✅ Cargados ${this.depositos.length} depósitos`);
        } catch (error) {
            console.error('❌ Error cargando depósitos:', error);
            this.showNotification('Error al cargar los depósitos', 'error');
        }
    }

    renderDepositos(filteredDepositos = null) {
        const depositos = filteredDepositos || this.depositos;
        const body = document.getElementById('depositos-body');
        body.innerHTML = '';

        if (depositos.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="empty-message">No hay depósitos registrados</td></tr>';
            document.getElementById('depositos-count').textContent = '0 depósitos';
            return;
        }

        depositos.forEach(deposito => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="monto-cell"><strong>$${deposito.monto.toFixed(2)}</strong></td>
                <td>${deposito.fecha}</td>
                <td>${deposito.descripcion}</td>
                <td>${deposito.referencia}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit" title="Editar" onclick="system.openDepositoModal(${deposito.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" title="Eliminar" onclick="system.deleteDeposito(${deposito.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            body.appendChild(row);
        });

        document.getElementById('depositos-count').textContent = `${depositos.length} ${depositos.length === 1 ? 'depósito' : 'depósitos'}`;
    }

    updateDepositosStats() {
        // Obtener mes actual del filtro
        const currentMonth = document.getElementById('filter-month').value;
        let totalDepositado = 0;
        let depositosDelMes = [];

        if (currentMonth) {
            // Filtrar depósitos del mes seleccionado (igual que en filterFacturas)
            depositosDelMes = this.depositos.filter(d => {
                // d.fecha está en formato YYYY-MM-DD
                const [year, month, day] = d.fecha.split('-');
                return month === currentMonth;
            });
            totalDepositado = depositosDelMes.reduce((sum, d) => sum + d.monto, 0);
        } else {
            // Todos los depósitos
            depositosDelMes = this.depositos;
            totalDepositado = this.depositos.reduce((sum, d) => sum + d.monto, 0);
        }

        document.getElementById('total-depositado').textContent = `$${totalDepositado.toFixed(2)}`;
        
        // Mostrar detalles de qué depósitos se están contando
        console.log(`💰 Total depositado del mes: $${totalDepositado.toFixed(2)} (${depositosDelMes.length} depósitos)`);
    }

    openDepositoModal(depositoId = null) {
        const modal = document.getElementById('deposito-modal');
        const title = document.getElementById('deposito-modal-title');
        
        if (depositoId) {
            // Modo edición
            title.textContent = "Editar Depósito Bancario";
            this.currentDepositoEditId = depositoId;
            this.loadDepositoData(depositoId);
        } else {
            // Modo nuevo
            title.textContent = "Nuevo Depósito Bancario";
            this.currentDepositoEditId = null;
            this.resetDepositoForm();
        }
        
        modal.style.display = 'flex';
    }

    closeDepositoModal() {
        const modal = document.getElementById('deposito-modal');
        if (modal && modal.style.display !== 'none') {
            modal.style.display = 'none';
            this.resetDepositoForm();
            this.currentDepositoEditId = null;
        }
    }

    resetDepositoForm() {
        document.getElementById('deposito-form').reset();
        
        // Fecha actual por defecto
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        document.getElementById('deposito-fecha').value = `${year}-${month}-${day}`;
        document.getElementById('deposito-id').value = "";
    }

    async loadDepositoData(id) {
        try {
            // Buscar en la array de depósitos cargados
            const deposito = this.depositos.find(d => d.id === id);
            if (!deposito) throw new Error('Depósito no encontrado');
            
            document.getElementById('deposito-monto').value = deposito.monto.toFixed(2);
            document.getElementById('deposito-fecha').value = deposito.fecha;
            document.getElementById('deposito-descripcion').value = deposito.descripcion;
            document.getElementById('deposito-referencia').value = deposito.referencia;
            document.getElementById('deposito-id').value = deposito.id;
        } catch (error) {
            console.error('Error cargando depósito:', error);
            this.showNotification('Error al cargar el depósito', 'error');
        }
    }

    async saveDeposito(event) {
        event.preventDefault();
        
        const fechaValue = document.getElementById('deposito-fecha').value.trim();
        
        // Validar formato de fecha YYYY-MM-DD
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fechaValue)) {
            this.showNotification('Formato de fecha inválido. Use YYYY-MM-DD', 'error');
            return;
        }

        const depositoData = {
            monto: parseFloat(document.getElementById('deposito-monto').value),
            fecha: fechaValue,
            descripcion: document.getElementById('deposito-descripcion').value.trim(),
            referencia: document.getElementById('deposito-referencia').value.trim()
        };

        // Validaciones básicas
        if (!depositoData.monto || depositoData.monto <= 0) {
            this.showNotification('El monto debe ser mayor a 0', 'error');
            return;
        }

        if (!depositoData.descripcion) {
            this.showNotification('La descripción es obligatoria', 'error');
            return;
        }

        if (!depositoData.referencia) {
            this.showNotification('La referencia es obligatoria', 'error');
            return;
        }

        try {
            if (this.currentDepositoEditId) {
                // Actualizar depósito existente
                const response = await fetch(`${this.apiBaseUrl}/depositos/${this.currentDepositoEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(depositoData)
                });
                
                if (!response.ok) throw new Error('Error al actualizar');
                this.showNotification('✅ Depósito actualizado correctamente', 'success');
            } else {
                // Crear nuevo depósito
                const response = await fetch(`${this.apiBaseUrl}/depositos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(depositoData)
                });
                
                if (!response.ok) throw new Error('Error al crear');
                this.showNotification('✅ Depósito creado correctamente', 'success');
            }
            
            // Recargar datos
            await this.loadDepositos();
            this.closeDepositoModal();
            
        } catch (error) {
            console.error('Error guardando depósito:', error);
            this.showNotification('Error al guardar el depósito', 'error');
        }
    }

    async deleteDeposito(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este depósito?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/depositos/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Error al eliminar');
            this.showNotification('✅ Depósito eliminado correctamente', 'success');
            await this.loadDepositos();
        } catch (error) {
            console.error('Error eliminando depósito:', error);
            this.showNotification('Error al eliminar el depósito', 'error');
        }
    }
    
    // Gestión de saldos y depósitos eliminada del frontend
}

// Inicializar el sistema cuando se carga la página
let system;
document.addEventListener('DOMContentLoaded', () => {
    system = new FacturaSystem();
});