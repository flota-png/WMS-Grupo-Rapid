/* ============================================================
   RapidWMS Pro - Main Application
   Grupo Rapid Warehouse Management System
   ============================================================ */

const App = (() => {
    let currentUser = null;
    let currentModule = 'dashboard';

    // ── Initialization ───────────────────────────────────────

    async function init() {
        await DataManager.init();
        bindLoginEvents();
        bindNavigation();
        bindGlobalEvents();
    }

    // ── Login ────────────────────────────────────────────────

    function bindLoginEvents() {
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', e => {
            e.preventDefault();
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value.trim();
            const errorEl = document.getElementById('loginError');

            const validUser = DataManager.validateLogin(user, pass);
            if (validUser) {
                currentUser = validUser;
                errorEl.textContent = '';
                document.querySelector('.login-screen').style.display = 'none';
                document.querySelector('.app-container').classList.add('active');
                updateUserDisplay();
                navigateTo('dashboard');
            } else {
                errorEl.textContent = 'Usuario o contrase\u00f1a incorrectos';
                document.getElementById('loginPass').value = '';
            }
        });
    }

    function updateUserDisplay() {
        if (!currentUser) return;
        const initials = currentUser.name.split(' ').map(w => w[0]).join('').substring(0, 2);
        document.querySelector('.user-avatar').textContent = initials;
        document.querySelector('.user-name').textContent = currentUser.name;
        document.querySelector('.user-role').textContent = currentUser.role;
    }

    function logout() {
        currentUser = null;
        document.querySelector('.app-container').classList.remove('active');
        document.querySelector('.login-screen').style.display = 'flex';
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPass').value = '';
    }

    // ── Navigation ───────────────────────────────────────────

    function bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const module = item.dataset.module;
                if (module === 'logout') { logout(); return; }
                navigateTo(module);
                // Close mobile sidebar
                document.querySelector('.sidebar').classList.remove('open');
            });
        });
    }

    function navigateTo(module) {
        currentModule = module;
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-module="${module}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Panel de Control',
            inventory: 'Inventario',
            movements: 'Movimientos',
            orders: '\u00d3rdenes de Compra',
            warehouses: 'Almacenes',
            suppliers: 'Proveedores',
            reports: 'Reportes',
            settings: 'Configuraci\u00f3n'
        };
        document.querySelector('.page-title').textContent = titles[module] || '';

        // Show/hide modules
        document.querySelectorAll('.module-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById('module-' + module);
        if (section) section.classList.add('active');

        // Render module
        renderModule(module);
    }

    function renderModule(module) {
        switch (module) {
            case 'dashboard': renderDashboard(); break;
            case 'inventory': renderInventory(); break;
            case 'movements': renderMovements(); break;
            case 'orders': renderOrders(); break;
            case 'warehouses': renderWarehouses(); break;
            case 'suppliers': renderSuppliers(); break;
            case 'reports': renderReports(); break;
            case 'settings': renderSettings(); break;
        }
    }

    // ── Global Events ────────────────────────────────────────

    function bindGlobalEvents() {
        // Mobile menu
        document.querySelector('.mobile-menu-btn')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });

        // Close modal on overlay click
        document.addEventListener('click', e => {
            if (e.target.classList.contains('modal-overlay')) closeModal();
        });

        // ESC to close modal
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });

        // Logout button
        document.getElementById('btnLogout')?.addEventListener('click', logout);
    }

    // ── Toast Notifications ──────────────────────────────────

    function toast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const icons = { success: '\u2705', error: '\u274c', warning: '\u26a0\ufe0f', info: '\u2139\ufe0f' };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(t);
        setTimeout(() => { t.classList.add('fadeOut'); setTimeout(() => t.remove(), 300); }, 3000);
    }

    // ── Modal Helpers ────────────────────────────────────────

    function openModal(title, bodyHTML, footerHTML) {
        const overlay = document.getElementById('modalOverlay');
        overlay.querySelector('.modal-header h3').textContent = title;
        overlay.querySelector('.modal-body').innerHTML = bodyHTML;
        overlay.querySelector('.modal-footer').innerHTML = footerHTML || '';
        overlay.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    // ── Format Helpers ───────────────────────────────────────

    function currency(val) {
        return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function statusBadge(status) {
        const map = { ok: ['badge-ok', 'Normal'], low: ['badge-low', 'Bajo'], critical: ['badge-critical', 'Cr\u00edtico'] };
        const [cls, text] = map[status] || ['badge-info', status];
        return `<span class="badge ${cls}">${text}</span>`;
    }

    function movTypeBadge(type) {
        const cls = type === 'Entrada' ? 'badge-entrada' : type === 'Salida' ? 'badge-salida' : 'badge-transferencia';
        return `<span class="badge ${cls}">${type}</span>`;
    }

    function orderStatusBadge(status) {
        const map = { 'Pendiente': 'badge-pending', 'En Proceso': 'badge-process', 'Completada': 'badge-complete', 'Cancelada': 'badge-cancelled' };
        return `<span class="badge ${map[status] || 'badge-info'}">${status}</span>`;
    }

    // ══════════════════════════════════════════════════════════
    // DASHBOARD
    // ══════════════════════════════════════════════════════════

    function renderDashboard() {
        const stats = DataManager.getDashboardStats();
        const movements = DataManager.getMovements();
        const orders = DataManager.getOrders();

        // KPIs
        document.getElementById('kpiTotalProducts').textContent = stats.totalProducts;
        document.getElementById('kpiTotalQuantity').textContent = stats.totalQuantity.toLocaleString() + ' unidades';
        document.getElementById('kpiLowStock').textContent = stats.lowStockCount;
        document.getElementById('kpiPendingOrders').textContent = stats.pendingOrders;
        document.getElementById('kpiTotalValue').textContent = currency(stats.totalValue);

        // Update nav badge
        const invBadge = document.querySelector('.nav-item[data-module="inventory"] .nav-badge');
        if (invBadge) invBadge.textContent = stats.lowStockCount;

        // Category donut chart
        const catData = Object.entries(stats.categoryTotals).map(([cat, data]) => ({
            label: cat,
            value: data.quantity,
            color: Charts.CATEGORY_COLORS[cat] || Charts.COLORS.gray
        }));
        setTimeout(() => Charts.drawDonut('chartCategoryDist', catData), 50);

        // Monthly trend sparklines
        const monthlyEntries = [12, 18, 15, 22, 19, 25, 20, 28, 24, 30, 26, 22];
        const monthlyExits = [8, 14, 12, 18, 16, 20, 17, 22, 19, 24, 21, 18];
        setTimeout(() => {
            Charts.drawLine('chartMonthlyTrend',
                [
                    { label: 'Entradas', data: monthlyEntries, color: Charts.COLORS.green },
                    { label: 'Salidas', data: monthlyExits, color: Charts.COLORS.red }
                ],
                ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'],
                { title: 'Movimientos Mensuales (12 meses)' }
            );
        }, 80);

        // Value by category bar
        const valData = Object.entries(stats.categoryTotals).map(([cat, data]) => ({
            label: cat.split(' ')[0],
            value: Math.round(data.value),
            color: Charts.CATEGORY_COLORS[cat] || Charts.COLORS.gray
        }));
        setTimeout(() => Charts.drawBar('chartValueByCategory', valData, { title: 'Valor por Categor\u00eda (USD)', formatValue: v => '$' + (v/1000).toFixed(0) + 'k' }), 100);

        // Recent activity
        const activityHTML = movements.slice(0, 8).map(m => {
            const dotClass = m.type === 'Entrada' ? 'green' : m.type === 'Salida' ? 'red' : 'blue';
            return `<li class="activity-item">
                <div class="activity-dot ${dotClass}"></div>
                <div class="activity-text"><strong>${m.type}:</strong> ${m.quantity}x ${m.productName}</div>
                <div class="activity-time">${m.date} ${m.time}</div>
            </li>`;
        }).join('');
        document.getElementById('activityFeed').innerHTML = activityHTML || '<li class="empty-state"><p>Sin actividad reciente</p></li>';

        // Low stock alerts
        const alertsHTML = stats.lowStockItems.slice(0, 6).map(p => {
            const cls = p.status === 'critical' ? 'danger' : 'warning';
            const icon = p.status === 'critical' ? '\ud83d\udea8' : '\u26a0\ufe0f';
            return `<div class="alert-item ${cls}">
                <span class="alert-icon">${icon}</span>
                <div class="alert-text">
                    <strong>${p.name}</strong>
                    <span>Stock: ${p.quantity} / M\u00edn: ${p.minStock} \u2022 ${p.location}</span>
                </div>
                ${statusBadge(p.status)}
            </div>`;
        }).join('');
        document.getElementById('lowStockAlerts').innerHTML = alertsHTML || '<div class="empty-state"><p>Sin alertas de stock</p></div>';
    }

    // ══════════════════════════════════════════════════════════
    // INVENTORY
    // ══════════════════════════════════════════════════════════

    let invSearchTerm = '';
    let invCategoryFilter = '';
    let invStatusFilter = '';
    let invWarehouseFilter = '';
    let invPage = 1;
    const invPerPage = 15;

    function renderInventory() {
        const products = DataManager.getProducts();
        let filtered = products.filter(p => {
            if (invSearchTerm && !p.name.toLowerCase().includes(invSearchTerm.toLowerCase()) && !p.sku.toLowerCase().includes(invSearchTerm.toLowerCase())) return false;
            if (invCategoryFilter && p.category !== invCategoryFilter) return false;
            if (invStatusFilter && p.status !== invStatusFilter) return false;
            if (invWarehouseFilter && p.warehouse !== invWarehouseFilter) return false;
            return true;
        });

        const totalPages = Math.ceil(filtered.length / invPerPage) || 1;
        if (invPage > totalPages) invPage = totalPages;
        const paged = filtered.slice((invPage - 1) * invPerPage, invPage * invPerPage);

        let rows = paged.map(p => `<tr>
            <td><strong>${p.sku}</strong></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.subcategory}</td>
            <td class="text-center">${p.quantity}</td>
            <td class="text-center">${p.minStock}</td>
            <td>${p.location}</td>
            <td class="text-right">${currency(p.unitPrice)}</td>
            <td>${statusBadge(p.status)}</td>
            <td class="text-center">
                <button class="btn btn-ghost btn-sm" onclick="App.editProduct('${p.id}')" title="Editar">\u270f\ufe0f</button>
                <button class="btn btn-ghost btn-sm" onclick="App.deleteProduct('${p.id}')" title="Eliminar">\ud83d\uddd1\ufe0f</button>
            </td>
        </tr>`).join('');

        if (!rows) rows = `<tr><td colspan="10" class="empty-state"><div class="empty-icon">\ud83d\udce6</div><p>No se encontraron productos</p></td></tr>`;

        document.getElementById('inventoryTableBody').innerHTML = rows;
        document.getElementById('inventoryCount').textContent = `Mostrando ${paged.length} de ${filtered.length} productos`;

        // Pagination
        let pagHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            pagHTML += `<button class="${i === invPage ? 'active' : ''}" onclick="App.invGoPage(${i})">${i}</button>`;
        }
        document.getElementById('inventoryPagination').innerHTML = pagHTML;
    }

    function bindInventoryEvents() {
        document.getElementById('invSearch')?.addEventListener('input', e => { invSearchTerm = e.target.value; invPage = 1; renderInventory(); });
        document.getElementById('invFilterCategory')?.addEventListener('change', e => { invCategoryFilter = e.target.value; invPage = 1; renderInventory(); });
        document.getElementById('invFilterStatus')?.addEventListener('change', e => { invStatusFilter = e.target.value; invPage = 1; renderInventory(); });
        document.getElementById('invFilterWarehouse')?.addEventListener('change', e => { invWarehouseFilter = e.target.value; invPage = 1; renderInventory(); });
        document.getElementById('btnAddProduct')?.addEventListener('click', () => showProductForm());
        document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);
    }

    function showProductForm(productId) {
        const product = productId ? DataManager.getProduct(productId) : null;
        const isEdit = !!product;
        const title = isEdit ? 'Editar Producto' : 'Nuevo Producto';

        const categories = ['Aires Acondicionados', 'Fumigaci\u00f3n', 'Piscinas'];
        const warehouses = DataManager.getWarehouses().map(w => w.name);

        const body = `
        <form id="productForm">
            <div class="form-row">
                <div class="form-group">
                    <label>SKU</label>
                    <input type="text" id="pSku" value="${product?.sku || ''}" required>
                </div>
                <div class="form-group">
                    <label>Nombre del Producto</label>
                    <input type="text" id="pName" value="${product?.name || ''}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Categor\u00eda</label>
                    <select id="pCategory" required>
                        <option value="">Seleccionar...</option>
                        ${categories.map(c => `<option value="${c}" ${product?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Subcategor\u00eda</label>
                    <input type="text" id="pSubcategory" value="${product?.subcategory || ''}">
                </div>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label>Cantidad</label>
                    <input type="number" id="pQuantity" value="${product?.quantity ?? 0}" min="0" required>
                </div>
                <div class="form-group">
                    <label>Stock M\u00ednimo</label>
                    <input type="number" id="pMinStock" value="${product?.minStock ?? 1}" min="0" required>
                </div>
                <div class="form-group">
                    <label>Precio Unitario</label>
                    <input type="number" id="pPrice" value="${product?.unitPrice ?? 0}" min="0" step="0.01" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Almac\u00e9n</label>
                    <select id="pWarehouse">
                        ${warehouses.map(w => `<option value="${w}" ${product?.warehouse === w ? 'selected' : ''}>${w}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Ubicaci\u00f3n</label>
                    <input type="text" id="pLocation" value="${product?.location || ''}" placeholder="Ej: A-01-01">
                </div>
            </div>
        </form>`;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="App.saveProductForm('${productId || ''}')">
                ${isEdit ? 'Actualizar' : 'Guardar'}
            </button>`;

        openModal(title, body, footer);

        setTimeout(() => {
            document.getElementById('productForm')?.addEventListener('submit', e => e.preventDefault());
        }, 50);
    }

    function saveProductForm(editId) {
        const product = editId ? DataManager.getProduct(editId) : {};
        product.sku = document.getElementById('pSku').value.trim();
        product.name = document.getElementById('pName').value.trim();
        product.category = document.getElementById('pCategory').value;
        product.subcategory = document.getElementById('pSubcategory').value.trim();
        product.quantity = parseInt(document.getElementById('pQuantity').value) || 0;
        product.minStock = parseInt(document.getElementById('pMinStock').value) || 1;
        product.unitPrice = parseFloat(document.getElementById('pPrice').value) || 0;
        product.warehouse = document.getElementById('pWarehouse').value;
        product.location = document.getElementById('pLocation').value.trim();

        if (!product.sku || !product.name || !product.category) {
            toast('Completa todos los campos requeridos', 'warning');
            return;
        }

        DataManager.saveProduct(product);
        closeModal();
        renderInventory();
        toast(editId ? 'Producto actualizado correctamente' : 'Producto agregado correctamente', 'success');
    }

    function deleteProduct(id) {
        const product = DataManager.getProduct(id);
        if (!product) return;
        openModal('Confirmar Eliminaci\u00f3n',
            `<p>\u00bfEst\u00e1s seguro de eliminar <strong>${product.name}</strong> (${product.sku})?</p><p style="color:var(--gray-500);margin-top:8px;font-size:0.88rem;">Esta acci\u00f3n no se puede deshacer.</p>`,
            `<button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
             <button class="btn btn-danger" onclick="App.confirmDeleteProduct('${id}')">Eliminar</button>`
        );
    }

    function confirmDeleteProduct(id) {
        DataManager.deleteProduct(id);
        closeModal();
        renderInventory();
        toast('Producto eliminado', 'success');
    }

    function exportCSV() {
        const csv = DataManager.exportProductsCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_rapidwms_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Archivo CSV exportado', 'success');
    }

    // ══════════════════════════════════════════════════════════
    // MOVEMENTS
    // ══════════════════════════════════════════════════════════

    let movTypeFilter = '';
    let movSearchTerm = '';

    function renderMovements() {
        const movements = DataManager.getMovements();
        let filtered = movements.filter(m => {
            if (movTypeFilter && m.type !== movTypeFilter) return false;
            if (movSearchTerm) {
                const term = movSearchTerm.toLowerCase();
                const items = m.items || [{ productName: m.productName }];
                const matchProduct = items.some(i => i.productName.toLowerCase().includes(term));
                const matchRef = (m.reference || '').toLowerCase().includes(term);
                if (!matchProduct && !matchRef) return false;
            }
            return true;
        });

        // Ordenar por fecha (reciente primero), luego por hora (reciente primero)
        filtered.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });

        const rows = filtered.slice(0, 50).map(m => {
            const items = m.items || [{ productName: m.productName, quantity: m.quantity, warehouse: m.warehouse, location: m.location, notes: m.notes || '' }];
            const productNames = items.map(i => i.productName).join(', ');
            const quantities = items.map(i => i.quantity).join(', ');
            const warehouses = [...new Set(items.map(i => i.warehouse))].join(', ');
            const locations = items.map(i => i.location).filter(l => l).join(', ');
            const notes = items.map(i => i.notes).filter(n => n).join('; ');
            return `<tr>
            <td>${m.date}</td>
            <td>${m.time}</td>
            <td>${movTypeBadge(m.type)}</td>
            <td>${productNames}</td>
            <td class="text-center">${quantities}</td>
            <td>${warehouses}</td>
            <td>${locations}</td>
            <td>${m.reference}</td>
            <td>${notes}</td>
            <td>${m.user}</td>
            <td class="text-center" style="white-space:nowrap;">
                <button class="btn btn-ghost btn-sm" onclick="App.editMovement('${m.id}')" title="Editar">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="App.deleteMovement('${m.id}')" title="Eliminar">🗑️</button>
            </td>
        </tr>`;
        }).join('');

        document.getElementById('movementsTableBody').innerHTML = rows || `<tr><td colspan="11" class="empty-state"><p>Sin movimientos</p></td></tr>`;
        document.getElementById('movementsCount').textContent = `${filtered.length} movimientos`;
    }

    function bindMovementEvents() {
        document.getElementById('movSearch')?.addEventListener('input', e => { movSearchTerm = e.target.value; renderMovements(); });
        document.getElementById('movFilterType')?.addEventListener('change', e => { movTypeFilter = e.target.value; renderMovements(); });
        document.getElementById('btnNewMovement')?.addEventListener('click', showMovementForm);
    }

    let editingMovementId = null;

    let movProductCounter = 0;

    function buildProductOptions(selectedId) {
        const products = DataManager.getProducts();
        return `<option value="">Seleccionar producto...</option>` +
            products.map(p => `<option value="${p.id}" data-warehouse="${p.warehouse}" data-location="${p.location}" ${selectedId === p.id ? 'selected' : ''}>${p.sku} - ${p.name} (Stock: ${p.quantity})</option>`).join('');
    }

    function buildWarehouseOptions(selectedName) {
        const warehouses = DataManager.getWarehouses();
        return warehouses.map(w => `<option value="${w.name}" ${selectedName === w.name ? 'selected' : ''}>${w.name}</option>`).join('');
    }

    function buildProductRow(index, data) {
        return `<div class="mov-product-row" data-index="${index}" style="border:1px solid var(--gray-200);border-radius:8px;padding:12px;margin-bottom:8px;position:relative;">
            ${index > 0 ? `<button type="button" class="btn btn-ghost btn-sm" onclick="App.removeMovProductRow(${index})" style="position:absolute;top:4px;right:4px;color:var(--red);" title="Quitar">&times;</button>` : ''}
            <div class="form-group">
                <label>Producto</label>
                <select class="mProduct" data-index="${index}" required>
                    ${buildProductOptions(data?.product)}
                </select>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label>Cantidad</label>
                    <input type="number" class="mQuantity" data-index="${index}" min="1" value="${data?.quantity || 1}" required>
                </div>
                <div class="form-group">
                    <label>Almac\u00e9n</label>
                    <select class="mWarehouse" data-index="${index}">
                        ${buildWarehouseOptions(data?.warehouse)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Ubicaci\u00f3n</label>
                    <input type="text" class="mLocation" data-index="${index}" value="${data?.location || ''}" placeholder="Ej: A-01-01">
                </div>
            </div>
            <div class="form-group">
                <label>Notas</label>
                <input type="text" class="mNotes" data-index="${index}" value="${data?.notes || ''}" placeholder="Observaciones...">
            </div>
        </div>`;
    }

    function showMovementForm(movementId) {
        if (movementId instanceof Event || typeof movementId !== 'string') movementId = null;
        const movement = movementId ? DataManager.getMovement(movementId) : null;
        const isEdit = !!movement;
        editingMovementId = movementId || null;
        movProductCounter = 0;

        const body = `
        <form id="movementForm">
            <div class="form-row-3">
                <div class="form-group">
                    <label>Tipo de Movimiento</label>
                    <select id="mType" required>
                        <option value="Entrada" ${movement?.type === 'Entrada' ? 'selected' : ''}>Entrada</option>
                        <option value="Salida" ${movement?.type === 'Salida' ? 'selected' : ''}>Salida</option>
                        <option value="Transferencia" ${movement?.type === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="mDate" value="${movement?.date || new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Referencia</label>
                    <input type="text" id="mReference" value="${movement?.reference || ''}" placeholder="Ej: OC-2026-018 o VTA-4522">
                </div>
            </div>
            <div id="movProductRows">
                ${isEdit ? (() => {
                    const items = movement.items || [{ product: movement.product, productName: movement.productName, quantity: movement.quantity, warehouse: movement.warehouse, location: movement.location, notes: movement.notes || '' }];
                    movProductCounter = items.length - 1;
                    return items.map((item, i) => buildProductRow(i, item)).join('');
                })() : buildProductRow(0, null)}
            </div>
            <button type="button" class="btn btn-outline btn-sm" onclick="App.addMovProductRow()" style="margin-bottom:12px;">+ Agregar otro producto</button>
        </form>`;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="App.saveMovement()">${isEdit ? 'Actualizar Movimiento' : 'Registrar Movimiento'}</button>`;

        openModal(isEdit ? 'Editar Movimiento' : 'Registrar Movimiento', body, footer);

        // Prevent form submit on Enter key
        setTimeout(() => {
            document.getElementById('movementForm')?.addEventListener('submit', e => e.preventDefault());
        }, 50);

        bindMovProductAutoFill();
    }

    function bindMovProductAutoFill() {
        setTimeout(() => {
            document.querySelectorAll('.mProduct').forEach(sel => {
                if (!sel.dataset.bound) {
                    sel.dataset.bound = '1';
                    sel.addEventListener('change', e => {
                        const idx = e.target.dataset.index;
                        const opt = e.target.selectedOptions[0];
                        if (opt) {
                            document.querySelector(`.mWarehouse[data-index="${idx}"]`).value = opt.dataset.warehouse || '';
                            document.querySelector(`.mLocation[data-index="${idx}"]`).value = opt.dataset.location || '';
                        }
                    });
                }
            });
        }, 50);
    }

    function addMovProductRow() {
        movProductCounter++;
        const container = document.getElementById('movProductRows');
        container.insertAdjacentHTML('beforeend', buildProductRow(movProductCounter, null));
        bindMovProductAutoFill();
    }

    function removeMovProductRow(index) {
        const row = document.querySelector(`.mov-product-row[data-index="${index}"]`);
        if (row) row.remove();
    }

    function collectItemsFromForm() {
        const rows = document.querySelectorAll('.mov-product-row');
        const items = [];
        for (const row of rows) {
            const productId = row.querySelector('.mProduct').value;
            if (!productId) continue;
            const product = DataManager.getProduct(productId);
            if (!product) continue;
            items.push({
                product: productId,
                productName: product.name,
                quantity: parseInt(row.querySelector('.mQuantity').value),
                warehouse: row.querySelector('.mWarehouse').value,
                location: row.querySelector('.mLocation').value,
                notes: row.querySelector('.mNotes').value.trim()
            });
        }
        return items;
    }

    function saveMovement() {
        const type = document.getElementById('mType').value;
        const date = document.getElementById('mDate').value;
        const reference = document.getElementById('mReference').value.trim();
        const items = collectItemsFromForm();

        if (items.length === 0) {
            toast('Selecciona al menos un producto', 'warning');
            return;
        }

        // Validate stock for exits
        if (type === 'Salida') {
            // For editing, temporarily revert old quantities to check
            const oldMov = editingMovementId ? DataManager.getMovement(editingMovementId) : null;
            const oldItems = oldMov ? (oldMov.items || [{ product: oldMov.product, quantity: oldMov.quantity }]) : [];

            for (const item of items) {
                const product = DataManager.getProduct(item.product);
                let available = product.quantity;
                // If editing, add back old quantity for same product
                if (oldMov) {
                    for (const oi of oldItems) {
                        if (oi.product === item.product) {
                            if (oldMov.type === 'Entrada') available -= parseInt(oi.quantity);
                            else if (oldMov.type === 'Salida') available += parseInt(oi.quantity);
                        }
                    }
                }
                if (item.quantity > available) {
                    toast(`Stock insuficiente para ${item.productName}. Disponible: ${available}`, 'error');
                    return;
                }
            }
        }

        if (editingMovementId) {
            DataManager.updateMovement(editingMovementId, { type, date, reference, items });
            editingMovementId = null;
            closeModal();
            renderMovements();
            toast('Movimiento actualizado correctamente', 'success');
        } else {
            DataManager.saveMovement({ type, date, reference, items });
            closeModal();
            renderMovements();
            toast('Movimiento registrado correctamente', 'success');
        }
    }

    function deleteMovement(id) {
        const mov = DataManager.getMovement(id);
        if (!mov) return;
        const items = mov.items || [{ productName: mov.productName, quantity: mov.quantity }];
        const productList = items.map(i => `<strong>${i.productName}</strong> (${i.quantity} uds)`).join(', ');
        openModal('Confirmar Eliminación',
            `<p>¿Estás seguro de eliminar el movimiento <strong>${mov.type}</strong> de ${productList}?</p><p style="color:var(--gray-500);margin-top:8px;font-size:0.88rem;">El stock se ajustará automáticamente. Esta acción no se puede deshacer.</p>`,
            `<button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
             <button class="btn btn-danger" onclick="App.confirmDeleteMovement('${id}')">Eliminar</button>`
        );
    }

    function confirmDeleteMovement(id) {
        DataManager.deleteMovement(id);
        closeModal();
        renderMovements();
        toast('Movimiento eliminado', 'success');
    }

    // ══════════════════════════════════════════════════════════
    // ORDERS
    // ══════════════════════════════════════════════════════════

    let orderStatusFilter = '';

    function renderOrders() {
        const orders = DataManager.getOrders();
        let filtered = orders.filter(o => !orderStatusFilter || o.status === orderStatusFilter);

        const rows = filtered.map(o => {
            const itemCount = o.items ? o.items.length : 0;
            return `<tr>
                <td><strong>${o.id}</strong></td>
                <td>${o.supplierName}</td>
                <td>${o.date}</td>
                <td>${o.expectedDate}</td>
                <td class="text-center">${itemCount}</td>
                <td class="text-right">${currency(o.total)}</td>
                <td>${orderStatusBadge(o.status)}</td>
                <td class="text-center">
                    <button class="btn btn-ghost btn-sm" onclick="App.viewOrder('${o.id}')" title="Ver">\ud83d\udc41\ufe0f</button>
                    <button class="btn btn-ghost btn-sm" onclick="App.editOrderStatus('${o.id}')" title="Cambiar estado">\u270f\ufe0f</button>
                </td>
            </tr>`;
        }).join('');

        document.getElementById('ordersTableBody').innerHTML = rows || `<tr><td colspan="8" class="empty-state"><p>Sin \u00f3rdenes</p></td></tr>`;
    }

    function bindOrderEvents() {
        document.getElementById('orderFilterStatus')?.addEventListener('change', e => { orderStatusFilter = e.target.value; renderOrders(); });
        document.getElementById('btnNewOrder')?.addEventListener('click', showOrderForm);
    }

    function showOrderForm() {
        const suppliers = DataManager.getSuppliers();
        const products = DataManager.getProducts();

        const body = `
        <form id="orderForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Proveedor</label>
                    <select id="oSupplier" required>
                        <option value="">Seleccionar...</option>
                        ${suppliers.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha Esperada de Entrega</label>
                    <input type="date" id="oExpectedDate" required>
                </div>
            </div>
            <div class="form-group">
                <label>Productos de la Orden</label>
                <div id="orderItems">
                    <div class="order-item-row" style="display:flex;gap:8px;margin-bottom:8px;">
                        <select class="filter-select oi-product" style="flex:2">
                            <option value="">Seleccionar producto...</option>
                            ${products.map(p => `<option value="${p.id}" data-price="${p.unitPrice}" data-name="${p.name}">${p.sku} - ${p.name}</option>`).join('')}
                        </select>
                        <input type="number" class="oi-qty" placeholder="Cant." min="1" value="1" style="flex:0.5;padding:8px;border:1.5px solid var(--gray-200);border-radius:6px;">
                        <input type="number" class="oi-price" placeholder="Precio" step="0.01" style="flex:0.7;padding:8px;border:1.5px solid var(--gray-200);border-radius:6px;">
                    </div>
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="App.addOrderItemRow()" style="margin-top:4px;">+ Agregar producto</button>
            </div>
            <div class="form-group">
                <label>Notas</label>
                <textarea id="oNotes" rows="2"></textarea>
            </div>
        </form>`;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="App.saveOrder()">Crear Orden</button>`;

        openModal('Nueva Orden de Compra', body, footer);

        // Auto-fill price on product select
        setTimeout(() => {
            document.querySelectorAll('.oi-product').forEach(sel => {
                sel.addEventListener('change', e => {
                    const opt = e.target.selectedOptions[0];
                    const priceInput = e.target.parentElement.querySelector('.oi-price');
                    if (opt && priceInput) priceInput.value = opt.dataset.price || '';
                });
            });
        }, 100);
    }

    function addOrderItemRow() {
        const products = DataManager.getProducts();
        const container = document.getElementById('orderItems');
        const row = document.createElement('div');
        row.className = 'order-item-row';
        row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
        row.innerHTML = `
            <select class="filter-select oi-product" style="flex:2">
                <option value="">Seleccionar producto...</option>
                ${products.map(p => `<option value="${p.id}" data-price="${p.unitPrice}" data-name="${p.name}">${p.sku} - ${p.name}</option>`).join('')}
            </select>
            <input type="number" class="oi-qty" placeholder="Cant." min="1" value="1" style="flex:0.5;padding:8px;border:1.5px solid var(--gray-200);border-radius:6px;">
            <input type="number" class="oi-price" placeholder="Precio" step="0.01" style="flex:0.7;padding:8px;border:1.5px solid var(--gray-200);border-radius:6px;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()" style="flex:0.2">\u274c</button>`;
        container.appendChild(row);

        row.querySelector('.oi-product').addEventListener('change', e => {
            const opt = e.target.selectedOptions[0];
            const priceInput = row.querySelector('.oi-price');
            if (opt && priceInput) priceInput.value = opt.dataset.price || '';
        });
    }

    function saveOrder() {
        const supplierId = document.getElementById('oSupplier').value;
        const supplierOpt = document.getElementById('oSupplier').selectedOptions[0];
        if (!supplierId) { toast('Selecciona un proveedor', 'warning'); return; }

        const items = [];
        document.querySelectorAll('.order-item-row').forEach(row => {
            const sel = row.querySelector('.oi-product');
            const qty = parseInt(row.querySelector('.oi-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.oi-price')?.value) || 0;
            if (sel.value && qty > 0) {
                items.push({
                    productId: sel.value,
                    name: sel.selectedOptions[0]?.dataset.name || '',
                    quantity: qty,
                    unitPrice: price
                });
            }
        });

        if (items.length === 0) { toast('Agrega al menos un producto', 'warning'); return; }

        const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

        DataManager.saveOrder({
            supplier: supplierId,
            supplierName: supplierOpt?.dataset.name || '',
            date: new Date().toISOString().split('T')[0],
            expectedDate: document.getElementById('oExpectedDate').value,
            status: 'Pendiente',
            items: items,
            total: total,
            notes: document.getElementById('oNotes').value.trim()
        });

        closeModal();
        renderOrders();
        toast('Orden de compra creada', 'success');
    }

    function viewOrder(orderId) {
        const order = DataManager.getOrder(orderId);
        if (!order) return;

        const itemRows = (order.items || []).map(i => `<tr>
            <td>${i.name}</td>
            <td class="text-center">${i.quantity}</td>
            <td class="text-right">${currency(i.unitPrice)}</td>
            <td class="text-right">${currency(i.quantity * i.unitPrice)}</td>
        </tr>`).join('');

        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div><strong>Orden:</strong> ${order.id}</div>
                <div><strong>Proveedor:</strong> ${order.supplierName}</div>
                <div><strong>Fecha:</strong> ${order.date}</div>
                <div><strong>Entrega Esperada:</strong> ${order.expectedDate}</div>
                <div><strong>Estado:</strong> ${orderStatusBadge(order.status)}</div>
            </div>
            ${order.notes ? `<p style="color:var(--gray-500);margin-bottom:12px;"><em>${order.notes}</em></p>` : ''}
            <table class="data-table order-items-table">
                <thead><tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-right">Precio Unit.</th><th class="text-right">Subtotal</th></tr></thead>
                <tbody>${itemRows}</tbody>
            </table>
            <div class="order-total">Total: ${currency(order.total)}</div>`;

        openModal('Detalle de Orden ' + order.id, body, `<button class="btn btn-outline" onclick="App.closeModal()">Cerrar</button>`);
    }

    function editOrderStatus(orderId) {
        const order = DataManager.getOrder(orderId);
        if (!order) return;
        const statuses = ['Pendiente', 'En Proceso', 'Completada', 'Cancelada'];
        const body = `
            <div class="form-group">
                <label>Orden: ${order.id}</label>
                <p style="margin-bottom:12px;color:var(--gray-500);">${order.supplierName}</p>
                <label>Nuevo Estado</label>
                <select id="newOrderStatus" class="filter-select" style="width:100%">
                    ${statuses.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>`;
        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="App.updateOrderStatus('${orderId}')">Actualizar</button>`;
        openModal('Cambiar Estado de Orden', body, footer);
    }

    function updateOrderStatus(orderId) {
        const order = DataManager.getOrder(orderId);
        if (!order) return;
        order.status = document.getElementById('newOrderStatus').value;
        DataManager.saveOrder(order);
        closeModal();
        renderOrders();
        toast('Estado actualizado', 'success');
    }

    // ══════════════════════════════════════════════════════════
    // WAREHOUSES
    // ══════════════════════════════════════════════════════════

    function renderWarehouses() {
        const warehouses = DataManager.getWarehouses();
        const products = DataManager.getProducts();

        // Cards
        const cardsHTML = warehouses.map(wh => {
            const whProducts = products.filter(p => p.warehouse === wh.name);
            const pct = Math.round((wh.used / wh.capacity) * 100);
            const barColor = pct < 60 ? 'var(--green)' : pct < 85 ? 'var(--yellow)' : 'var(--red)';
            return `<div class="warehouse-card">
                <div class="warehouse-card-header" style="background:${wh.color}">
                    <span class="wh-icon">${wh.icon}</span>
                    <div class="wh-info">
                        <h4>${wh.fullName}</h4>
                        <p>${wh.description}</p>
                    </div>
                </div>
                <div class="warehouse-card-body">
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                        <span>Capacidad</span>
                        <strong>${pct}%</strong>
                    </div>
                    <div class="capacity-bar">
                        <div class="capacity-fill" style="width:${pct}%;background:${barColor}"></div>
                    </div>
                    <div class="warehouse-stats">
                        <div>Productos: <strong>${whProducts.length}</strong></div>
                        <div>Ubicaciones: <strong>${wh.locations}</strong></div>
                        <div>Usado: <strong>${wh.used}/${wh.capacity}</strong></div>
                    </div>
                </div>
            </div>`;
        }).join('');
        document.getElementById('warehouseCards').innerHTML = cardsHTML;

        // Visual map
        const mapHTML = warehouses.map(wh => {
            const whProducts = products.filter(p => p.warehouse === wh.name);
            return `<div class="map-zone" style="background:${wh.color}" onclick="App.showWarehouseDetail('${wh.id}')">
                <div class="zone-icon">${wh.icon}</div>
                <div class="zone-name">${wh.name}</div>
                <div class="zone-count">${whProducts.length} productos</div>
            </div>`;
        }).join('');
        document.getElementById('warehouseMap').innerHTML = mapHTML;

        // Gauges
        setTimeout(() => {
            warehouses.forEach(wh => {
                const canvasId = 'gauge-' + wh.id;
                const canvas = document.getElementById(canvasId);
                if (canvas) Charts.drawGauge(canvasId, wh.used, wh.capacity, { size: 130, label: wh.name });
            });
        }, 50);

        // Rack visualization
        renderRackView();
        bindRackEvents();
    }

    // ── Rack 3D Visualization ────────────────────────────────

    function getProductIcon(category, subcategory) {
        const icons = {
            'Aires Acondicionados': { default: '❄️', 'Equipos': '🌡️', 'Refrigerantes': '🧊', 'Partes': '🔧', 'Accesorios': '🎛️', 'Herramientas': '🛠️' },
            'Fumigación': { default: '🧪', 'Insecticidas': '🪲', 'Rodenticidas': '🐀', 'Equipos': '💨', 'Seguridad': '🦺' },
            'Piscinas': { default: '🏊', 'Químicos': '🧴', 'Bombas': '⚙️', 'Filtros': '🔵', 'Accesorios': '🏖️', 'Equipos': '☀️' }
        };
        const catIcons = icons[category] || { default: '📦' };
        return catIcons[subcategory] || catIcons.default;
    }

    function parseLocation(loc) {
        // e.g. "A-01-02" => { zone: "A", rack: "01", shelf: "02" }
        const parts = loc.split('-');
        return { zone: parts[0] || '', rack: parts[1] || '01', shelf: parts[2] || '01' };
    }

    function renderRackView(filterZone) {
        const warehouses = DataManager.getWarehouses();
        const products = DataManager.getProducts();
        const floor = document.getElementById('rackFloor');
        if (!floor) return;

        let html = '';
        const filteredWarehouses = filterZone
            ? warehouses.filter(wh => wh.name === filterZone)
            : warehouses;

        filteredWarehouses.forEach(wh => {
            const whProducts = products.filter(p => p.warehouse === wh.name);

            // Group products by rack
            const racks = {};
            whProducts.forEach(p => {
                const loc = parseLocation(p.location);
                const rackKey = loc.rack;
                if (!racks[rackKey]) racks[rackKey] = {};
                if (!racks[rackKey][loc.shelf]) racks[rackKey][loc.shelf] = [];
                racks[rackKey][loc.shelf].push(p);
            });

            // Ensure at least some racks exist for visual effect
            const rackKeys = Object.keys(racks).sort();
            if (rackKeys.length === 0) rackKeys.push('01');

            html += `<div class="rack-zone">
                <div class="rack-zone-header">
                    <div class="rack-zone-icon" style="background:${wh.color}">${wh.icon}</div>
                    <div>
                        <div class="rack-zone-title">${wh.fullName}</div>
                        <div class="rack-zone-subtitle">${whProducts.length} productos en ${rackKeys.length} racks &bull; ${wh.locations} ubicaciones</div>
                    </div>
                </div>
                <div class="rack-aisle">`;

            rackKeys.forEach(rackKey => {
                const shelvesData = racks[rackKey] || {};
                const zonePrefix = wh.name.replace('Zona ', '');
                // Always show shelves 01-04
                const shelfNums = ['01', '02', '03', '04'];

                html += `<div class="rack-unit">
                    <div class="rack-unit-header" style="background:${wh.color}">
                        <span>RACK ${zonePrefix}-${rackKey}</span>
                        <span class="rack-id">${wh.name}</span>
                    </div>
                    <div class="rack-shelves">`;

                shelfNums.forEach((sn, idx) => {
                    const shelfProducts = shelvesData[sn] || [];
                    const levelLabel = 4 - idx; // top=4, bottom=1

                    html += `<div class="rack-shelf">
                        <div class="rack-shelf-label">N${levelLabel}</div>
                        <div class="rack-shelf-products">`;

                    if (shelfProducts.length > 0) {
                        shelfProducts.forEach(p => {
                            const icon = getProductIcon(p.category, p.subcategory);
                            const statusClass = p.status === 'critical' ? 'status-critical' : p.status === 'low' ? 'status-low' : 'status-ok';
                            html += `<div class="rack-product ${statusClass}" data-product-id="${p.id}">
                                <div class="rack-product-tooltip">
                                    <strong>${p.name}</strong><br>
                                    SKU: ${p.sku}<br>
                                    Cant: ${p.quantity} / Mín: ${p.minStock}<br>
                                    Ubicación: ${p.location}<br>
                                    Precio: $${p.unitPrice.toLocaleString()}
                                </div>
                                <span class="product-icon">${icon}</span>
                                <span class="product-qty">${p.quantity}</span>
                            </div>`;
                        });
                    } else {
                        html += `<div class="rack-shelf-empty">— vacío —</div>`;
                    }

                    html += `</div></div>`;
                });

                html += `</div><div class="rack-unit-shadow"></div></div>`;
            });

            html += `</div></div>`;
        });

        floor.innerHTML = html;
    }

    let rackIsometric = false;

    function bindRackEvents() {
        const filterEl = document.getElementById('rackZoneFilter');
        const toggleBtn = document.getElementById('btnToggleRackView');
        if (!filterEl || !toggleBtn) return;

        // Remove old listeners by cloning
        const newFilter = filterEl.cloneNode(true);
        filterEl.parentNode.replaceChild(newFilter, filterEl);
        const newToggle = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);

        newFilter.addEventListener('change', () => {
            renderRackView(newFilter.value);
        });

        newToggle.addEventListener('click', () => {
            rackIsometric = !rackIsometric;
            const floor = document.getElementById('rackFloor');
            if (floor) floor.classList.toggle('isometric', rackIsometric);
        });

        // Click product on rack -> show detail
        document.getElementById('rackFloor').addEventListener('click', e => {
            const prodEl = e.target.closest('.rack-product');
            if (!prodEl) return;
            const pId = prodEl.dataset.productId;
            const p = DataManager.getProduct(pId);
            if (!p) return;

            const statusLabel = p.status === 'ok' ? 'Normal' : p.status === 'low' ? 'Bajo' : 'Crítico';
            const statusBg = p.status === 'ok' ? 'var(--green-bg)' : p.status === 'low' ? 'var(--yellow-bg)' : 'var(--red-bg)';
            const statusColor = p.status === 'ok' ? '#047857' : p.status === 'low' ? '#b45309' : '#dc2626';
            const icon = getProductIcon(p.category, p.subcategory);

            const body = `
                <div style="text-align:center;margin-bottom:16px;">
                    <div style="font-size:3rem;">${icon}</div>
                    <div style="display:inline-block;padding:4px 14px;border-radius:20px;background:${statusBg};color:${statusColor};font-size:0.82rem;font-weight:600;margin-top:8px;">${statusLabel}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;">
                        <div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;">SKU</div>
                        <div style="font-weight:700;color:var(--gray-800);">${p.sku}</div>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;">
                        <div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;">Ubicación</div>
                        <div style="font-weight:700;color:var(--gray-800);">${p.location} (${p.warehouse})</div>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;">
                        <div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;">Cantidad</div>
                        <div style="font-weight:700;font-size:1.3rem;color:${statusColor};">${p.quantity} <span style="font-size:0.8rem;color:var(--gray-400);">/ mín ${p.minStock}</span></div>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;">
                        <div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;">Precio Unit.</div>
                        <div style="font-weight:700;color:var(--gray-800);">$${p.unitPrice.toLocaleString()}</div>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;">
                        <div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;">Categoría</div>
                        <div style="font-weight:600;color:var(--gray-700);font-size:0.88rem;">${p.category}</div>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;">
                        <div style="font-size:0.72rem;color:var(--gray-400);text-transform:uppercase;font-weight:600;">Valor Total</div>
                        <div style="font-weight:700;color:var(--primary);">$${(p.quantity * p.unitPrice).toLocaleString()}</div>
                    </div>
                </div>
                <div style="margin-top:14px;padding:10px 14px;background:var(--gray-50);border-radius:8px;font-size:0.82rem;color:var(--gray-500);">
                    Última actualización: ${p.lastUpdated}
                </div>`;

            openModal(p.name, body, `<button class="btn btn-outline" onclick="App.closeModal()">Cerrar</button>`);
        });
    }

    function showWarehouseDetail(whId) {
        const wh = DataManager.getWarehouses().find(w => w.id === whId);
        if (!wh) return;
        const products = DataManager.getProducts().filter(p => p.warehouse === wh.name);
        const rows = products.map(p => `<tr>
            <td>${p.sku}</td><td>${p.name}</td><td>${p.location}</td>
            <td class="text-center">${p.quantity}</td><td>${statusBadge(p.status)}</td>
        </tr>`).join('');

        const body = `
            <p style="margin-bottom:12px;color:var(--gray-500);">${wh.description}</p>
            <table class="data-table">
                <thead><tr><th>SKU</th><th>Producto</th><th>Ubicaci\u00f3n</th><th class="text-center">Cant.</th><th>Estado</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="5" class="text-center" style="padding:20px;">Sin productos</td></tr>'}</tbody>
            </table>`;
        openModal(wh.fullName, body, `<button class="btn btn-outline" onclick="App.closeModal()">Cerrar</button>`);
    }

    // ══════════════════════════════════════════════════════════
    // SUPPLIERS
    // ══════════════════════════════════════════════════════════

    function renderSuppliers() {
        const suppliers = DataManager.getSuppliers();
        const cardsHTML = suppliers.map(s => {
            const stars = '\u2605'.repeat(s.rating) + '\u2606'.repeat(5 - s.rating);
            const catBadges = (s.categories || []).map(c => {
                const color = Charts.CATEGORY_COLORS[c] || '#6b7280';
                return `<span class="badge" style="background:${color}15;color:${color}">${c}</span>`;
            }).join('');
            return `<div class="supplier-card">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div>
                        <h4>${s.name}</h4>
                        <div class="supplier-contact">${s.contact}</div>
                    </div>
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-ghost btn-sm" onclick="App.editSupplier('${s.id}')">\u270f\ufe0f</button>
                        <button class="btn btn-ghost btn-sm" onclick="App.deleteSupplier('${s.id}')">\ud83d\uddd1\ufe0f</button>
                    </div>
                </div>
                <div class="star-rating">${stars}</div>
                <div class="supplier-detail"><span class="detail-icon">\ud83d\udcde</span>${s.phone}</div>
                <div class="supplier-detail"><span class="detail-icon">\u2709\ufe0f</span>${s.email}</div>
                <div class="supplier-detail"><span class="detail-icon">\ud83d\udccd</span>${s.address}</div>
                ${s.notes ? `<div style="font-size:0.82rem;color:var(--gray-500);margin-top:8px;font-style:italic;">${s.notes}</div>` : ''}
                <div class="supplier-categories">${catBadges}</div>
            </div>`;
        }).join('');
        document.getElementById('supplierGrid').innerHTML = cardsHTML;
    }

    function bindSupplierEvents() {
        document.getElementById('btnAddSupplier')?.addEventListener('click', () => showSupplierForm());
    }

    function showSupplierForm(supplierId) {
        const supplier = supplierId ? DataManager.getSupplier(supplierId) : null;
        const isEdit = !!supplier;
        const cats = ['Aires Acondicionados', 'Fumigaci\u00f3n', 'Piscinas'];

        const body = `
        <form id="supplierForm">
            <div class="form-group">
                <label>Nombre de la Empresa</label>
                <input type="text" id="sName" value="${supplier?.name || ''}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Contacto</label>
                    <input type="text" id="sContact" value="${supplier?.contact || ''}">
                </div>
                <div class="form-group">
                    <label>Tel\u00e9fono</label>
                    <input type="text" id="sPhone" value="${supplier?.phone || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="sEmail" value="${supplier?.email || ''}">
                </div>
                <div class="form-group">
                    <label>Calificaci\u00f3n (1-5)</label>
                    <select id="sRating">
                        ${[1,2,3,4,5].map(r => `<option value="${r}" ${supplier?.rating === r ? 'selected' : ''}>${r} \u2605</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Direcci\u00f3n</label>
                <input type="text" id="sAddress" value="${supplier?.address || ''}">
            </div>
            <div class="form-group">
                <label>Categor\u00edas que Suministra</label>
                <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;">
                    ${cats.map(c => `<label style="display:flex;align-items:center;gap:4px;font-size:0.88rem;cursor:pointer;">
                        <input type="checkbox" class="sCat" value="${c}" ${supplier?.categories?.includes(c) ? 'checked' : ''}> ${c}
                    </label>`).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Notas</label>
                <textarea id="sNotes" rows="2">${supplier?.notes || ''}</textarea>
            </div>
        </form>`;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="App.saveSupplierForm('${supplierId || ''}')">${isEdit ? 'Actualizar' : 'Guardar'}</button>`;

        openModal(isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor', body, footer);
    }

    function saveSupplierForm(editId) {
        const supplier = editId ? DataManager.getSupplier(editId) : {};
        supplier.name = document.getElementById('sName').value.trim();
        supplier.contact = document.getElementById('sContact').value.trim();
        supplier.phone = document.getElementById('sPhone').value.trim();
        supplier.email = document.getElementById('sEmail').value.trim();
        supplier.address = document.getElementById('sAddress').value.trim();
        supplier.rating = parseInt(document.getElementById('sRating').value) || 3;
        supplier.notes = document.getElementById('sNotes').value.trim();
        supplier.status = 'active';
        supplier.categories = Array.from(document.querySelectorAll('.sCat:checked')).map(c => c.value);

        if (!supplier.name) { toast('El nombre es requerido', 'warning'); return; }

        DataManager.saveSupplier(supplier);
        closeModal();
        renderSuppliers();
        toast(editId ? 'Proveedor actualizado' : 'Proveedor agregado', 'success');
    }

    function deleteSupplierConfirm(id) {
        const s = DataManager.getSupplier(id);
        if (!s) return;
        openModal('Confirmar Eliminaci\u00f3n',
            `<p>\u00bfEliminar al proveedor <strong>${s.name}</strong>?</p>`,
            `<button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
             <button class="btn btn-danger" onclick="DataManager.deleteSupplier('${id}');App.closeModal();App.renderSuppliers();App.toast('Proveedor eliminado','success');">Eliminar</button>`);
    }

    // ══════════════════════════════════════════════════════════
    // REPORTS
    // ══════════════════════════════════════════════════════════

    let currentReport = 'valuation';

    function renderReports() {
        showReport(currentReport);
    }

    function bindReportEvents() {
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentReport = tab.dataset.report;
                showReport(currentReport);
            });
        });
        document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());
    }

    function showReport(type) {
        const container = document.getElementById('reportContent');
        switch (type) {
            case 'valuation': renderValuationReport(container); break;
            case 'movements': renderMovementReport(container); break;
            case 'lowstock': renderLowStockReport(container); break;
            case 'categories': renderCategoryReport(container); break;
        }
    }

    function renderValuationReport(container) {
        const products = DataManager.getProducts();
        const stats = DataManager.getDashboardStats();
        const rows = products.sort((a, b) => (b.quantity * b.unitPrice) - (a.quantity * a.unitPrice)).map(p => {
            const total = p.quantity * p.unitPrice;
            return `<tr><td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td><td class="text-center">${p.quantity}</td><td class="text-right">${currency(p.unitPrice)}</td><td class="text-right"><strong>${currency(total)}</strong></td></tr>`;
        }).join('');

        container.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card"><div class="kpi-icon blue">\ud83d\udcb0</div><div class="kpi-content"><div class="kpi-label">Valor Total del Inventario</div><div class="kpi-value">${currency(stats.totalValue)}</div></div></div>
                <div class="kpi-card"><div class="kpi-icon green">\ud83d\udce6</div><div class="kpi-content"><div class="kpi-label">Total Productos</div><div class="kpi-value">${stats.totalProducts}</div></div></div>
                <div class="kpi-card"><div class="kpi-icon yellow">\ud83d\udccb</div><div class="kpi-content"><div class="kpi-label">Unidades Totales</div><div class="kpi-value">${stats.totalQuantity.toLocaleString()}</div></div></div>
            </div>
            <div class="grid-2">
                <div class="card"><div class="card-header"><h3>Valor por Categor\u00eda</h3></div><div class="card-body"><canvas id="reportValChart"></canvas></div></div>
                <div class="card"><div class="card-header"><h3>Top 10 Productos por Valor</h3></div><div class="card-body"><canvas id="reportTopChart"></canvas></div></div>
            </div>
            <div class="card"><div class="card-header"><h3>Detalle de Valoraci\u00f3n</h3></div><div class="card-body no-padding"><div class="table-container">
                <table class="data-table"><thead><tr><th>SKU</th><th>Producto</th><th>Categor\u00eda</th><th class="text-center">Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Valor Total</th></tr></thead><tbody>${rows}</tbody></table>
            </div></div></div>`;

        setTimeout(() => {
            const catData = Object.entries(stats.categoryTotals).map(([cat, data]) => ({
                label: cat, value: Math.round(data.value), color: Charts.CATEGORY_COLORS[cat]
            }));
            Charts.drawDonut('reportValChart', catData);

            const top10 = products.sort((a, b) => (b.quantity * b.unitPrice) - (a.quantity * a.unitPrice)).slice(0, 10).map(p => ({
                label: p.sku, value: p.quantity * p.unitPrice, color: Charts.CATEGORY_COLORS[p.category]
            }));
            Charts.drawHorizontalBar('reportTopChart', top10, { formatValue: v => '$' + (v/1000).toFixed(1) + 'k', height: 300 });
        }, 80);
    }

    function renderMovementReport(container) {
        const movements = DataManager.getMovements();
        const entries = movements.filter(m => m.type === 'Entrada');
        const exits = movements.filter(m => m.type === 'Salida');
        const transfers = movements.filter(m => m.type === 'Transferencia');

        const entryQty = entries.reduce((s, m) => s + m.quantity, 0);
        const exitQty = exits.reduce((s, m) => s + m.quantity, 0);
        const transferQty = transfers.reduce((s, m) => s + m.quantity, 0);

        container.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card"><div class="kpi-icon green">\ud83d\udce5</div><div class="kpi-content"><div class="kpi-label">Entradas</div><div class="kpi-value">${entries.length}</div><div class="kpi-sub">${entryQty} unidades</div></div></div>
                <div class="kpi-card"><div class="kpi-icon red">\ud83d\udce4</div><div class="kpi-content"><div class="kpi-label">Salidas</div><div class="kpi-value">${exits.length}</div><div class="kpi-sub">${exitQty} unidades</div></div></div>
                <div class="kpi-card"><div class="kpi-icon blue">\ud83d\udd04</div><div class="kpi-content"><div class="kpi-label">Transferencias</div><div class="kpi-value">${transfers.length}</div><div class="kpi-sub">${transferQty} unidades</div></div></div>
            </div>
            <div class="grid-2">
                <div class="card"><div class="card-header"><h3>Movimientos por Tipo</h3></div><div class="card-body"><canvas id="reportMovTypeChart"></canvas></div></div>
                <div class="card"><div class="card-header"><h3>Movimientos por D\u00eda</h3></div><div class="card-body"><canvas id="reportMovDayChart"></canvas></div></div>
            </div>`;

        setTimeout(() => {
            Charts.drawDonut('reportMovTypeChart', [
                { label: 'Entradas', value: entries.length, color: Charts.COLORS.green },
                { label: 'Salidas', value: exits.length, color: Charts.COLORS.red },
                { label: 'Transferencias', value: transfers.length, color: Charts.COLORS.blue }
            ]);

            // Group by date
            const byDate = {};
            movements.forEach(m => { byDate[m.date] = (byDate[m.date] || 0) + 1; });
            const dates = Object.keys(byDate).sort().slice(-7);
            Charts.drawBar('reportMovDayChart',
                dates.map(d => ({ label: d.slice(5), value: byDate[d], color: Charts.COLORS.blue })),
                { title: '\u00daltimos 7 d\u00edas' }
            );
        }, 80);
    }

    function renderLowStockReport(container) {
        const products = DataManager.getProducts().filter(p => p.status === 'low' || p.status === 'critical');
        const critical = products.filter(p => p.status === 'critical');
        const low = products.filter(p => p.status === 'low');

        const rows = products.sort((a, b) => (a.quantity / a.minStock) - (b.quantity / b.minStock)).map(p => {
            const deficit = p.minStock - p.quantity;
            const costToRestock = deficit > 0 ? deficit * p.unitPrice : 0;
            return `<tr>
                <td>${p.sku}</td><td>${p.name}</td><td>${p.category}</td><td>${p.location}</td>
                <td class="text-center"><strong>${p.quantity}</strong></td><td class="text-center">${p.minStock}</td>
                <td class="text-center">${deficit > 0 ? deficit : '-'}</td>
                <td class="text-right">${costToRestock > 0 ? currency(costToRestock) : '-'}</td>
                <td>${statusBadge(p.status)}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="kpi-grid" style="margin-bottom:20px;">
                <div class="kpi-card"><div class="kpi-icon red">\ud83d\udea8</div><div class="kpi-content"><div class="kpi-label">Cr\u00edticos</div><div class="kpi-value">${critical.length}</div></div></div>
                <div class="kpi-card"><div class="kpi-icon yellow">\u26a0\ufe0f</div><div class="kpi-content"><div class="kpi-label">Stock Bajo</div><div class="kpi-value">${low.length}</div></div></div>
                <div class="kpi-card"><div class="kpi-icon blue">\ud83d\udcca</div><div class="kpi-content"><div class="kpi-label">Total con Alerta</div><div class="kpi-value">${products.length}</div></div></div>
            </div>
            <div class="card"><div class="card-header"><h3>\ud83d\udea8 Productos con Stock Bajo o Cr\u00edtico</h3></div><div class="card-body no-padding"><div class="table-container">
                <table class="data-table"><thead><tr><th>SKU</th><th>Producto</th><th>Categor\u00eda</th><th>Ubicaci\u00f3n</th><th class="text-center">Stock</th><th class="text-center">M\u00ednimo</th><th class="text-center">D\u00e9ficit</th><th class="text-right">Costo Repos.</th><th>Estado</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="9" class="text-center" style="padding:24px;color:var(--gray-400);">No hay productos con stock bajo</td></tr>'}</tbody></table>
            </div></div></div>`;
    }

    function renderCategoryReport(container) {
        const stats = DataManager.getDashboardStats();
        const products = DataManager.getProducts();

        container.innerHTML = `
            <div class="grid-2">
                <div class="card"><div class="card-header"><h3>Distribuci\u00f3n por Categor\u00eda</h3></div><div class="card-body"><canvas id="reportCatPie"></canvas></div></div>
                <div class="card"><div class="card-header"><h3>Productos por Categor\u00eda</h3></div><div class="card-body"><canvas id="reportCatBar"></canvas></div></div>
            </div>
            <div class="card"><div class="card-header"><h3>Resumen por Categor\u00eda</h3></div><div class="card-body no-padding"><div class="table-container">
                <table class="data-table"><thead><tr><th>Categor\u00eda</th><th class="text-center">Productos</th><th class="text-center">Unidades</th><th class="text-right">Valor Total</th><th class="text-right">Valor Promedio</th></tr></thead>
                <tbody>${Object.entries(stats.categoryTotals).map(([cat, d]) => `<tr>
                    <td><strong>${cat}</strong></td><td class="text-center">${d.count}</td><td class="text-center">${d.quantity}</td>
                    <td class="text-right">${currency(d.value)}</td><td class="text-right">${currency(d.value / d.count)}</td>
                </tr>`).join('')}</tbody></table>
            </div></div></div>`;

        setTimeout(() => {
            const catData = Object.entries(stats.categoryTotals).map(([cat, d]) => ({
                label: cat, value: d.count, color: Charts.CATEGORY_COLORS[cat]
            }));
            Charts.drawDonut('reportCatPie', catData);

            Charts.drawBar('reportCatBar',
                Object.entries(stats.categoryTotals).map(([cat, d]) => ({
                    label: cat.split(' ')[0], value: d.quantity, color: Charts.CATEGORY_COLORS[cat]
                })),
                { title: 'Unidades por Categor\u00eda' }
            );
        }, 80);
    }

    // ══════════════════════════════════════════════════════════
    // SETTINGS
    // ══════════════════════════════════════════════════════════

    function renderSettings() {
        renderUserManagement();
        const settings = DataManager.getSettings();
        document.getElementById('settingCompany').value = settings.companyName || '';
        document.getElementById('settingCurrency').value = settings.currency || 'USD';
        const autoBackup = document.getElementById('settingAutoBackup');
        const notifications = document.getElementById('settingNotifications');
        if (autoBackup) autoBackup.checked = settings.autoBackup !== false;
        if (notifications) notifications.checked = settings.notifications !== false;
    }

    function renderUserManagement() {
        const users = DataManager.getUsers();
        const rows = users.map(u => `<tr>
            <td>${u.username}</td>
            <td>${u.name}</td>
            <td>${u.role}</td>
            <td>${u.email}</td>
            <td class="${u.status === 'active' ? 'user-status-active' : 'user-status-inactive'}">${u.status === 'active' ? 'Activo' : 'Inactivo'}</td>
            <td>${u.lastLogin || '-'}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="App.editUser('${u.id}')">\u270f\ufe0f</button></td>
        </tr>`).join('');
        document.getElementById('usersTableBody').innerHTML = rows;
    }

    function bindSettingEvents() {
        document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
            const settings = DataManager.getSettings();
            settings.companyName = document.getElementById('settingCompany').value;
            settings.currency = document.getElementById('settingCurrency').value;
            settings.autoBackup = document.getElementById('settingAutoBackup')?.checked ?? true;
            settings.notifications = document.getElementById('settingNotifications')?.checked ?? true;
            DataManager.saveSettings(settings);
            toast('Configuraci\u00f3n guardada', 'success');
        });
        document.getElementById('btnResetData')?.addEventListener('click', () => {
            openModal('Restablecer Datos',
                '<p>\u00bfRestablecer todos los datos a los valores predeterminados? Esta acci\u00f3n no se puede deshacer.</p>',
                `<button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                 <button class="btn btn-danger" onclick="DataManager.resetData();App.closeModal();App.navigateTo('settings');App.toast('Datos restablecidos','success');">Restablecer</button>`);
        });
        document.getElementById('btnAddUser')?.addEventListener('click', () => showUserForm());
    }

    function showUserForm(userId) {
        const user = userId ? DataManager.getUsers().find(u => u.id === userId) : null;
        const isEdit = !!user;
        const roles = ['Administrador', 'Supervisor', 'Almacenista', 'Consulta'];

        const body = `
        <form id="userForm">
            <div class="form-row">
                <div class="form-group"><label>Usuario</label><input type="text" id="uUsername" value="${user?.username || ''}" ${isEdit ? 'readonly style="background:var(--gray-100)"' : ''} required></div>
                <div class="form-group"><label>Contrase\u00f1a</label><input type="text" id="uPassword" value="${user?.password || ''}" required></div>
            </div>
            <div class="form-group"><label>Nombre Completo</label><input type="text" id="uName" value="${user?.name || ''}" required></div>
            <div class="form-row">
                <div class="form-group"><label>Rol</label><select id="uRole">${roles.map(r => `<option value="${r}" ${user?.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
                <div class="form-group"><label>Email</label><input type="email" id="uEmail" value="${user?.email || ''}"></div>
            </div>
            <div class="form-group">
                <label>Estado</label>
                <select id="uStatus"><option value="active" ${user?.status === 'active' ? 'selected' : ''}>Activo</option><option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactivo</option></select>
            </div>
        </form>`;

        const footer = `
            <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="App.saveUserForm('${userId || ''}')">${isEdit ? 'Actualizar' : 'Crear'}</button>`;
        openModal(isEdit ? 'Editar Usuario' : 'Nuevo Usuario', body, footer);
    }

    function saveUserForm(editId) {
        const user = editId ? DataManager.getUsers().find(u => u.id === editId) : {};
        user.username = document.getElementById('uUsername').value.trim();
        user.password = document.getElementById('uPassword').value.trim();
        user.name = document.getElementById('uName').value.trim();
        user.role = document.getElementById('uRole').value;
        user.email = document.getElementById('uEmail').value.trim();
        user.status = document.getElementById('uStatus').value;

        if (!user.username || !user.password || !user.name) {
            toast('Completa los campos requeridos', 'warning');
            return;
        }

        DataManager.saveUser(user);
        closeModal();
        renderUserManagement();
        toast(editId ? 'Usuario actualizado' : 'Usuario creado', 'success');
    }

    // ── DOM Ready ────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', async () => {
        await init();
        bindInventoryEvents();
        bindMovementEvents();
        bindOrderEvents();
        bindSupplierEvents();
        bindReportEvents();
        bindSettingEvents();
    });

    // ── Public API ───────────────────────────────────────────

    return {
        navigateTo,
        closeModal,
        toast,
        refreshCurrentModule() { renderModule(currentModule); },
        // Inventory
        editProduct: showProductForm,
        deleteProduct,
        confirmDeleteProduct,
        saveProductForm,
        invGoPage(p) { invPage = p; renderInventory(); },
        // Movements
        editMovement: showMovementForm,
        deleteMovement,
        confirmDeleteMovement,
        saveMovement,
        addMovProductRow,
        removeMovProductRow,
        // Orders
        viewOrder,
        editOrderStatus,
        updateOrderStatus,
        saveOrder,
        addOrderItemRow,
        // Warehouses
        showWarehouseDetail,
        // Suppliers
        editSupplier: showSupplierForm,
        deleteSupplier: deleteSupplierConfirm,
        saveSupplierForm,
        renderSuppliers,
        // Reports
        // Settings
        editUser: showUserForm,
        saveUserForm
    };
})();
