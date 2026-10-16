require('dotenv').config();
const db = require('./db');
const [,, cmd, ...args] = process.argv;
if (cmd === 'create') {
  const k = args[0] === 'null' ? null : args[0];
  const d = parseInt(args[1]||'30',10), m = parseInt(args[2]||'1',10);
  const note = args.slice(3).join(' ')||'';
  const key = k || genKey();
  const exp = d>0 ? Math.floor(Date.now()/1000)+d*86400 : null;
  if (db.getKey(key)) return console.log('❌ موجود مسبقاً');
  db.createKey(key, 'pubg', m, exp, note);
  console.log('✅ Key: '+key+' | أيام: '+d+' | أجهزة: '+m);
} else if (cmd === 'list') {
  const rows = db.listKeys();
  if (!rows.length) return console.log('لا مفاتيح.');
  for (const r of rows) { const e = r.expires_at ? new Date(r.expires_at*1000).toISOString().slice(0,10) : 'دائم'; console.log(r.user_key+' | '+(r.blocked?'🚫':'✅')+' | '+e+' | '+r.max_devices+' | '+(r.note||'')); }
} else if (cmd === 'block') console.log(db.updateKey(args[0], { blocked:1 }) ? '🚫 حُظر' : '❌ غير موجود');
else if (cmd === 'unblock') console.log(db.updateKey(args[0], { blocked:0 }) ? '✅ فُك' : '❌ غير موجود');
else if (cmd === 'delete') { const ex=!!db.getKey(args[0]); db.deleteKey(args[0]); console.log(ex?'🗑️ حُذف':'❌ غير موجود'); }
else if (cmd === 'reset-devices') console.log('🔄 حُذف '+db.resetDevices(args[0])+' جهاز');
else console.log('create <key|null> <days> <max> [note] | list | block <key> | unblock <key> | delete <key> | reset-devices <key>');
function genKey() { const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const p=[]; for(let i=0;i<4;i++){let s='';for(let j=0;j<4;j++) s+=c[Math.floor(Math.random()*c.length)]; p.push(s);} return p.join('-'); }
