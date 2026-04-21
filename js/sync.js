/**
 * Sync — multi-user data sharing, zero flicker
 * No localStorage noise, no recursive patches, no audio side-effects.
 */
const Sync = (() => {
  const API_BASE = window.location.origin + '/api';
  let channel = null;
  let pollTimer = null;
  let sseSource = null;
  let serverAvailable = false;
  let _patched = false;
  let _refreshTimer = null;

  // Coalesced refresh — max one repaint per 800ms, never during navigation
  function scheduleRefresh() {
    clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(() => {
      Router.silentRefresh();
      Notifications.updateNotifBadge();
    }, 800);
  }

  // ── BroadcastChannel ────────────────────────────────────────────────────────
  function initBroadcast() {
    if (!('BroadcastChannel' in window)) return;
    try {
      channel = new BroadcastChannel('ku_campus_v2');
      channel.onmessage = async ({ data: msg }) => {
        if (!msg || !msg.type) return;
        try {
          if (msg.type === 'upsert') await DB._put(msg.store, msg.data);
          else if (msg.type === 'delete') await DB._delete(msg.store, msg.id);
          scheduleRefresh();
        } catch (_) {}
      };
    } catch (_) {}
  }

  function broadcast(type, store, payload) {
    if (!channel) return;
    try { channel.postMessage({ type, store, ...payload }); } catch (_) {}
  }

  // ── Server ──────────────────────────────────────────────────────────────────
  async function ping() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const r = await fetch(API_BASE + '/ping', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      serverAvailable = r.ok;
    } catch (_) { serverAvailable = false; }
    return serverAvailable;
  }

  async function push(store, data) {
    if (!serverAvailable) return;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      await fetch(`${API_BASE}/${store}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: ctrl.signal
      });
      clearTimeout(t);
    } catch (_) {}
  }

  async function del(store, id) {
    if (!serverAvailable) return;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      await fetch(`${API_BASE}/${store}/${id}`, { method: 'DELETE', signal: ctrl.signal });
      clearTimeout(t);
    } catch (_) {}
  }

  async function pull(store) {
    if (!serverAvailable) return false;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(`${API_BASE}/${store}`, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return false;
      const items = await r.json();
      for (const item of items) await DB._put(store, item);
      return true;
    } catch (_) { return false; }
  }

  // ── Selective polling ───────────────────────────────────────────────────────
  const ROUTE_STORES = {
    dashboard:        ['buildings', 'rooms', 'bookings', 'notifications'],
    buildings:        ['buildings', 'rooms'],
    'building-detail':['buildings', 'rooms'],
    bookings:         ['bookings', 'rooms'],
    notifications:    ['notifications'],
    timetable:        ['timetable', 'rooms'],
    admin:            ['users', 'buildings', 'rooms', 'bookings'],
    search:           ['buildings', 'rooms'],
    map:              [],
    login:            [],
    profile:          []
  };

  async function pollNow() {
    const route = Router.getCurrentRoute() || '';
    const stores = ROUTE_STORES[route] || ['buildings', 'rooms'];
    let changed = false;
    for (const s of stores) { if (await pull(s)) changed = true; }
    if (changed) scheduleRefresh();
  }

  function startPolling(ms = 25000) {
    stopPolling();
    ping().then(ok => {
      if (!ok) return;
      pollNow();
      pollTimer = setInterval(pollNow, ms);
    });
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  // ── SSE ─────────────────────────────────────────────────────────────────────
  function connectSSE() {
    if (!serverAvailable) return;
    if (sseSource) { try { sseSource.close(); } catch (_) {} sseSource = null; }
    try {
      sseSource = new EventSource(API_BASE + '/events');
      sseSource.addEventListener('update', async ({ data }) => {
        try { const { store, data: d } = JSON.parse(data); await DB._put(store, d); scheduleRefresh(); } catch (_) {}
      });
      sseSource.addEventListener('delete', async ({ data }) => {
        try { const { store, id } = JSON.parse(data); await DB._delete(store, id); scheduleRefresh(); } catch (_) {}
      });
      sseSource.onerror = () => {
        try { sseSource.close(); } catch (_) {}
        sseSource = null;
        setTimeout(() => { if (serverAvailable) connectSSE(); }, 10000);
      };
    } catch (_) {}
  }

  // ── DB patch — store originals as _put/_delete/_add ─────────────────────────
  function patchDB() {
    if (_patched) return;
    _patched = true;

    // Raw methods — used internally, never broadcast
    DB._put    = (store, data) => DB.dbPut(store, data);
    DB._delete = (store, id)   => DB.dbDelete(store, id);
    DB._add    = (store, data) => DB.dbAdd(store, data);

    // We do NOT patch dbAdd/dbPut/dbDelete here to avoid recursion.
    // Instead, every write site calls Sync.afterWrite() explicitly.
  }

  // Call this after any local write to broadcast + push
  function afterWrite(store, data) {
    broadcast('upsert', store, { data });
    push(store, data);
  }

  function afterDelete(store, id) {
    broadcast('delete', store, { id });
    del(store, id);
  }

  function init() {
    patchDB();
    initBroadcast();
    startPolling();
    ping().then(ok => { if (ok) connectSSE(); });
  }

  return { init, afterWrite, afterDelete, scheduleRefresh, startPolling, stopPolling };
})();

window.Sync = Sync;
