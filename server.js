// שרת Node פשוט — הפעלה: node server.js
// פותח http://localhost:3000  (האתר)
// וגם   http://localhost:3000/admin  (פניות שהתקבלו)
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const LEADS = path.join(__dirname, 'leads.csv');

if (!fs.existsSync(LEADS)) {
  fs.writeFileSync(LEADS, '\uFEFFtimestamp,name,phone,message,ip\n', 'utf8');
}

const esc = s => `"${String(s ?? '').replace(/"/g,'""').replace(/\r?\n/g,' ')}"`;
const html = s => String(s ?? '').replace(/[&<>]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));

const server = http.createServer((req, res) => {
  // GET static files
  if (req.method === 'GET' && !req.url.startsWith('/admin') && !req.url.startsWith('/lead')) {
    const urlPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(__dirname, decodeURIComponent(urlPath));
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html':'text/html; charset=utf-8',
      '.css':'text/css',
      '.js':'application/javascript',
      '.png':'image/png',
      '.jpg':'image/jpeg',
      '.jpeg':'image/jpeg',
      '.gif':'image/gif',
      '.webp':'image/webp',
      '.svg':'image/svg+xml'
    }[ext] || 'application/octet-stream';
    return fs.readFile(filePath, (e, d) => {
      if (e) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, {'Content-Type': mime});
      res.end(d);
    });
  }

  // POST /lead
  if (req.method === 'POST' && req.url === '/lead') {
    let body='';
    req.on('data',c => { body+=c; if (body.length>10000) req.destroy(); });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const name=(j.name||'').trim(), phone=(j.phone||'').trim(), msg=(j.message||'').trim();
        if (!name || !phone || !msg) { res.writeHead(400); return res.end('bad'); }
        const ip = req.socket.remoteAddress || '';
        const row = [new Date().toISOString(), name, phone, msg, ip].map(esc).join(',') + '\n';
        fs.appendFile(LEADS, row, () => {});
        console.log('LEAD:', name, phone);
        res.writeHead(200,{'Content-Type':'application/json'}); res.end('{"ok":true}');
      } catch { res.writeHead(400); res.end('bad'); }
    });
    return;
  }

  // GET /admin — צפייה בפניות
  if (req.method === 'GET' && req.url.startsWith('/admin')) {
    const data = fs.readFileSync(LEADS,'utf8').replace(/^\uFEFF/,'');
    const lines = data.trim().split('\n').slice(1);
    const rows = lines.map(line => {
      const m = line.match(/"((?:[^"]|"")*)"/g) || [];
      return m.map(s => s.slice(1,-1).replace(/""/g,'"'));
    }).reverse();
    const trs = rows.map(r =>
      `<tr><td>${html(r[0])}</td><td>${html(r[1])}</td><td><a href="tel:${html(r[2])}">${html(r[2])}</a></td><td>${html(r[3])}</td><td>${html(r[4])}</td></tr>`
    ).join('');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    return res.end(`<!doctype html><html lang=he dir=rtl><meta charset=utf-8>
<title>פניות שהתקבלו</title>
<style>body{font-family:Segoe UI,Arial;margin:24px;background:#f6f7fb}
h1{margin:0 0 16px}table{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.06)}
th,td{padding:10px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;font-size:14px}
th{background:#0e1320;color:#c9a14a}tr:hover{background:#fafaff}.empty{padding:30px;text-align:center;color:#888}</style>
<h1>פניות שהתקבלו (${rows.length})</h1>
<p style="color:#666">קובץ גולמי: <code>leads.csv</code> בתיקיית הפרויקט.</p>
${rows.length ? `<table><tr><th>תאריך</th><th>שם</th><th>טלפון</th><th>הודעה</th><th>IP</th></tr>${trs}</table>` : '<div class=empty>אין פניות עדיין</div>'}`);
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, () => {
  console.log(`\n  🚀 רץ על http://localhost:${PORT}`);
  console.log(`  📋 פניות:   http://localhost:${PORT}/admin`);
  console.log(`  📁 קובץ:    ${LEADS}\n`);
});
