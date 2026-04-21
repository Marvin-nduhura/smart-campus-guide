// IndexedDB wrapper for offline-first storage
const DB_NAME = 'KUCampusDB';
const DB_VERSION = 1;

const STORES = {
  users: 'users',
  buildings: 'buildings',
  rooms: 'rooms',
  bookings: 'bookings',
  notifications: 'notifications',
  timetable: 'timetable'
};

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORES.users)) {
        const us = d.createObjectStore(STORES.users, { keyPath: 'id', autoIncrement: true });
        us.createIndex('username', 'username', { unique: true });
        us.createIndex('role', 'role', { unique: false });
      }
      if (!d.objectStoreNames.contains(STORES.buildings)) {
        const bs = d.createObjectStore(STORES.buildings, { keyPath: 'id', autoIncrement: true });
        bs.createIndex('name', 'name', { unique: false });
      }
      if (!d.objectStoreNames.contains(STORES.rooms)) {
        const rs = d.createObjectStore(STORES.rooms, { keyPath: 'id', autoIncrement: true });
        rs.createIndex('buildingId', 'buildingId', { unique: false });
        rs.createIndex('name', 'name', { unique: false });
      }
      if (!d.objectStoreNames.contains(STORES.bookings)) {
        const bks = d.createObjectStore(STORES.bookings, { keyPath: 'id', autoIncrement: true });
        bks.createIndex('roomId', 'roomId', { unique: false });
        bks.createIndex('userId', 'userId', { unique: false });
        bks.createIndex('date', 'date', { unique: false });
      }
      if (!d.objectStoreNames.contains(STORES.notifications)) {
        const ns = d.createObjectStore(STORES.notifications, { keyPath: 'id', autoIncrement: true });
        ns.createIndex('targetRole', 'targetRole', { unique: false });
        ns.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!d.objectStoreNames.contains(STORES.timetable)) {
        const ts = d.createObjectStore(STORES.timetable, { keyPath: 'id', autoIncrement: true });
        ts.createIndex('userId', 'userId', { unique: false });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

async function dbAdd(store, data) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, data) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetByIndex(store, indexName, value) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const idx = tx.objectStore(store).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function seedDefaultData() {
  // If server is reachable, it handles seeding — skip local seed
  try {
    const r = await fetch('/api/ping', { cache: 'no-store' });
    if (r.ok) return; // server is up, it seeds its own data
  } catch(_) {}
  // Offline fallback — seed local IndexedDB only if empty
  const users = await dbGetAll(STORES.users);
  if (users.length === 0) {
    await dbAdd(STORES.users, {
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: 'System Administrator',
      email: 'admin@kab.ac.ug',
      avatar: null,
      permissions: ['all'],
      createdAt: new Date().toISOString()
    });
    await dbAdd(STORES.users, {
      username: 'student1',
      password: 'student123',
      role: 'student',
      name: 'John Mugisha',
      email: 'john@kab.ac.ug',
      avatar: null,
      permissions: [],
      createdAt: new Date().toISOString()
    });
    // Seed sample buildings
    const b1 = await dbAdd(STORES.buildings, {
      name: 'Main Administration Block',
      description: 'The central administrative hub of Kabale University housing the Vice Chancellor\'s office, registrar, and key administrative departments.',
      lat: -1.2490,
      lng: 29.9850,
      floors: 3,
      image: null,
      category: 'Administration',
      isCampus: true,
      createdAt: new Date().toISOString()
    });
    const b2 = await dbAdd(STORES.buildings, {
      name: 'Faculty of Science & Technology',
      description: 'Houses computer science, mathematics, physics and engineering departments with modern labs.',
      lat: -1.2495,
      lng: 29.9860,
      floors: 4,
      image: null,
      category: 'Academic',
      isCampus: true,
      createdAt: new Date().toISOString()
    });
    const b3 = await dbAdd(STORES.buildings, {
      name: 'University Library',
      description: 'The main library with over 50,000 volumes, digital resources, and quiet study spaces.',
      lat: -1.2485,
      lng: 29.9845,
      floors: 2,
      image: null,
      category: 'Library',
      isCampus: true,
      createdAt: new Date().toISOString()
    });
    const b4 = await dbAdd(STORES.buildings, {
      name: 'Student Center',
      description: 'Student union, cafeteria, recreation rooms and student services all under one roof.',
      lat: -1.2500,
      lng: 29.9855,
      floors: 2,
      image: null,
      category: 'Student Services',
      isCampus: true,
      createdAt: new Date().toISOString()
    });
    // Seed rooms
    await dbAdd(STORES.rooms, { buildingId: b2, name: 'Computer Lab 1', floor: 1, description: 'Main computer lab with 40 workstations', lat: -1.2495, lng: 29.9860, image: null, capacity: 40, isCampus: true, createdAt: new Date().toISOString() });
    await dbAdd(STORES.rooms, { buildingId: b2, name: 'Lecture Hall A', floor: 2, description: 'Large lecture hall seating 200 students', lat: -1.2496, lng: 29.9861, image: null, capacity: 200, isCampus: true, createdAt: new Date().toISOString() });
    await dbAdd(STORES.rooms, { buildingId: b2, name: 'Physics Lab', floor: 3, description: 'Fully equipped physics laboratory', lat: -1.2494, lng: 29.9859, image: null, capacity: 30, isCampus: true, createdAt: new Date().toISOString() });
    await dbAdd(STORES.rooms, { buildingId: b1, name: 'VC Office', floor: 3, description: 'Vice Chancellor\'s office', lat: -1.2490, lng: 29.9850, image: null, capacity: 10, isCampus: true, createdAt: new Date().toISOString() });
    await dbAdd(STORES.rooms, { buildingId: b3, name: 'Reading Room', floor: 1, description: 'Quiet reading and study area', lat: -1.2485, lng: 29.9845, image: null, capacity: 80, isCampus: true, createdAt: new Date().toISOString() });
    // Seed notification
    await dbAdd(STORES.notifications, {
      title: 'Welcome to Smart Campus Guide',
      message: 'Welcome to Kabale University Smart Campus Guide. Navigate the campus with ease!',
      targetRole: 'all',
      senderId: 1,
      senderName: 'System Administrator',
      createdAt: new Date().toISOString(),
      read: []
    });
  }
}

window.DB = {
  openDB, dbAdd, dbPut, dbGet, dbGetAll, dbDelete, dbGetByIndex, STORES, seedDefaultData,
  // Direct IDB methods used by Sync (never patched, never broadcast)
  _put:    dbPut,
  _delete: dbDelete,
  _add:    dbAdd,
  // Server-first getAll — used by all pages after Sync is initialized
  serverGetAll: async (store) => {
    if (window.Sync && Sync.getAll) return Sync.getAll(store);
    return dbGetAll(store);
  }
};
