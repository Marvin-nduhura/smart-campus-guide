/**
 * Sync — server-first data layer
 * All reads come from the server when online.
 * Local IndexedDB is only a fallback for offline use.
 */
const Sync = (() => {
  const API_BASE = window.location.origin + '/api';
  let sseSource = null;
  let pollTimer = null;
  let serverAvailable = false;
  let _refreshTimer = null;
  let _channel = null;

  // ── Coalesced UI refresh ────────────────────────────────────────────────────
  function scheduleRefresh() {
    clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(() => {
      Router.silentRefresh();
      Notifications.updateNotifBadge();
    }, 400);
  }

  // ── Ping ────────────────────────────────────────────────────────────────────
  async function ping() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(API_BASE + '/ping', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      serverAvailable = r.ok;
    } catch (_) { serverAvailable = false; }
    return serverAvailable;
  }

  // ── Pull full store from server → replace local DB ──────────────────────────
  async function pullStore(store) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(`${API_BASE}/${store}`, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return false;
      const items = await r.json();
      // Replace entire local store with server data
      const existing = await DB.dbGetAll(store);
      // Delete items no longer on server
      const serverIds = new Set(items.map(i => i.id));
      for (const item of existing) {
        if (!serverIds.has(item.id)) await DB.dbDelete(store, item.id);
      }
      // Upsert all server items
      for (const item of items) await DB.dbPut(store, item);
      return true;
    } catch (_) { return false; }
  }

  // ── Push a write to server (with retry) — returns server item with canonical ID
  async function push(store, data) {
    for (let i = 0; i < 3; i++) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(`${API_BASE}/${store}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: ctrl.signal
        });
        clearTimeout(t);
        if (r.ok) {
          serverAvailable = true;
          const saved = await r.json();
          // If server assigned a different ID, fix local IndexedDB
          if (saved && saved.id && saved.id !== data.id) {
            await DB._delete(store, data.id);
            await DB._put(store, saved);
          }
          return saved;
        }
      } catch (_) {}
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
    serverAvailable = false;
    return null;
  }

  // ── Push a delete to server ──────────────────────────────────────────────────
  async function del(store, id) {
    for (let i = 0; i < 3; i++) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(`${API_BASE}/${store}/${id}`, { method: 'DELETE', signal: ctrl.signal });
        clearTimeout(t);
        if (r.ok) return true;
      } catch (_) {}
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
    return false;
  }

  // ── Server-first read: fetch from server, update local, return data ──────────
  async function getAll(store) {
    if (serverAvailable) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(`${API_BASE}/${store}`, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        if (r.ok) {
          const items = await r.json();
          // Sync to local DB in background
          const existing = await DB.dbGetAll(store);
          const serverIds = new Set(items.map(i => i.id));
          for (const item of existing) {
            if (!serverIds.has(item.id)) await DB.dbDelete(store, item.id);
          }
          for (const item of items) await DB.dbPut(store, item);
          return items;
        }
      } catch (_) {}
    }
    // Fallback to local
    return DB.dbGetAll(store);
  }

  // ── Called after every local write — returns server item (with canonical ID)
  async function afterWrite(store, data) {
    if (_channel) {
      try { _channel.postMessage({ type: 'upsert', store, data }); } catch (_) {}
    }
    const saved = await push(store, data);
    return saved || data;
  }

  // ── Called after every local delete ─────────────────────────────────────────
  function afterDelete(store, id) {
    if (_channel) {
      try { _channel.postMessage({ type: 'delete', store, id }); } catch (_) {}
    }
    del(store, id);
  }

  // ── SSE for real-time push from server ───────────────────────────────────────
  function connectSSE() {
    if (sseSource) { try { sseSource.close(); } catch (_) {} sseSource = null; }
    try {
      sseSource = new EventSource(API_BASE + '/events');
      sseSource.addEventListener('update', async ({ data }) => {
        try {
          const { store, data: d } = JSON.parse(data);
          await DB.dbPut(store, d);
          scheduleRefresh();
        } catch (_) {}
      });
      sseSource.addEventListener('delete', async ({ data }) => {
        try {
          const { store, id } = JSON.parse(data);
          await DB.dbDelete(store, id);
          scheduleRefresh();
        } catch (_) {}
      });
      sseSource.onerror = () => {
        try { sseSource.close(); } catch (_) {}
        sseSource = null;
        // Reconnect after 8s
        setTimeout(() => { if (serverAvailable) connectSSE(); }, 8000);
      };
    } catch (_) {}
  }

  // ── Polling fallback (every 10s) ─────────────────────────────────────────────
  const ROUTE_STORES = {
    dashboard:         ['buildings', 'rooms', 'bookings', 'notifications'],
    buildings:         ['buildings', 'rooms'],
    'building-detail': ['buildings', 'rooms'],
    bookings:          ['bookings', 'rooms'],
    notifications:     ['notifications'],
    timetable:         ['timetable', 'rooms'],
    admin:             ['users', 'buildings', 'rooms', 'bookings'],
    search:            ['buildings', 'rooms'],
    map:               ['buildings'],
    login:             [],
    profile:           ['users']
  };

  async function pollNow() {
    if (!serverAvailable) { await ping(); if (!serverAvailable) return; }
    const route = Router.getCurrentRoute() || '';
    const stores = ROUTE_STORES[route] || [];
    let changed = false;
    for (const s of stores) { if (await pullStore(s)) changed = true; }
    if (changed) scheduleRefresh();
  }

  // ── BroadcastChannel (same-device multi-tab) ─────────────────────────────────
  function initBroadcast() {
    if (!('BroadcastChannel' in window)) return;
    try {
      _channel = new BroadcastChannel('ku_campus_v3');
      _channel.onmessage = async ({ data: msg }) => {
        if (!msg) return;
        try {
          if (msg.type === 'upsert') { await DB.dbPut(msg.store, msg.data); scheduleRefresh(); }
          else if (msg.type === 'delete') { await DB.dbDelete(msg.store, msg.id); scheduleRefresh(); }
        } catch (_) {}
      };
    } catch (_) {}
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    initBroadcast();
    const ok = await ping();
    if (ok) {
      // Pull all stores on startup so every device starts fresh from server
      const allStores = ['buildings', 'rooms', 'bookings', 'notifications', 'timetable', 'users'];
      for (const s of allStores) await pullStore(s);
      scheduleRefresh();
      connectSSE();
    }
    // Poll every 10 seconds as fallback
    pollTimer = setInterval(pollNow, 10000);
  }

  return { init, afterWrite, afterDelete, getAll, scheduleRefresh };
})();

window.Sync = Sync;
