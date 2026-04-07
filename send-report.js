/* ============================================================
   RapidWMS Pro - Envío de Reportes por Línea de Comandos
   Uso: node send-report.js daily|weekly|monthly
   ============================================================ */

const nodemailer = require('nodemailer');

// ── Configuración ─────────────────────────────────────────────

const EMAIL_FROM = 'flota@gruporapid.com';
const EMAIL_PASS = 'bsqx tyvs wqam gxoh';

const DESTINATARIOS = [
    'mardito@gruporapid.com',
    'yflores@gruporapid.com',
    'jfuentes@gruporapid.com',
    'compras@gruporapid.com',
    'edegracia@gruporapid.com'
];

const COPIA_CARBON = [
    'vlacayo@gruporapid.com',
    'almacen2@gruporapid.com'
];

const FB_URL = 'https://wms-gruporapid-6689c-default-rtdb.firebaseio.com';

// ── Leer datos ────────────────────────────────────────────────

async function loadData() {
    try {
        const [movRes, prodRes] = await Promise.all([
            fetch(FB_URL + '/movements.json'),
            fetch(FB_URL + '/products.json')
        ]);
        const movements = await movRes.json() || [];
        const products = await prodRes.json() || [];
        // Build SKU lookup
        const skuMap = {};
        for (const p of products) { skuMap[p.id] = p.sku; }
        return { movements, products, skuMap };
    } catch (e) {
        console.error('Error leyendo datos de Firebase:', e.message);
        return { movements: [], products: [], skuMap: {} };
    }
}

let _skuMap = {};

// ── Helpers ───────────────────────────────────────────────────

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function getMovItems(mov) {
    if (mov.items) return mov.items;
    return [{ product: mov.product, productName: mov.productName, quantity: mov.quantity, warehouse: mov.warehouse, location: mov.location, notes: mov.notes || '' }];
}

// ── Estilos HTML ──────────────────────────────────────────────

const STYLES = `
<style>
    body { font-family: Arial, Helvetica, sans-serif; color: #333; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #1a3a8f; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .header .logo { font-size: 22px; font-weight: 900; font-style: italic; }
    .header .logo span { color: #ff4b50; }
    .header .subtitle { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .body-content { background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
    .summary-cards { display: flex; gap: 12px; margin-bottom: 20px; }
    .summary-card { flex: 1; background: white; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e5e7eb; }
    .summary-card .number { font-size: 28px; font-weight: 700; }
    .summary-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .green { color: #10b981; }
    .red { color: #ef4444; }
    .blue { color: #0ea5e9; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; margin-top: 16px; }
    th { background: #1a3a8f; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    tr:nth-child(even) { background: #f9fafb; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-entrada { background: #ecfdf5; color: #059669; }
    .badge-salida { background: #fef2f2; color: #dc2626; }
    .badge-transferencia { background: #eff6ff; color: #2563eb; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #9ca3af; }
    .no-data { text-align: center; padding: 40px; color: #9ca3af; }
</style>`;

function buildEmailHTML(title, subtitle, content) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${STYLES}</head><body>
    <div class="container">
        <div class="header">
            <div class="logo">GRUPO<span>RAPID</span></div>
            <h1>${title}</h1>
            <div class="subtitle">${subtitle}</div>
        </div>
        <div class="body-content">${content}</div>
        <div class="footer">
            RapidWMS Pro - Sistema de Gestión de Almacén<br>
            Reporte generado automáticamente el ${new Date().toLocaleString('es-PA')}
        </div>
    </div>
    </body></html>`;
}

function buildMovementTable(movements) {
    if (!movements.length) return '<div class="no-data">No se registraron movimientos en este período</div>';

    let rows = '';
    for (const m of movements) {
        const items = getMovItems(m);
        for (const item of items) {
            const badgeClass = m.type === 'Entrada' ? 'badge-entrada' : m.type === 'Salida' ? 'badge-salida' : 'badge-transferencia';
            const sku = _skuMap[item.product] || '-';
            rows += `<tr>
                <td>${formatDate(m.date)}</td>
                <td>${m.time}</td>
                <td><span class="badge ${badgeClass}">${m.type}</span></td>
                <td>${sku}</td>
                <td>${item.productName}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td>${item.warehouse}</td>
                <td>${item.location || '-'}</td>
                <td>${m.reference || '-'}</td>
                <td>${item.notes || '-'}</td>
            </tr>`;
        }
    }

    return `<table>
        <thead><tr>
            <th>Fecha</th><th>Hora</th><th>Tipo</th><th>SKU</th><th>Producto</th>
            <th style="text-align:center;">Cant.</th><th>Almacén</th><th>Ubicación</th><th>Referencia</th><th>Notas</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

function countByType(movements, type) {
    let count = 0;
    for (const m of movements) {
        if (m.type !== type) continue;
        const items = getMovItems(m);
        for (const item of items) count += parseInt(item.quantity);
    }
    return count;
}

