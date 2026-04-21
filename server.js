/**
 * Smart Campus Guide – Server
 * Database: Turso (libSQL) with JSON file fallback
 */
const http = require('http');
const path = require('path');
const fs   = require('fs');

const PORT       = process.env.PORT || 3000;
const TURSO_URL  = process.env.TURSO_URL  || null;
const TURSO_TOKEN= process.env.TURSO_TOKEN|| null;

const STORES = ['buildings','rooms','bookings','notifications','users','timetable'];

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'
};

// ── SSE ───────────────────────────────────────────────────────────────────────
const sseClients = new Set();
function pushToClients(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(r => { try { r.write(msg); } catch(_){ sseClients.delete(r); }});
}

// ── DB layer ──────────────────────────────────────────────────────────────────
let db = null;

async function initDB() {
  if (TURSO_URL && TURSO_TOKEN) {
    try {
      const { createClient } = require('@libsql/client');
      db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
      // Create tables for each store
      for (const store of STORES) {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ${store} (
            id    INTEGER PRIMARY KEY,
            data  TEXT NOT NULL
          )
        `);
      }
      console.log('   ✅ Connected to Turso database');
      return;
    } catch(e) {
      console.error('   ⚠️  Turso connection failed, using JSON file:', e.message);
      db = null;
    }
  } else {
    console.log('   ℹ️  No TURSO_URL/TOKEN set, using local JSON file');
  }
}

// ── Turso helpers ─────────────────────────────────────────────────────────────
async function tursoGetAll(store) {
  const rs = await db.execute(`SELECT data FROM ${store}`);
  return rs.rows.map(r => JSON.parse(r.data));
}

async function tursoUpsert(store, item) {
  const id = item.id;
  const data = JSON.stringify(item);
  await db.execute({
    sql: `INSERT INTO ${store}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`,
    args: [id, data]
  });
  return item;
}

async function tursoDelete(store, id) {
  await db.execute({ sql: `DELETE FROM ${store} WHERE id=?`, args: [Number(id)] });
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
  catch(_){ return {buildings:[],rooms:[],bookings:[],notifications:[],users:[],timetable:[]}; }
}
function writeFile(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d,null,2)); }

function fileGetAll(store)      { return readFile()[store] || []; }
function fileUpsert(store, item){ const d=readFile(); if(!d[store])d[store]=[]; const i=d[store].findIndex(x=>x.id===item.id); if(i>=0)d[store][i]=item; else d[store].push(item); writeFile(d); return item; }
function fileDelete(store, id)  { const d=readFile(); if(!d[store])return; d[store]=d[store].filter(x=>x.id!==Number(id)); writeFile(d); }

// ── Unified DB API ────────────────────────────────────────────────────────────
async function getAll(store)       { return db ? tursoGetAll(store)      : fileGetAll(store); }
async function upsert(store, item) { return db ? tursoUpsert(store,item) : fileUpsert(store,item); }
async function remove(store, id)   { return db ? tursoDelete(store,id)   : fileDelete(store,id); }

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost`);

  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS'){ res.writeHead(204); res.end(); return; }

  // SSE
  if (pathname==='/api/events') {
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close',()=>sseClients.delete(res));
    return;
  }

  // Ping
  if (pathname==='/api/ping') {
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({ok:true,db: db?'turso':'file', time:new Date().toISOString()}));
    return;
  }

  // API /api/:store or /api/:store/:id
  const m = pathname.match(/^\/api\/(\w+)\/?(\d+)?$/);
  if (m) {
    const store = m[1], id = m[2] ? parseInt(m[2]) : null;
    if (!STORES.includes(store)){ res.writeHead(404); res.end('Not found'); return; }
    try {
      if (req.method==='GET') {
        const items = await getAll(store);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify(id!==null ? (items.find(i=>i.id===id)||null) : items));
        return;
      }
      let body='';
      req.on('data',c=>body+=c);
      req.on('end', async()=>{
        try {
          if (req.method==='POST') {
            const item = JSON.parse(body||'{}');
            const saved = await upsert(store, item);
            pushToClients('update',{store,data:saved});
            res.writeHead(200,{'Content-Type':'application/json'});
            res.end(JSON.stringify(saved));
          } else if (req.method==='DELETE' && id!==null) {
            await remove(store, id);
            pushToClients('delete',{store,id});
            res.writeHead(200,{'Content-Type':'application/json'});
            res.end(JSON.stringify({ok:true}));
          } else { res.writeHead(405); res.end('Method not allowed'); }
        } catch(e){ res.writeHead(400); res.end('Bad request'); }
      });
    } catch(e){ res.writeHead(500); res.end('Server error: '+e.message); }
    return;
  }

  // Static files
  let fp = pathname==='/' ? '/index.html' : pathname;
  fp = path.join(__dirname, fp);
  fs.readFile(fp,(err,data)=>{
    if (err) {
      fs.readFile(path.join(__dirname,'index.html'),(e2,d2)=>{
        if(e2){ res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200,{'Content-Type':'text/html'}); res.end(d2);
      }); return;
    }
    res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});
    res.end(data);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
ensureFile();
initDB().then(()=>{
  server.listen(PORT,'0.0.0.0',()=>{
    const ips = Object.values(require('os').networkInterfaces()).flat()
      .filter(i=>i.family==='IPv4'&&!i.internal).map(i=>i.address);
    console.log('\n🏛  Smart Campus Guide Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Local:   http://localhost:${PORT}`);
    ips.forEach(ip=>console.log(`   Network: http://${ip}:${PORT}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
});
