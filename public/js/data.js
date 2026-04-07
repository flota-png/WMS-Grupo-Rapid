/* ============================================================
   RapidWMS Pro - Data Layer (Platform Mode)
   Sincroniza datos con el servidor para que todos los usuarios
   compartan la misma informacion en tiempo real.
   ============================================================ */

const DataManager = (() => {
    // ── In-memory data store ───────────────────────────────────
    let _data = {
        products: [],
        movements: [],
        orders: [],
        suppliers: [],
        warehouses: [],
        users: [],
        settings: {}
    };

    let _version = 0;
    let _syncing = false;
    let _pollInterval = null;
    let _initialized = false;

    // ── Default Sample Data ──────────────────────────────────

    const defaultProducts = [
        // Aires Acondicionados (12 products)
        { id: 'P001', sku: 'AC-INV-12K', name: 'Mini Split Inverter 12,000 BTU', category: 'Aires Acondicionados', subcategory: 'Equipos', quantity: 18, minStock: 5, location: 'A-01-01', warehouse: 'Zona A', unitPrice: 8500.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P002', sku: 'AC-INV-18K', name: 'Mini Split Inverter 18,000 BTU', category: 'Aires Acondicionados', subcategory: 'Equipos', quantity: 12, minStock: 4, location: 'A-01-02', warehouse: 'Zona A', unitPrice: 12500.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P003', sku: 'AC-INV-24K', name: 'Mini Split Inverter 24,000 BTU', category: 'Aires Acondicionados', subcategory: 'Equipos', quantity: 7, minStock: 3, location: 'A-01-03', warehouse: 'Zona A', unitPrice: 16800.00, status: 'ok', lastUpdated: '2026-03-10' },
        { id: 'P004', sku: 'AC-CAS-36K', name: 'Cassette Comercial 36,000 BTU', category: 'Aires Acondicionados', subcategory: 'Equipos', quantity: 3, minStock: 2, location: 'A-02-01', warehouse: 'Zona A', unitPrice: 28500.00, status: 'low', lastUpdated: '2026-03-10' },
        { id: 'P005', sku: 'AC-REF-R410', name: 'Refrigerante R-410A (11.3 kg)', category: 'Aires Acondicionados', subcategory: 'Refrigerantes', quantity: 25, minStock: 10, location: 'A-03-01', warehouse: 'Zona A', unitPrice: 1850.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P006', sku: 'AC-REF-R22', name: 'Refrigerante R-22 (13.6 kg)', category: 'Aires Acondicionados', subcategory: 'Refrigerantes', quantity: 8, minStock: 8, location: 'A-03-02', warehouse: 'Zona A', unitPrice: 2200.00, status: 'critical', lastUpdated: '2026-03-09' },
        { id: 'P007', sku: 'AC-TUB-14', name: 'Tuberia de Cobre 1/4" (rollo 15m)', category: 'Aires Acondicionados', subcategory: 'Partes', quantity: 30, minStock: 10, location: 'A-04-01', warehouse: 'Zona A', unitPrice: 950.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P008', sku: 'AC-TUB-38', name: 'Tuberia de Cobre 3/8" (rollo 15m)', category: 'Aires Acondicionados', subcategory: 'Partes', quantity: 22, minStock: 10, location: 'A-04-02', warehouse: 'Zona A', unitPrice: 1100.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P009', sku: 'AC-CTRL-UNI', name: 'Control Remoto Universal AC', category: 'Aires Acondicionados', subcategory: 'Accesorios', quantity: 45, minStock: 15, location: 'A-05-01', warehouse: 'Zona A', unitPrice: 185.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P010', sku: 'AC-FILT-STD', name: 'Filtro Estandar para Mini Split', category: 'Aires Acondicionados', subcategory: 'Partes', quantity: 60, minStock: 20, location: 'A-05-02', warehouse: 'Zona A', unitPrice: 120.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P011', sku: 'AC-SOPRT-EXT', name: 'Soporte Pared Condensadora', category: 'Aires Acondicionados', subcategory: 'Accesorios', quantity: 2, minStock: 5, location: 'A-06-01', warehouse: 'Zona A', unitPrice: 450.00, status: 'critical', lastUpdated: '2026-03-08' },
        { id: 'P012', sku: 'AC-BOMB-VAC', name: 'Bomba de Vacio 1/3 HP', category: 'Aires Acondicionados', subcategory: 'Herramientas', quantity: 4, minStock: 2, location: 'A-06-02', warehouse: 'Zona A', unitPrice: 3200.00, status: 'ok', lastUpdated: '2026-03-07' },

        // Fumigacion (10 products)
        { id: 'P013', sku: 'FU-INS-CYP', name: 'Cipermetrina 25% EC (1L)', category: 'Fumigacion', subcategory: 'Insecticidas', quantity: 35, minStock: 15, location: 'B-01-01', warehouse: 'Zona B', unitPrice: 380.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P014', sku: 'FU-INS-FIP', name: 'Fipronil 20% SC (250ml)', category: 'Fumigacion', subcategory: 'Insecticidas', quantity: 20, minStock: 10, location: 'B-01-02', warehouse: 'Zona B', unitPrice: 520.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P015', sku: 'FU-ROD-BLK', name: 'Rodenticida en Bloques (caja 10kg)', category: 'Fumigacion', subcategory: 'Rodenticidas', quantity: 5, minStock: 5, location: 'B-02-01', warehouse: 'Zona B', unitPrice: 890.00, status: 'critical', lastUpdated: '2026-03-10' },
        { id: 'P016', sku: 'FU-EQP-ASP20', name: 'Aspersora Manual 20L', category: 'Fumigacion', subcategory: 'Equipos', quantity: 14, minStock: 5, location: 'B-03-01', warehouse: 'Zona B', unitPrice: 1250.00, status: 'ok', lastUpdated: '2026-03-09' },
        { id: 'P017', sku: 'FU-EQP-TERM', name: 'Termonebulizadora Portatil', category: 'Fumigacion', subcategory: 'Equipos', quantity: 3, minStock: 2, location: 'B-03-02', warehouse: 'Zona B', unitPrice: 8500.00, status: 'low', lastUpdated: '2026-03-08' },
        { id: 'P018', sku: 'FU-SEG-MASC', name: 'Mascarilla Respirador con Filtros', category: 'Fumigacion', subcategory: 'Seguridad', quantity: 18, minStock: 10, location: 'B-04-01', warehouse: 'Zona B', unitPrice: 650.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P019', sku: 'FU-SEG-GUANT', name: 'Guantes de Nitrilo (caja 100)', category: 'Fumigacion', subcategory: 'Seguridad', quantity: 12, minStock: 8, location: 'B-04-02', warehouse: 'Zona B', unitPrice: 280.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P020', sku: 'FU-SEG-TYVEK', name: 'Traje Tyvek Desechable', category: 'Fumigacion', subcategory: 'Seguridad', quantity: 25, minStock: 10, location: 'B-04-03', warehouse: 'Zona B', unitPrice: 195.00, status: 'ok', lastUpdated: '2026-03-10' },
        { id: 'P021', sku: 'FU-GEL-CUCA', name: 'Gel para Cucarachas (jeringa 35g)', category: 'Fumigacion', subcategory: 'Insecticidas', quantity: 40, minStock: 20, location: 'B-01-03', warehouse: 'Zona B', unitPrice: 145.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P022', sku: 'FU-TRAM-LUZ', name: 'Trampa de Luz UV Industrial', category: 'Fumigacion', subcategory: 'Equipos', quantity: 6, minStock: 3, location: 'B-03-03', warehouse: 'Zona B', unitPrice: 2800.00, status: 'ok', lastUpdated: '2026-03-07' },

        // Piscinas (12 products)
        { id: 'P023', sku: 'PI-QUI-CLR3', name: 'Cloro Granulado 3" (cunete 50kg)', category: 'Piscinas', subcategory: 'Quimicos', quantity: 10, minStock: 5, location: 'C-01-01', warehouse: 'Zona C', unitPrice: 2400.00, status: 'ok', lastUpdated: '2026-03-12' },
        { id: 'P024', sku: 'PI-QUI-ALGI', name: 'Algicida Concentrado (galon)', category: 'Piscinas', subcategory: 'Quimicos', quantity: 15, minStock: 8, location: 'C-01-02', warehouse: 'Zona C', unitPrice: 320.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P025', sku: 'PI-QUI-PH+', name: 'Elevador de pH (5kg)', category: 'Piscinas', subcategory: 'Quimicos', quantity: 8, minStock: 5, location: 'C-01-03', warehouse: 'Zona C', unitPrice: 280.00, status: 'low', lastUpdated: '2026-03-10' },
        { id: 'P026', sku: 'PI-QUI-PH-', name: 'Reductor de pH (5kg)', category: 'Piscinas', subcategory: 'Quimicos', quantity: 7, minStock: 5, location: 'C-01-04', warehouse: 'Zona C', unitPrice: 260.00, status: 'low', lastUpdated: '2026-03-10' },
        { id: 'P027', sku: 'PI-BOM-1HP', name: 'Bomba para Piscina 1 HP', category: 'Piscinas', subcategory: 'Bombas', quantity: 6, minStock: 3, location: 'C-02-01', warehouse: 'Zona C', unitPrice: 4500.00, status: 'ok', lastUpdated: '2026-03-09' },
        { id: 'P028', sku: 'PI-BOM-15HP', name: 'Bomba para Piscina 1.5 HP', category: 'Piscinas', subcategory: 'Bombas', quantity: 4, minStock: 2, location: 'C-02-02', warehouse: 'Zona C', unitPrice: 5800.00, status: 'ok', lastUpdated: '2026-03-09' },
        { id: 'P029', sku: 'PI-FLT-AREN', name: 'Filtro de Arena 24"', category: 'Piscinas', subcategory: 'Filtros', quantity: 3, minStock: 2, location: 'C-03-01', warehouse: 'Zona C', unitPrice: 6200.00, status: 'low', lastUpdated: '2026-03-08' },
        { id: 'P030', sku: 'PI-FLT-CART', name: 'Filtro Cartucho Repuesto', category: 'Piscinas', subcategory: 'Filtros', quantity: 20, minStock: 10, location: 'C-03-02', warehouse: 'Zona C', unitPrice: 380.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P031', sku: 'PI-ACC-LIMP', name: 'Kit de Limpieza Manual Piscina', category: 'Piscinas', subcategory: 'Accesorios', quantity: 9, minStock: 4, location: 'C-04-01', warehouse: 'Zona C', unitPrice: 850.00, status: 'ok', lastUpdated: '2026-03-10' },
        { id: 'P032', sku: 'PI-ACC-ROBT', name: 'Robot Limpiafondos Automatico', category: 'Piscinas', subcategory: 'Accesorios', quantity: 2, minStock: 1, location: 'C-04-02', warehouse: 'Zona C', unitPrice: 15800.00, status: 'low', lastUpdated: '2026-03-07' },
        { id: 'P033', sku: 'PI-ILU-LED', name: 'Luz LED Sumergible RGB', category: 'Piscinas', subcategory: 'Accesorios', quantity: 15, minStock: 5, location: 'C-05-01', warehouse: 'Zona C', unitPrice: 1200.00, status: 'ok', lastUpdated: '2026-03-11' },
        { id: 'P034', sku: 'PI-CAL-SOL', name: 'Calentador Solar para Piscina', category: 'Piscinas', subcategory: 'Equipos', quantity: 1, minStock: 2, location: 'C-05-02', warehouse: 'Zona C', unitPrice: 12500.00, status: 'critical', lastUpdated: '2026-03-06' }
    ];

    const defaultSuppliers = [
        { id: 'S001', name: 'Refrigeracion del Norte S.A.', contact: 'Ing. Carlos Mendoza', phone: '+52 (81) 8345-6789', email: 'ventas@refrinorte.com', address: 'Av. Industrial #456, Monterrey, N.L.', categories: ['Aires Acondicionados'], rating: 5, status: 'active', notes: 'Proveedor principal de equipos AC e insumos de refrigeracion.' },
        { id: 'S002', name: 'QuimiPlagas Internacional', contact: 'Lic. Ana Rodriguez', phone: '+52 (55) 5512-3456', email: 'pedidos@quimiplagas.mx', address: 'Col. Napoles #789, CDMX', categories: ['Fumigacion'], rating: 4, status: 'active', notes: 'Distribuidor autorizado de insecticidas y rodenticidas.' },
        { id: 'S003', name: 'AquaPool Distribuciones', contact: 'Sr. Roberto Garza', phone: '+52 (81) 1234-5678', email: 'rgarza@aquapool.com.mx', address: 'Carr. Nacional Km 12, Santiago, N.L.', categories: ['Piscinas'], rating: 5, status: 'active', notes: 'Equipos y quimicos para piscinas. Entrega en 48 hrs.' },
        { id: 'S004', name: 'Seguridad Industrial MX', contact: 'Ing. Patricia Lopez', phone: '+52 (81) 8765-4321', email: 'contacto@seguridadmx.com', address: 'Parque Industrial #234, Apodaca, N.L.', categories: ['Fumigacion', 'Aires Acondicionados'], rating: 3, status: 'active', notes: 'Equipo de proteccion personal y herramientas.' },
        { id: 'S005', name: 'Cobreria y Metales del Pacifico', contact: 'Sr. Miguel Angel Torres', phone: '+52 (33) 3678-9012', email: 'ventas@cobrepac.com', address: 'Zona Industrial, Guadalajara, Jal.', categories: ['Aires Acondicionados'], rating: 4, status: 'active', notes: 'Tuberias de cobre y accesorios. Buen precio por volumen.' },
        { id: 'S006', name: 'Tecnologia en Bombas S.A.', contact: 'Ing. Fernando Ruiz', phone: '+52 (81) 2345-6780', email: 'fruiz@tecnobombas.com', address: 'Av. Ruiz Cortines #567, Monterrey, N.L.', categories: ['Piscinas'], rating: 4, status: 'active', notes: 'Bombas y sistemas de filtracion.' }
    ];

    const defaultMovements = [
        { id: 'M001', type: 'Entrada', product: 'P001', productName: 'Mini Split Inverter 12,000 BTU', quantity: 10, warehouse: 'Zona A', location: 'A-01-01', date: '2026-03-12', time: '09:15', user: 'admin', reference: 'OC-2026-015', notes: 'Recepcion orden de compra' },
        { id: 'M002', type: 'Salida', product: 'P005', productName: 'Refrigerante R-410A (11.3 kg)', quantity: 5, warehouse: 'Zona A', location: 'A-03-01', date: '2026-03-12', time: '10:30', user: 'admin', reference: 'VTA-4521', notes: 'Venta a cliente Servicios AC del Valle' },
        { id: 'M003', type: 'Entrada', product: 'P013', productName: 'Cipermetrina 25% EC (1L)', quantity: 20, warehouse: 'Zona B', location: 'B-01-01', date: '2026-03-12', time: '11:00', user: 'admin', reference: 'OC-2026-016', notes: 'Reposicion de inventario' },
        { id: 'M004', type: 'Salida', product: 'P023', productName: 'Cloro Granulado 3" (cunete 50kg)', quantity: 3, warehouse: 'Zona C', location: 'C-01-01', date: '2026-03-11', time: '14:20', user: 'admin', reference: 'VTA-4518', notes: 'Venta temporada' },
        { id: 'M005', type: 'Transferencia', product: 'P009', productName: 'Control Remoto Universal AC', quantity: 10, warehouse: 'Zona A', location: 'A-05-01', date: '2026-03-11', time: '15:45', user: 'admin', reference: 'TRF-089', notes: 'Transferencia a sucursal 2' },
        { id: 'M006', type: 'Entrada', product: 'P021', productName: 'Gel para Cucarachas (jeringa 35g)', quantity: 30, warehouse: 'Zona B', location: 'B-01-03', date: '2026-03-11', time: '09:00', user: 'admin', reference: 'OC-2026-014', notes: 'Ingreso por compra' },
        { id: 'M007', type: 'Salida', product: 'P027', productName: 'Bomba para Piscina 1 HP', quantity: 2, warehouse: 'Zona C', location: 'C-02-01', date: '2026-03-10', time: '12:30', user: 'admin', reference: 'VTA-4510', notes: 'Venta e instalacion' },
        { id: 'M008', type: 'Salida', product: 'P016', productName: 'Aspersora Manual 20L', quantity: 3, warehouse: 'Zona B', location: 'B-03-01', date: '2026-03-10', time: '13:00', user: 'admin', reference: 'VTA-4509', notes: 'Venta a empresa de fumigacion' },
        { id: 'M009', type: 'Entrada', product: 'P033', productName: 'Luz LED Sumergible RGB', quantity: 8, warehouse: 'Zona C', location: 'C-05-01', date: '2026-03-10', time: '10:15', user: 'admin', reference: 'OC-2026-013', notes: 'Mercancia recibida' },
        { id: 'M010', type: 'Salida', product: 'P002', productName: 'Mini Split Inverter 18,000 BTU', quantity: 4, warehouse: 'Zona A', location: 'A-01-02', date: '2026-03-09', time: '11:30', user: 'admin', reference: 'VTA-4505', notes: 'Proyecto residencial Las Lomas' },
        { id: 'M011', type: 'Transferencia', product: 'P018', productName: 'Mascarilla Respirador con Filtros', quantity: 5, warehouse: 'Zona B', location: 'B-04-01', date: '2026-03-09', time: '16:00', user: 'admin', reference: 'TRF-088', notes: 'Envio a equipo de campo' },
        { id: 'M012', type: 'Entrada', product: 'P030', productName: 'Filtro Cartucho Repuesto', quantity: 15, warehouse: 'Zona C', location: 'C-03-02', date: '2026-03-08', time: '09:30', user: 'admin', reference: 'OC-2026-012', notes: 'Pedido quincenal' },
        { id: 'M013', type: 'Salida', product: 'P007', productName: 'Tuberia de Cobre 1/4" (rollo 15m)', quantity: 5, warehouse: 'Zona A', location: 'A-04-01', date: '2026-03-08', time: '14:45', user: 'admin', reference: 'VTA-4498', notes: 'Venta instalador independiente' },
        { id: 'M014', type: 'Entrada', product: 'P019', productName: 'Guantes de Nitrilo (caja 100)', quantity: 10, warehouse: 'Zona B', location: 'B-04-02', date: '2026-03-07', time: '10:00', user: 'admin', reference: 'OC-2026-011', notes: 'Compra de insumos de seguridad' },
        { id: 'M015', type: 'Salida', product: 'P003', productName: 'Mini Split Inverter 24,000 BTU', quantity: 2, warehouse: 'Zona A', location: 'A-01-03', date: '2026-03-07', time: '15:20', user: 'admin', reference: 'VTA-4492', notes: 'Venta proyecto comercial' },
        { id: 'M016', type: 'Entrada', product: 'P028', productName: 'Bomba para Piscina 1.5 HP', quantity: 3, warehouse: 'Zona C', location: 'C-02-02', date: '2026-03-06', time: '08:45', user: 'admin', reference: 'OC-2026-010', notes: 'Recepcion de proveedor' },
        { id: 'M017', type: 'Salida', product: 'P014', productName: 'Fipronil 20% SC (250ml)', quantity: 8, warehouse: 'Zona B', location: 'B-01-02', date: '2026-03-06', time: '11:15', user: 'admin', reference: 'VTA-4488', notes: 'Venta a distribuidora regional' }
    ];

    const defaultOrders = [
        { id: 'OC-2026-017', supplier: 'S001', supplierName: 'Refrigeracion del Norte S.A.', date: '2026-03-12', expectedDate: '2026-03-18', status: 'Pendiente', items: [
            { productId: 'P006', name: 'Refrigerante R-22 (13.6 kg)', quantity: 15, unitPrice: 2200.00 },
            { productId: 'P011', name: 'Soporte Pared Condensadora', quantity: 10, unitPrice: 450.00 }
        ], total: 37500.00, notes: 'Urgente - stock critico en ambos productos' },
        { id: 'OC-2026-016', supplier: 'S002', supplierName: 'QuimiPlagas Internacional', date: '2026-03-11', expectedDate: '2026-03-16', status: 'En Proceso', items: [
            { productId: 'P015', name: 'Rodenticida en Bloques (caja 10kg)', quantity: 10, unitPrice: 890.00 },
            { productId: 'P013', name: 'Cipermetrina 25% EC (1L)', quantity: 20, unitPrice: 380.00 }
        ], total: 16500.00, notes: 'Pedido confirmado, en transito' },
        { id: 'OC-2026-015', supplier: 'S001', supplierName: 'Refrigeracion del Norte S.A.', date: '2026-03-10', expectedDate: '2026-03-14', status: 'En Proceso', items: [
            { productId: 'P001', name: 'Mini Split Inverter 12,000 BTU', quantity: 10, unitPrice: 8500.00 },
            { productId: 'P002', name: 'Mini Split Inverter 18,000 BTU', quantity: 5, unitPrice: 12500.00 }
        ], total: 147500.00, notes: 'Pedido de temporada alta' },
        { id: 'OC-2026-014', supplier: 'S003', supplierName: 'AquaPool Distribuciones', date: '2026-03-08', expectedDate: '2026-03-12', status: 'Completada', items: [
            { productId: 'P029', name: 'Filtro de Arena 24"', quantity: 3, unitPrice: 6200.00 },
            { productId: 'P034', name: 'Calentador Solar para Piscina', quantity: 2, unitPrice: 12500.00 }
        ], total: 43600.00, notes: 'Entrega parcial recibida' },
        { id: 'OC-2026-013', supplier: 'S003', supplierName: 'AquaPool Distribuciones', date: '2026-03-06', expectedDate: '2026-03-10', status: 'Completada', items: [
            { productId: 'P033', name: 'Luz LED Sumergible RGB', quantity: 8, unitPrice: 1200.00 },
            { productId: 'P030', name: 'Filtro Cartucho Repuesto', quantity: 15, unitPrice: 380.00 }
        ], total: 15300.00, notes: 'Recibido completo' },
        { id: 'OC-2026-010', supplier: 'S004', supplierName: 'Seguridad Industrial MX', date: '2026-03-01', expectedDate: '2026-03-05', status: 'Cancelada', items: [
            { productId: 'P018', name: 'Mascarilla Respirador con Filtros', quantity: 20, unitPrice: 650.00 }
        ], total: 13000.00, notes: 'Cancelada por falta de disponibilidad del proveedor' }
    ];

    const defaultWarehouses = [
        { id: 'W001', name: 'Zona A', fullName: 'Zona A - Aires Acondicionados', description: 'Almacenamiento de equipos de aire acondicionado, refrigerantes, partes y herramientas', category: 'Aires Acondicionados', capacity: 100, used: 68, locations: 24, color: '#1a3a8f', icon: '\u2744\ufe0f' },
        { id: 'W002', name: 'Zona B', fullName: 'Zona B - Fumigacion', description: 'Productos quimicos para fumigacion, equipos de aplicacion y equipo de seguridad', category: 'Fumigacion', capacity: 80, used: 55, locations: 16, color: '#2d8f1a', icon: '\ud83e\uddea' },
        { id: 'W003', name: 'Zona C', fullName: 'Zona C - Piscinas', description: 'Equipos, quimicos y accesorios para piscinas', category: 'Piscinas', capacity: 90, used: 45, locations: 20, color: '#0ea5e9', icon: '\ud83c\udfca' },
        { id: 'W004', name: 'Zona D', fullName: 'Zona D - General', description: 'Almacenamiento general, productos miscelaneos y area de recepcion', category: 'General', capacity: 60, used: 20, locations: 12, color: '#8b5cf6', icon: '\ud83d\udce6' }
    ];

    const defaultUsers = [
        { id: 'U001', username: 'admin', password: 'admin', name: 'Administrador General', role: 'Administrador', email: 'admin@gruporapid.com', status: 'active', lastLogin: '2026-03-13' },
        { id: 'U002', username: 'almacen1', password: 'almacen1', name: 'Juan Perez Lopez', role: 'Almacenista', email: 'jperez@gruporapid.com', status: 'active', lastLogin: '2026-03-12' },
        { id: 'U003', username: 'supervisor', password: 'super123', name: 'Maria Garcia Ruiz', role: 'Supervisor', email: 'mgarcia@gruporapid.com', status: 'active', lastLogin: '2026-03-11' }
    ];

    const defaultSettings = {
        companyName: 'Grupo Rapid',
        systemName: 'RapidWMS Pro',
        currency: 'USD',
        lowStockThreshold: 1.2,
        criticalStockThreshold: 1.0,
        dateFormat: 'DD/MM/YYYY',
        autoBackup: true,
        notifications: true
    };

    // ── Server Sync Functions ──────────────────────────────────

    const API_BASE = 'https://wms-grupo-rapid.onrender.com';

    function isServerMode() {
        return true; // Siempre sincronizar con el servidor
    }

    async function loadFromServer() {
        try {
            const res = await fetch(API_BASE + '/api/data');
            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            _version = data._version || 0;
            if (data.products && data.products.length > 0) {
                _data.products = data.products;
                _data.movements = data.movements || [];
                _data.orders = data.orders || [];
                _data.suppliers = data.suppliers || [];
                _data.warehouses = data.warehouses || [];
                _data.users = data.users || [];
                _data.settings = data.settings || defaultSettings;
                return true;
            }
            return false; // empty server, needs initialization
        } catch (e) {
            console.warn('No se pudo conectar al servidor, usando datos locales.', e.message);
            return false;
        }
    }

    function syncToServer() {
        if (!isServerMode() || _syncing) return;
        _syncing = true;
        const payload = {
            _version: _version,
            products: _data.products,
            movements: _data.movements,
            orders: _data.orders,
            suppliers: _data.suppliers,
            warehouses: _data.warehouses,
            users: _data.users,
            settings: _data.settings
        };
        fetch(API_BASE + '/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(res => { if (res.version) _version = res.version; })
        .catch(e => console.warn('Error sincronizando:', e.message))
        .finally(() => { _syncing = false; });
    }

    async function checkForUpdates() {
        if (!isServerMode() || _syncing) return;
        try {
            const res = await fetch(API_BASE + '/api/version');
            const info = await res.json();
            if (info.version > _version) {
                // Someone else made changes, reload data
                const loaded = await loadFromServer();
                if (loaded && typeof App !== 'undefined' && App.refreshCurrentModule) {
                    App.refreshCurrentModule();
                }
            }
        } catch (e) {
            // Server might be down, ignore
        }
    }

    // ── localStorage fallback ──────────────────────────────────

    const STORAGE_KEYS = {
        products: 'rwms_products',
        movements: 'rwms_movements',
        orders: 'rwms_orders',
        suppliers: 'rwms_suppliers',
        warehouses: 'rwms_warehouses',
        users: 'rwms_users',
        settings: 'rwms_settings',
        initialized: 'rwms_initialized'
    };

    function saveLocal(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    }

    function loadLocal(key) {
        try {
            const d = localStorage.getItem(key);
            return d ? JSON.parse(d) : null;
        } catch(e) { return null; }
    }

    function loadFromLocalStorage() {
        if (loadLocal(STORAGE_KEYS.initialized)) {
            _data.products = loadLocal(STORAGE_KEYS.products) || [];
            _data.movements = loadLocal(STORAGE_KEYS.movements) || [];
            _data.orders = loadLocal(STORAGE_KEYS.orders) || [];
            _data.suppliers = loadLocal(STORAGE_KEYS.suppliers) || [];
            _data.warehouses = loadLocal(STORAGE_KEYS.warehouses) || [];
            _data.users = loadLocal(STORAGE_KEYS.users) || [];
            _data.settings = loadLocal(STORAGE_KEYS.settings) || defaultSettings;
            return true;
        }
        return false;
    }

    function saveAllToLocalStorage() {
        saveLocal(STORAGE_KEYS.products, _data.products);
        saveLocal(STORAGE_KEYS.movements, _data.movements);
        saveLocal(STORAGE_KEYS.orders, _data.orders);
        saveLocal(STORAGE_KEYS.suppliers, _data.suppliers);
        saveLocal(STORAGE_KEYS.warehouses, _data.warehouses);
        saveLocal(STORAGE_KEYS.users, _data.users);
        saveLocal(STORAGE_KEYS.settings, _data.settings);
        saveLocal(STORAGE_KEYS.initialized, true);
    }

    function loadDefaults() {
        _data.products = JSON.parse(JSON.stringify(defaultProducts));
        _data.movements = JSON.parse(JSON.stringify(defaultMovements));
        _data.orders = JSON.parse(JSON.stringify(defaultOrders));
        _data.suppliers = JSON.parse(JSON.stringify(defaultSuppliers));
        _data.warehouses = JSON.parse(JSON.stringify(defaultWarehouses));
        _data.users = JSON.parse(JSON.stringify(defaultUsers));
        _data.settings = JSON.parse(JSON.stringify(defaultSettings));
    }

    // ── Persist helper (saves to both server and localStorage) ──

    function persist() {
        saveAllToLocalStorage();
        syncToServer();
    }

    // ── Helper Functions ─────────────────────────────────────

    function generateId(prefix) {
        return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function updateProductStatus(product) {
        const ratio = product.quantity / product.minStock;
        if (product.quantity === 0) product.status = 'critical';
        else if (ratio <= 1.0) product.status = 'critical';
        else if (ratio <= 1.5) product.status = 'low';
        else product.status = 'ok';
        return product;
    }

    // ── Public API ───────────────────────────────────────────

    return {
        async init() {
            if (_initialized) return;

            let loaded = false;

            // Try server first
            if (isServerMode()) {
                loaded = await loadFromServer();
            }

            // Fallback to localStorage
            if (!loaded) {
                loaded = loadFromLocalStorage();
            }

            // Load defaults if nothing found
            if (!loaded) {
                loadDefaults();
                persist();
            }

            _initialized = true;

            // Start polling for updates from other users (every 5 seconds)
            if (isServerMode()) {
                _pollInterval = setInterval(checkForUpdates, 5000);
            }
        },

        resetData() {
            Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
            loadDefaults();
            persist();
        },

        // Products
        getProducts() { return _data.products; },
        getProduct(id) { return _data.products.find(p => p.id === id); },
        saveProduct(product) {
            const idx = _data.products.findIndex(p => p.id === product.id);
            product = updateProductStatus(product);
            product.lastUpdated = new Date().toISOString().split('T')[0];
            if (idx >= 0) { _data.products[idx] = product; }
            else { product.id = product.id || generateId('P'); _data.products.push(product); }
            persist();
            return product;
        },
        deleteProduct(id) {
            _data.products = _data.products.filter(p => p.id !== id);
            persist();
        },

        // Movements
        // Helper: get items array (backward compatible with old single-product format)
        _getMovItems(mov) {
            if (mov.items) return mov.items;
            return [{ product: mov.product, productName: mov.productName, quantity: mov.quantity, warehouse: mov.warehouse, location: mov.location, notes: mov.notes || '' }];
        },
        _applyMovQuantities(mov, direction) {
            // direction: 1 to apply, -1 to revert
            const items = this._getMovItems(mov);
            for (const item of items) {
                const product = this.getProduct(item.product);
                if (product) {
                    if (mov.type === 'Entrada') product.quantity += direction * parseInt(item.quantity);
                    else if (mov.type === 'Salida') product.quantity -= direction * parseInt(item.quantity);
                    updateProductStatus(product);
                    product.lastUpdated = new Date().toISOString().split('T')[0];
                }
            }
        },
        getMovements() { return _data.movements; },
        saveMovement(mov) {
            mov.id = mov.id || generateId('M');
            mov.date = mov.date || new Date().toISOString().split('T')[0];
            mov.time = mov.time || new Date().toTimeString().slice(0, 5);
            mov.user = mov.user || 'admin';
            _data.movements.unshift(mov);
            this._applyMovQuantities(mov, 1);
            persist();
            return mov;
        },

        getMovement(id) { return _data.movements.find(m => m.id === id); },
        updateMovement(id, updates) {
            const idx = _data.movements.findIndex(m => m.id === id);
            if (idx < 0) return null;
            const oldMov = _data.movements[idx];
            this._applyMovQuantities(oldMov, -1);
            Object.assign(_data.movements[idx], updates);
            const newMov = _data.movements[idx];
            this._applyMovQuantities(newMov, 1);
            persist();
            return newMov;
        },

        deleteMovement(id) {
            const mov = _data.movements.find(m => m.id === id);
            if (!mov) return;
            this._applyMovQuantities(mov, -1);
            _data.movements = _data.movements.filter(m => m.id !== id);
            persist();
        },

        // Orders
        getOrders() { return _data.orders; },
        getOrder(id) { return _data.orders.find(o => o.id === id); },
        saveOrder(order) {
            const idx = _data.orders.findIndex(o => o.id === order.id);
            if (idx >= 0) { _data.orders[idx] = order; }
            else {
                const count = _data.orders.length + 1;
                order.id = order.id || 'OC-2026-' + String(count).padStart(3, '0');
                _data.orders.unshift(order);
            }
            persist();
            return order;
        },

        // Suppliers
        getSuppliers() { return _data.suppliers; },
        getSupplier(id) { return _data.suppliers.find(s => s.id === id); },
        saveSupplier(supplier) {
            const idx = _data.suppliers.findIndex(s => s.id === supplier.id);
            if (idx >= 0) { _data.suppliers[idx] = supplier; }
            else { supplier.id = supplier.id || generateId('S'); _data.suppliers.push(supplier); }
            persist();
            return supplier;
        },
        deleteSupplier(id) {
            _data.suppliers = _data.suppliers.filter(s => s.id !== id);
            persist();
        },

        // Warehouses
        getWarehouses() { return _data.warehouses; },
        saveWarehouse(wh) {
            const idx = _data.warehouses.findIndex(w => w.id === wh.id);
            if (idx >= 0) { _data.warehouses[idx] = wh; }
            else { wh.id = wh.id || generateId('W'); _data.warehouses.push(wh); }
            persist();
            return wh;
        },

        // Users
        getUsers() { return _data.users; },
        validateLogin(username, password) {
            return _data.users.find(u => u.username === username && u.password === password && u.status === 'active');
        },
        saveUser(user) {
            const idx = _data.users.findIndex(u => u.id === user.id);
            if (idx >= 0) { _data.users[idx] = user; }
            else { user.id = user.id || generateId('U'); _data.users.push(user); }
            persist();
            return user;
        },

        // Settings
        getSettings() { return _data.settings || defaultSettings; },
        saveSettings(settings) { _data.settings = settings; persist(); },

        // Dashboard helpers
        getDashboardStats() {
            const products = _data.products;
            const orders = _data.orders;
            const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
            const lowStock = products.filter(p => p.status === 'low' || p.status === 'critical');
            const pendingOrders = orders.filter(o => o.status === 'Pendiente' || o.status === 'En Proceso');
            const categoryTotals = {};
            products.forEach(p => {
                if (!categoryTotals[p.category]) categoryTotals[p.category] = { count: 0, value: 0, quantity: 0 };
                categoryTotals[p.category].count++;
                categoryTotals[p.category].value += p.quantity * p.unitPrice;
                categoryTotals[p.category].quantity += p.quantity;
            });
            return {
                totalProducts: products.length,
                totalQuantity: products.reduce((s, p) => s + p.quantity, 0),
                totalValue,
                lowStockCount: lowStock.length,
                lowStockItems: lowStock,
                pendingOrders: pendingOrders.length,
                categoryTotals
            };
        },

        // CSV Export
        exportProductsCSV() {
            const products = _data.products;
            const headers = ['SKU', 'Nombre', 'Categoria', 'Subcategoria', 'Cantidad', 'Stock Min.', 'Ubicacion', 'Almacen', 'Precio Unit.', 'Estado'];
            const rows = products.map(p => [p.sku, p.name, p.category, p.subcategory, p.quantity, p.minStock, p.location, p.warehouse, p.unitPrice.toFixed(2), p.status]);
            let csv = '\uFEFF' + headers.join(',') + '\n';
            rows.forEach(r => { csv += r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n'; });
            return csv;
        },

        generateId
    };
})();
