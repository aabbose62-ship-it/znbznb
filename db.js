const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'license.json');

let state = { keys: {}, devices: {} };

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      state = JSON.parse(raw);
      if (!state.keys) state.keys = {};
      if (!state.devices) state.devices = {};
    }
  } catch (e) { console.error('DB load error:', e); }
}

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (e) { console.error('DB save error:', e); }
}

load();

module.exports = {
  // ─── المفاتيح ───
  getKey(userKey) {
    return state.keys[userKey] || null;
  },
  createKey(userKey, game, maxDevices, expiresAt, note) {
    state.keys[userKey] = {
      user_key: userKey,
      game: game || 'pubg',
      max_devices: maxDevices || 1,
      expires_at: expiresAt,
      blocked: 0,
      note: note || '',
      created_at: Math.floor(Date.now() / 1000),
      last_used_at: null,
    };
    if (!state.devices[userKey]) state.devices[userKey] = [];
    save();
    return state.keys[userKey];
  },
  updateKey(userKey, patch) {
    if (!state.keys[userKey]) return false;
    Object.assign(state.keys[userKey], patch);
    save();
    return true;
  },
  deleteKey(userKey) {
    delete state.keys[userKey];
    delete state.devices[userKey];
    save();
  },
  listKeys() {
    return Object.values(state.keys).sort((a,b) => b.created_at - a.created_at);
  },

  // ─── الأجهزة ───
  getDevices(userKey) {
    return state.devices[userKey] || [];
  },
  addDevice(userKey, serial) {
    if (!state.devices[userKey]) state.devices[userKey] = [];
    const now = Math.floor(Date.now() / 1000);
    const existing = state.devices[userKey].find(d => d.serial === serial);
    if (existing) {
      existing.last_seen = now;
    } else {
      state.devices[userKey].push({ serial, first_seen: now, last_seen: now });
    }
    save();
  },
  removeDevice(userKey, serial) {
    if (!state.devices[userKey]) return 0;
    const before = state.devices[userKey].length;
    state.devices[userKey] = state.devices[userKey].filter(d => d.serial !== serial);
    save();
    return before - state.devices[userKey].length;
  },
  resetDevices(userKey) {
    if (!state.devices[userKey]) return 0;
    const n = state.devices[userKey].length;
    state.devices[userKey] = [];
    save();
    return n;
  },
};
