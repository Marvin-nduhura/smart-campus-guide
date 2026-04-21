/**
 * Smart Campus Guide – Server with MongoDB Atlas persistence
 * Run: node server.js
 */
const http = require('http');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || null;

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp'
};

// ── SSE clients ───────────────────────────────────────────────────────────────
const sseClients = new Set();
function pushToClients(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => { try { res.write(msg); } catch (_) { sseClients.delete(res); } });
}

// ── DB layer (MongoDB or fallback JSON file) ──────────────────────────────────
let dbLayer = null;

async function initDB() {
  if (MONGO_URI) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(MONGO_URI);
      await client.connect();
      const mdb = client.db('smart_campus');
      console.log('   ✅ Connected to MongoDB Atlas');
      dbLayer = {
        async getAll(store) {
          return mdb.collection(store).find({}).toArray();
        },
        async upsert(store, data) {
          await mdb.collection(store).replaceOne({ id: data.id }, data, { upsert: true });
          return data;
        },
        async remove(store, id) {
          await mdb.collection(store).deleteOne({ id: Number(id) });
        }
      };
    } catch (e) {
      console.error('   ⚠️  MongoDB connection failed, falling back to JSON file:', e.message);
      dbLayer = makeFileDB();
    }
  } else {
    console.log('   ℹ️  No MONGO_URI set, using local JSON file');
    dbLayer = makeFileDB();
  }
}

function makeFileDB() {
  const fs = require('fs');
  const DATA_FILE = path.join(__dirname, 'data', 'db.json');
  if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(
      { buildings: [], rooms: [], bookings: [], notifications: [], users: [], timetable: [] }, null, 2
    ));
  }
  function read() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch (_) { return { buildings: [], rooms: [], bookings: [], notifications: [], users: [], timetable: [] }; }
  }
  function write(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
  return {
    async getAll(store) { return read()[store] || []; },
    async upsert(store, data) {
      const db = read();
      if (!db[store]) db[store] = [];
      const idx = db[store].findIndex(i => i.id === data.id);
      if (idx >= 0) db[store][idx] = data; else db[store].push(data);
      write(db); return data;
    },
    async remove(store, id) {
      const db = read();
      if (!db[store]) return;
      db[store] = db[store].filter(i => i.id !== Number(id));
      write(db);
    }
  };
}

// ── Request handler ───────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // SSE
  if (pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Ping
  if (pathname === '/api/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
    return;
  }

  // API routes
  const apiMatch = pathname.match(/^\/api\/(\w+)\/?(\d+)?$/);
  if (apiMatch) {
    const store = apiMatch[1];
    const id = apiMatch[2] ? parseInt(apiMatch[2]) : null;
    const validStores = ['buildings', 'rooms', 'bookings', 'notifications', 'users', 'timetable'];
    if (!validStores.includes(store)) { res.writeHead(404); res.end('Not found'); return; }

    try {
      if (req.method === 'GET') {
        const items = await dbLayer.getAll(store);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (id !== null) {
          res.end(JSON.stringify(items.find(i => i.id === id) || null));
        } else {
          // Strip MongoDB _id field
          res.end(JSON.stringify(items.map(({ _id, ...rest }) => rest)));
        }
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          if (req.method === 'POST') {
            const saved = await dbLayer.upsert(store, data);
            pushToClients('update', { store, data: saved });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(saved));
          } else if (req.method === 'DELETE' && id !== null) {
            await dbLayer.remove(store, id);
            pushToClients('delete', { store, id });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } else {
            res.writeHead(405); res.end('Method not allowed');
          }
        } catch (e) { res.writeHead(400); res.end('Bad request'); }
      });
    } catch (e) {
      res.writeHead(500); res.end('Server error');
    }
    return;
  }

  // Static files
  const fs = require('fs');
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const ips = Object.values(os.networkInterfaces()).flat()
      .filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
    console.log('\n🏛  Smart Campus Guide Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Local:   http://localhost:${PORT}`);
    ips.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
});
