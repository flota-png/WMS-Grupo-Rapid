/* ============================================================
   RapidWMS Pro - Servidor de Plataforma Web
   Grupo Rapid Warehouse Management System

   LOCAL:  npm install && npm start
   WEB:    Se despliega en Render.com con PostgreSQL gratuito
   ============================================================ */

const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    extensions: ['html']
}));

// ══════════════════════════════════════════════════════════════
// DATABASE LAYER - PostgreSQL (web) o JSON file (local)
// ══════════════════════════════════════════════════════════════

const DATABASE_URL = process.env.DATABASE_URL;
let db = null; // database adapter

// ── PostgreSQL Adapter (for web deployment) ────────────────
function createPgAdapter(connectionString) {
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    return {
        async initialize() {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS wms_data (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    data JSONB NOT NULL DEFAULT '{}',
                    version INTEGER NOT NULL DEFAULT 0,
                    last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CHECK (id = 1)
                )
            `);
            // Insert initial row if not exists
            await pool.query(`
                INSERT INTO wms_data (id, data, version)
                VALUES (1, '{}', 0)
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('  [DB] PostgreSQL conectado');
        },

        async read() {
            const res = await pool.query('SELECT data, version FROM wms_data WHERE id = 1');
            if (res.rows.length === 0) return null;
            const row = res.rows[0];
            const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            data._version = row.version;
            return data;
        },

        async write(data) {
            const version = (data._version || 0) + 1;
            const clean = { ...data };
            delete clean._version;
            delete clean._lastModified;
            await pool.query(
                'UPDATE wms_data SET data = $1, version = $2, last_modified = NOW() WHERE id = 1',
                [JSON.stringify(clean), version]
            );
            return version;
        },

        async getVersion() {
            const res = await pool.query('SELECT version, last_modified FROM wms_data WHERE id = 1');
            if (res.rows.length === 0) return { version: 0, lastModified: null };
            return { version: res.rows[0].version, lastModified: res.rows[0].last_modified };
        }
    };
}

// ── JSON File Adapter (for local development) ──────────────
function createFileAdapter() {
    const fs = require('fs');
    const DB_FILE = path.join(__dirname, 'db.json');

    return {
        async initialize() {
            if (!fs.existsSync(DB_FILE)) {
                const initial = {
                    _version: 1,
                    _lastModified: new Date().toISOString(),
                    products: [], movements: [], orders: [],
                    suppliers: [], warehouses: [], users: [], settings: {}
                };
                fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
                console.log('  [DB] Archivo db.json creado');
            }
            console.log('  [DB] Modo local (db.json)');
        },

        async read() {
            try {
                const raw = fs.readFileSync(DB_FILE, 'utf8');
                return JSON.parse(raw);
            } catch (e) {
                return null;
            }
        },

        async write(data) {
            data._lastModified = new Date().toISOString();
            data._version = (data._version || 0) + 1;
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
            return data._version;
        },

        async getVersion() {
            try {
                const raw = fs.readFileSync(DB_FILE, 'utf8');
                const data = JSON.parse(raw);
                return { version: data._version || 0, lastModified: data._lastModified || null };
            } catch (e) {
                return { version: 0, lastModified: null };
            }
        }
    };
}

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/data - Get entire database
app.get('/api/data', async (req, res) => {
    try {
        const data = await db.read();
        if (!data) return res.status(500).json({ error: 'Error leyendo la base de datos' });
        res.json(data);
    } catch (e) {
        console.error('GET /api/data error:', e.message);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// PUT /api/data - Replace entire database (full sync)
app.put('/api/data', async (req, res) => {
    try {
        const data = req.body;
        if (!data) return res.status(400).json({ error: 'Datos requeridos' });
        const version = await db.write(data);
        res.json({ ok: true, version });
    } catch (e) {
        console.error('PUT /api/data error:', e.message);
        res.status(500).json({ error: 'Error guardando datos' });
    }
});

// GET /api/version - Check current version (for polling)
app.get('/api/version', async (req, res) => {
    try {
        const info = await db.getVersion();
        res.json(info);
    } catch (e) {
        res.json({ version: 0, lastModified: null });
    }
});

// ── Resource-specific endpoints ────────────────────────────

const COLLECTIONS = ['products', 'movements', 'orders', 'suppliers', 'warehouses', 'users', 'settings'];

app.get('/api/:collection', async (req, res) => {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Coleccion no encontrada' });
    try {
        const data = await db.read();
        if (!data) return res.status(500).json({ error: 'Error leyendo la base de datos' });
        res.json(data[collection] || (collection === 'settings' ? {} : []));
    } catch (e) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.put('/api/:collection', async (req, res) => {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Coleccion no encontrada' });
    try {
        const data = await db.read();
        if (!data) return res.status(500).json({ error: 'Error leyendo la base de datos' });
        data[collection] = req.body;
        const version = await db.write(data);
        res.json({ ok: true, version });
    } catch (e) {
        res.status(500).json({ error: 'Error guardando datos' });
    }
});

// ── Health check (for Render.com) ──────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Catch-all: serve index.html ────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ══════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════

async function start() {
    // Select database adapter
    if (DATABASE_URL) {
        db = createPgAdapter(DATABASE_URL);
    } else {
        db = createFileAdapter();
    }

    await db.initialize();

    app.listen(PORT, '0.0.0.0', () => {
        const mode = DATABASE_URL ? 'WEB (PostgreSQL)' : 'LOCAL (db.json)';
        console.log('');
        console.log('  ╔═══════════════════════════════════════════════════╗');
        console.log('  ║                                                   ║');
        console.log('  ║        RapidWMS Pro - Plataforma Web              ║');
        console.log('  ║        Grupo Rapid - Sistema de Almacen           ║');
        console.log('  ║                                                   ║');
        console.log('  ╚═══════════════════════════════════════════════════╝');
        console.log('');
        console.log(`  ► Modo:     ${mode}`);
        console.log(`  ► Puerto:   ${PORT}`);

        if (!DATABASE_URL) {
            console.log(`  ► Local:    http://localhost:${PORT}`);
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        console.log(`  ► Red:      http://${iface.address}:${PORT}`);
                    }
                }
            }
        } else {
            console.log('  ► URL:      Asignada por el hosting');
        }

        console.log('');
    });
}

start().catch(e => {
    console.error('Error iniciando servidor:', e);
    process.exit(1);
});
