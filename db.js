const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'license.json');
let state = { keys: {}, devices: {} };
function load() {
  try { if (fs.existsSync(DB_FILE)) { state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); if (!state.keys) state.keys = {}; if (!state.devices) state.devices = {}; } } catch (e) { console.error('load', e); }
}
function save() { try { fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2)); } catch (e) { console.error('save', e); } }
load();
module.exports = {
  getKey: (k) => state.keys[k] || null,
  createKey: (k, g, m, e, n) => { state.keys[k] = { user_key: k, game: g || 'pubg', max_devices: m || 1, expires_at: e, blocked: 0, note: n || '', created_at: Math.floor(Date.now()/1000), last_used_at: null }; if (!state.devices[k]) state.devices[k] = []; save(); return state.keys[k]; },
  updateKey: (k, p) => { if (!state.keys[k]) return false; Object.assign(state.keys[k], p); save(); return true; },
  deleteKey: (k) => { delete state.keys[k]; delete state.devices[k]; save(); },
  listKeys: () => Object.values(state.keys).sort((a,b) => b.created_at - a.created_at),
  getDevices: (k) => state.devices[k] || [],
  addDevice: (k, s) => { if (!state.devices[k]) state.devices[k] = []; const now = Math.floor(Date.now()/1000); const ex = state.devices[k].find(d => d.serial === s); if (ex) ex.last_seen = now; else state.devices[k].push({ serial: s, first_seen: now, last_seen: now }); save(); },
  resetDevices: (k) => { if (!state.devices[k]) return 0; const n = state.devices[k].length; state.devices[k] = []; save(); return n; },
};