function buildSummaryCards(movements) {
    return `<div class="summary-cards">
        <div class="summary-card"><div class="number">${movements.length}</div><div class="label">Total Movimientos</div></div>
        <div class="summary-card"><div class="number green">${countByType(movements, 'Entrada')}</div><div class="label">Unidades Entrada</div></div>
        <div class="summary-card"><div class="number red">${countByType(movements, 'Salida')}</div><div class="label">Unidades Salida</div></div>
        <div class="summary-card"><div class="number blue">${countByType(movements, 'Transferencia')}</div><div class="label">Unidades Transferencia</div></div>
    </div>`;
}

function buildExitSummaryCards(movements) {
    const salidas = movements.filter(m => m.type === 'Salida');
    let totalUnits = 0;
    const byProduct = {};
    for (const m of salidas) {
        const items = getMovItems(m);
        for (const item of items) {
            const qty = parseInt(item.quantity);
            totalUnits += qty;
            byProduct[item.productName] = (byProduct[item.productName] || 0) + qty;
        }
    }
    const topProducts = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, qty]) => `<tr><td>${name}</td><td style="text-align:center;font-weight:700;">${qty}</td></tr>`).join('');
    let topTable = topProducts ? `<h3 style="margin-top:20px;font-size:14px;color:#374151;">Top Productos con más Salidas</h3>
        <table><thead><tr><th>Producto</th><th style="text-align:center;">Unidades</th></tr></thead><tbody>${topProducts}</tbody></table>` : '';

    return `<div class="summary-cards">
        <div class="summary-card"><div class="number red">${salidas.length}</div><div class="label">Total Salidas</div></div>
        <div class="summary-card"><div class="number red">${totalUnits}</div><div class="label">Unidades Despachadas</div></div>
    </div>${topTable}`;
}

// ── Generadores ───────────────────────────────────────────────

function generateDailyReport(movements) {
    const today = new Date().toISOString().split('T')[0];
    const todayMovs = movements.filter(m => m.date === today);
    return {
        subject: `📦 Reporte Diario de Movimientos - ${formatDate(today)}`,
        html: buildEmailHTML('Reporte Diario de Movimientos',
            `Resumen de entradas, salidas y transferencias del ${formatDate(today)}`,
            buildSummaryCards(todayMovs) + buildMovementTable(todayMovs))
    };
}

function generateWeeklyReport(movements) {
    const today = new Date();
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const startStr = weekAgo.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];
    const weekMovs = movements.filter(m => m.date >= startStr && m.date <= endStr);
    const weekExits = weekMovs.filter(m => m.type === 'Salida');
    return {
        subject: `📊 Reporte Semanal de Salidas - ${formatDate(startStr)} al ${formatDate(endStr)}`,
        html: buildEmailHTML('Reporte Semanal de Salidas',
            `Resumen de salidas del ${formatDate(startStr)} al ${formatDate(endStr)}`,
            buildExitSummaryCards(weekMovs) +
            `<h3 style="margin-top:20px;font-size:14px;color:#374151;">Detalle de Salidas</h3>` +
            buildMovementTable(weekExits))
    };
}

function generateMonthlyReport(movements) {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const startStr = lastMonth.toISOString().split('T')[0];
    const endStr = lastMonthEnd.toISOString().split('T')[0];
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const monthName = monthNames[lastMonth.getMonth()];
    const year = lastMonth.getFullYear();
    const monthMovs = movements.filter(m => m.date >= startStr && m.date <= endStr);
    const monthExits = monthMovs.filter(m => m.type === 'Salida');
    return {
        subject: `📈 Reporte Mensual de Salidas - ${monthName} ${year}`,
        html: buildEmailHTML(`Reporte Mensual de Salidas`,
            `Resumen total de salidas del mes de ${monthName} ${year}`,
            buildExitSummaryCards(monthMovs) +
            `<h3 style="margin-top:20px;font-size:14px;color:#374151;">Detalle de Salidas - ${monthName} ${year}</h3>` +
            buildMovementTable(monthExits))
    };
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
    const type = process.argv[2];
    if (!['daily', 'weekly', 'monthly'].includes(type)) {
        console.log('Uso: node send-report.js daily|weekly|monthly');
        process.exit(1);
    }

    console.log(`[${new Date().toLocaleString('es-PA')}] Generando reporte ${type}...`);

    const data = await loadData();
    const movements = data.movements || [];
    _skuMap = data.skuMap || {};

    let report;
    if (type === 'daily') report = generateDailyReport(movements);
    else if (type === 'weekly') report = generateWeeklyReport(movements);
    else report = generateMonthlyReport(movements);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_FROM, pass: EMAIL_PASS }
    });

    try {
        const info = await transporter.sendMail({
            from: `"RapidWMS Pro" <${EMAIL_FROM}>`,
            to: DESTINATARIOS.join(', '),
            cc: COPIA_CARBON.join(', '),
            subject: report.subject,
            html: report.html
        });
        console.log(`Reporte enviado exitosamente: ${report.subject}`);
        console.log(`Message ID: ${info.messageId}`);
    } catch (err) {
        console.error('Error enviando correo:', err.message);
        process.exit(1);
    }
}

main();
