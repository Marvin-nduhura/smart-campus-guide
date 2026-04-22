/**
 * Smart Campus Guide – Server
 * Database: Render PostgreSQL (primary) or JSON file (fallback)
 */
const http = require('http');
const path = require('path');
const fs   = require('fs');

const PORT         = process.env.PORT         || 3000;
const DATABASE_URL = process.env.DATABASE_URL || null;

const STORES = ['buildings','rooms','bookings','notifications','users','timetable'];

const MIME = {
  '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webp':'image/webp'
};

// ── SSE ───────────────────────────────────────────────────────────────────────
const sseClients = new Set();
function pushToClients(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(r => { try { r.write(msg); } catch(_) { sseClients.delete(r); } });
}

// ── PostgreSQL DB ─────────────────────────────────────────────────────────────
let pgPool = null;

async function initDB() {
  if (DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      // Test connection
      await pgPool.query('SELECT 1');
      // Create one table per store — each row is id + JSON blob
      for (const store of STORES) {
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS ${store} (
            id    INTEGER PRIMARY KEY,
            data  JSONB NOT NULL
          )
        `);
      }
      console.log('   ✅ Connected to PostgreSQL database');
      // Seed default admin if no users exist
      await seedDefaultUsers();
    } catch(e) {
      console.error('   ⚠️  PostgreSQL failed, using JSON file:', e.message);
      pgPool = null;
    }
  } else {
    console.log('   ℹ️  No DATABASE_URL, using local JSON file');
  }
}

// ── PG helpers ────────────────────────────────────────────────────────────────
async function pgGetAll(store) {
  const r = await pgPool.query(`SELECT data FROM ${store}`);
  return r.rows.map(row => row.data);
}

async function pgUpsert(store, item) {
  await pgPool.query(
    `INSERT INTO ${store}(id, data) VALUES($1,$2)
     ON CONFLICT(id) DO UPDATE SET data = EXCLUDED.data`,
    [item.id, JSON.stringify(item)]
  );
  return item;
}

async function pgDelete(store, id) {
  await pgPool.query(`DELETE FROM ${store} WHERE id=$1`, [Number(id)]);
}

async function seedDefaultUsers() {
  try {
    // Always ensure the default admin exists — safe to run on every startup
    const admin = {
      id: 1, username: 'admin', password: 'admin123', role: 'admin',
      name: 'System Administrator', email: 'admin@kab.ac.ug',
      avatar: null, permissions: ['all'], createdAt: new Date().toISOString()
    };
    // INSERT ... ON CONFLICT DO NOTHING — won't overwrite if admin already exists
    await pgPool.query(
      `INSERT INTO users(id, data) VALUES($1, $2) ON CONFLICT(id) DO NOTHING`,
      [admin.id, JSON.stringify(admin)]
    );
    console.log('   ✅ Default admin ensured (admin/admin123)');
  } catch(e) {
    console.error('   ⚠️  Seed failed:', e.message);
  }
}

// ── JSON file fallback ────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data', 'db.json');
function ensureFile() {
  if (!fs.existsSync(path.join(__dirname,'data'))) fs.mkdirSync(path.join(__dirname,'data'));
  if (!fs.existsSync(DATA_FILE))
    fs.writeFileSync(DATA_FILE, JSON.stringify(
      {buildings:[],rooms:[],bookings:[],notifications:[],users:[],timetable:[]}, null, 2));
}
function readFile() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }
  catch(_) { return {buildings:[],rooms:[],bookings:[],notifications:[],users:[],timetable:[]}; }
}
function writeFile(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d,null,2)); }

// ── Unified API ───────────────────────────────────────────────────────────────
async function getAll(store) {
  if (pgPool) return pgGetAll(store);
  return readFile()[store] || [];
}
async function upsert(store, item) {
  if (pgPool) return pgUpsert(store, item);
  const d = readFile();
  if (!d[store]) d[store] = [];
  const i = d[store].findIndex(x => x.id === item.id);
  if (i >= 0) d[store][i] = item; else d[store].push(item);
  writeFile(d); return item;
}
async function remove(store, id) {
  if (pgPool) return pgDelete(store, id);
  const d = readFile();
  if (!d[store]) return;
  d[store] = d[store].filter(x => x.id !== Number(id));
  writeFile(d);
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // SSE
  if (pathname === '/api/events') {
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Ping
  if (pathname === '/api/ping') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ ok: true, db: pgPool ? 'postgres' : 'file', time: new Date().toISOString() }));
    return;
  }

  // Direct login endpoint — avoids sending all users to client
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        const users = await getAll('users');
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
          const { password: _, ...safeUser } = user;
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify({ success: true, user: safeUser }));
        } else {
          res.writeHead(401, {'Content-Type':'application/json'});
          res.end(JSON.stringify({ success: false, message: 'Invalid username or password' }));
        }
      } catch(e) {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  // API routes
  const m = pathname.match(/^\/api\/(\w+)\/?(\d+)?$/);
  if (m) {
    const store = m[1], id = m[2] ? parseInt(m[2]) : null;
    if (!STORES.includes(store)) { res.writeHead(404); res.end('Not found'); return; }
    try {
      if (req.method === 'GET') {
        const items = await getAll(store);
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify(id !== null ? (items.find(i => i.id === id) || null) : items));
        return;
      }
      let body = '';
      req.on('data', c => body += c);
      req.on('end', async () => {
        try {
          if (req.method === 'POST') {
            const item = JSON.parse(body || '{}');
            const saved = await upsert(store, item);
            pushToClients('update', { store, data: saved });
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify(saved));
          } else if (req.method === 'DELETE' && id !== null) {
            await remove(store, id);
            pushToClients('delete', { store, id });
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify({ ok: true }));
          } else { res.writeHead(405); res.end('Method not allowed'); }
        } catch(e) { res.writeHead(400); res.end('Bad request'); }
      });
    } catch(e) { res.writeHead(500); res.end('Server error: ' + e.message); }
    return;
  }

  // Static files
  let fp = pathname === '/' ? '/index.html' : pathname;
  fp = path.join(__dirname, fp);
  fs.readFile(fp, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, {'Content-Type':'text/html'}); res.end(d2);
      }); return;
    }
    res.writeHead(200, {'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream'});
    res.end(data);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
ensureFile();
// Always ensure default admin exists in JSON file fallback
(function seedJsonFile() {
  const d = readFile();
  if (!d.users) d.users = [];
  const hasAdmin = d.users.some(u => u.username === 'admin');
  if (!hasAdmin) {
    d.users.unshift({
      id: 1, username: 'admin', password: 'admin123', role: 'admin',
      name: 'System Administrator', email: 'admin@kab.ac.ug',
      avatar: null, permissions: ['all'], createdAt: new Date().toISOString()
    });
    writeFile(d);
    console.log('   ✅ Default admin ensured in JSON file (admin/admin123)');
  }
})();
initDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    const ips = Object.values(require('os').networkInterfaces()).flat()
      .filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
    console.log('\n🏛  Smart Campus Guide Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Local:   http://localhost:${PORT}`);
    ips.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
});
