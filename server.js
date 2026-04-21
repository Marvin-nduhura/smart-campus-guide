/**
 * Smart Campus Guide – Shared Data Server
 * Enables multiple users on different devices to share data in real time.
 * Run: node server.js
 * Then open: http://YOUR_IP:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'db.json');

// ── Ensure data directory & file exist ────────────────────────────────────────
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    buildings: [], rooms: [], bookings: [], notifications: [], users: [], timetable: []
  }, null, 2));
}

function readDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return { buildings: [], rooms: [], bookings: [], notifications: [], users: [], timetable: [] }; }
}

function writeDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp'
};

// ── SSE clients for real-time push ────────────────────────────────────────────
const sseClients = new Set();

function pushToClients(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => { try { res.write(msg); } catch (_) { sseClients.delete(res); } });
}

// ── Request handler ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── SSE endpoint for real-time updates ──────────────────────────────────────
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── Ping ────────────────────────────────────────────────────────────────────
  if (pathname === '/api/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
    return;
  }

  // ── API routes ───────────────────────────────────────────────────────────────
  const apiMatch = pathname.match(/^\/api\/(\w+)\/?(\d+)?$/);
  if (apiMatch) {
    const store = apiMatch[1];
    const id = apiMatch[2] ? parseInt(apiMatch[2]) : null;
    const db = readDB();
    if (!db[store]) { res.writeHead(404); res.end('Not found'); return; }

    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (id !== null) {
        const item = db[store].find(i => i.id === id);
        res.end(JSON.stringify(item || null));
      } else {
        res.end(JSON.stringify(db[store]));
      }
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (req.method === 'POST') {
          // Upsert by id
          const idx = db[store].findIndex(i => i.id === data.id);
          if (idx >= 0) db[store][idx] = data;
          else db[store].push(data);
          writeDB(db);
          pushToClients('update', { store, data });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } else if (req.method === 'DELETE' && id !== null) {
          db[store] = db[store].filter(i => i.id !== id);
          writeDB(db);
          pushToClients('delete', { store, id });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(405); res.end('Method not allowed');
        }
      } catch (e) {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  // ── Static file serving ───────────────────────────────────────────────────
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
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

server.listen(PORT, '0.0.0.0', () => {
  const interfaces = require('os').networkInterfaces();
  const ips = Object.values(interfaces).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\n🏛  Smart Campus Guide Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Local:   http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`   Network: http://${ip}:${PORT}  ← share this with others`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   All users on the same network can now share data!\n');
});
