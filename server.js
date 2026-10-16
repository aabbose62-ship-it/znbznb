require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'watan2026';
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
function log(...a){ console.log('['+new Date().toISOString()+']', ...a); }
app.post('/connect', (req, res) => {
  try {
    const game = (req.body.game||'').toString().trim();
    const key = (req.body.user_key||'').toString().trim();
    const serial = (req.body.serial||'').toString().trim();
    log('/connect key='+key);
    if (!key || !serial) return res.json({ status:false, reason:'USER OR GAME NOT REGISTERED' });
    const row = db.getKey(key);
    if (!row) return res.json({ status:false, reason:'USER OR GAME NOT REGISTERED' });
    if (game && row.game && row.game !== game) return res.json({ status:false, reason:'USER OR GAME NOT REGISTERED' });
    if (row.blocked === 1) return res.json({ status:false, reason:'USER BLOCKED' });
    if (row.expires_at && Date.now()/1000 > row.expires_at) return res.json({ status:false, reason:'EXPIRED KEY' });
    const devices = db.getDevices(key);
    const known = devices.find(d => d.serial === serial);
    if (!known && devices.length >= row.max_devices) return res.json({ status:false, reason:'MAX DEVICE REACHED' });
    db.addDevice(key, serial);
    db.updateKey(key, { last_used_at: Math.floor(Date.now()/1000) });
    return res.json({ status:true, data:{ key, game:row.game, expires_at:row.expires_at||null, max_devices:row.max_devices, devices_used: known ? devices.length : devices.length+1, note:row.note||'', server_time: Math.floor(Date.now()/1000) } });
  } catch (e) { log('ERR', e); return res.json({ status:false, reason:'nonet' }); }
});
app.get('/', (req, res) => res.json({ ok:true, service:'Watan License Server', time: Date.now() }));
function requireAdmin(req, res, next) {
  const p = req.headers['x-admin-password'] || req.query.pwd;
  if (p !== ADMIN_PASSWORD) return res.status(401).json({ ok:false, error:'unauthorized' });
  next();
}
app.post('/admin/create', requireAdmin, (req, res) => {
  try {
    const key = (req.body.key||'').toString().trim() || genKey();
    const game = (req.body.game||'pubg').toString();
    const md = parseInt(req.body.max_devices||'1',10);
    const days = parseInt(req.body.days||'30',10);
    const note = (req.body.note||'').toString();
    const exp = days>0 ? Math.floor(Date.now()/1000)+days*86400 : null;
    if (db.getKey(key)) return res.status(400).json({ ok:false, error:'exists' });
    db.createKey(key, game, md, exp, note);
    res.json({ ok:true, key, game, max_devices:md, expires_at:exp, note });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});
app.post('/admin/block', requireAdmin, (req, res) => { const k=(req.body.key||'').trim(); res.json({ ok: db.updateKey(k, { blocked:1 }), key:k }); });
app.post('/admin/unblock', requireAdmin, (req, res) => { const k=(req.body.key||'').trim(); res.json({ ok: db.updateKey(k, { blocked:0 }), key:k }); });
app.post('/admin/delete', requireAdmin, (req, res) => { const k=(req.body.key||'').trim(); const ex=!!db.getKey(k); db.deleteKey(k); res.json({ ok:ex, key:k }); });
app.post('/admin/reset-devices', requireAdmin, (req, res) => { const k=(req.body.key||'').trim(); res.json({ ok:true, key:k, removed: db.resetDevices(k) }); });
app.get('/admin/list', requireAdmin, (req, res) => { const rows=db.listKeys(); res.json({ ok:true, count:rows.length, keys: rows.map(r => ({ ...r, devices: db.getDevices(r.user_key) })) }); });
function genKey() { const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const p=[]; for(let i=0;i<4;i++){let s='';for(let j=0;j<4;j++) s+=c[Math.floor(Math.random()*c.length)]; p.push(s);} return p.join('-'); }
app.listen(PORT, '0.0.0.0', () => { log('✅ Watan License Server on port '+PORT); });
