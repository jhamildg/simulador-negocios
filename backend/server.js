// Simulador de Negocios: servidor (API + autenticación) que además sirve el frontend estático.
// Sin dependencias externas salvo `pg` cuando se usa PostgreSQL: solo módulos estándar de Node.
require('./env');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const { connect } = require('./db');

const PROD = process.env.NODE_ENV === 'production';
const SESSION_DAYS = Math.max(1, +process.env.SESSION_DAYS || 30);
const COOKIE = 'sid';
const FRONTEND = path.join(__dirname, '..', 'frontend');
const BUSINESSES = ['delivery', 'ecommerce', 'comida'];
const STATUSES = ['en_curso', 'completada', 'abandonada'];
const ACHIEVEMENTS = ['millon', 'finanzas', 'crecer', 'innovar', 'mundo', 'sobrevivir', 'sinDeuda', 'fieles', 'lider'];
const MAX_BODY = 400 * 1024;

// --- contraseñas: scrypt (función estándar de Node para derivar claves de contraseñas), sal aleatoria por usuario ---
const scrypt = promisify(crypto.scrypt);
const KDF = { N: 32768, r: 8, p: 1, len: 32, maxmem: 64 * 1024 * 1024 };
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KDF.len, { N: KDF.N, r: KDF.r, p: KDF.p, maxmem: KDF.maxmem });
  return ['scrypt', KDF.N, KDF.r, KDF.p, salt.toString('base64'), key.toString('base64')].join('$');
}
async function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, key] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(key, 'base64');
  const got = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64'), want.length, { N: +N, r: +r, p: +p, maxmem: KDF.maxmem });
  return crypto.timingSafeEqual(got, want);
}

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : null);
const parseJSON = (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

// --- límite de intentos por IP, en memoria ---
function limiter(windowMs, max) {
  const hits = new Map();
  setInterval(() => { const t = Date.now(); for (const [k, v] of hits) if (v.reset < t) hits.delete(k); }, windowMs).unref();
  return ip => { const t = Date.now(); let h = hits.get(ip); if (!h || h.reset < t) { h = { n: 0, reset: t + windowMs }; hits.set(ip, h); } return ++h.n <= max; };
}
const authLimit = limiter(15 * 60 * 1000, +process.env.AUTH_RATE_LIMIT || 30);
const apiLimit = limiter(60 * 1000, 300);

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Cross-Origin-Opener-Policy': 'same-origin',
  ...(PROD ? { 'Strict-Transport-Security': 'max-age=15552000; includeSubDomains' } : {}),
};
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };

async function main() {
  const db = await connect();
  const q = db.query;
  for (const email of (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) await q("UPDATE users SET role='ADMIN' WHERE email=?", [email]);
  await q('DELETE FROM sessions WHERE expires_at < ?', [now()]);
  // Hash de relleno: un usuario inexistente tarda lo mismo que una contraseña incorrecta.
  const DUMMY_HASH = await hashPassword(crypto.randomBytes(16).toString('hex'));

  const publicUser = u => ({ id: u.id, name: u.name, username: u.username, email: u.email, role: u.role, created: u.created_at });
  const achievementsOf = async id => Object.fromEntries((await q('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id=?', [id])).map(r => [r.achievement_id, r.unlocked_at]));
  const gameOut = (g, withState) => ({ id: g.id, status: g.status, biz: g.business, company: g.company, director: g.director, started: g.started_at, updated: g.updated_at, completed: g.completed_at,
    year: g.year, dec: g.decision, phase: g.phase, setup: parseJSON(g.setup, {}), result: g.result ? parseJSON(g.result, null) : null, ...(withState ? { state: g.state } : {}) });
  const LIST = 'id,user_id,status,business,company,director,started_at,updated_at,completed_at,year,decision,phase,setup,result';

  // Sesión: token aleatorio en una cookie httpOnly; en la base solo se guarda su hash SHA-256.
  async function startSession(ctx, userId) {
    const token = crypto.randomBytes(32).toString('base64url'), expires = new Date(Date.now() + SESSION_DAYS * 864e5);
    await q('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)', [sha256(token), userId, now(), expires.toISOString()]);
    ctx.cookie = `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${PROD ? '; Secure' : ''}`;
  }
  const needUser = ctx => ctx.user || fail(401, 'Inicia sesión para continuar.');
  const needAdmin = ctx => { needUser(ctx); if (ctx.user.role !== 'ADMIN') fail(403, 'Acceso denegado.'); return ctx.user; };

  function cleanResult(r) {
    if (!r || typeof r !== 'object') return null;
    const o = {};
    for (const k of ['index', 'value', 'valueX', 'sales', 'salesX', 'profit', 'debt', 'cash', 'cust', 'rep', 'sat', 'prod', 'inno', 'share', 'emp', 'cap', 'yearReached', 'durationMin']) { const v = num(r[k], -1e12, 1e12); if (v === null) return null; o[k] = v; }
    o.final = str(r.final, 80); o.style = str(r.style, 60); o.bankrupt = !!r.bankrupt;
    o.mix = {}; for (const k of ['G', 'C', 'I', 'R']) o.mix[k] = num((r.mix || {})[k], 0, 100) || 0;
    o.ach = Array.isArray(r.ach) ? r.ach.filter(a => ACHIEVEMENTS.includes(a)) : [];
    return o.final ? o : null;
  }

  const routes = {
    'POST /api/register': async ctx => {
      if (!authLimit(ctx.ip)) fail(429, 'Demasiados intentos. Espera unos minutos y vuelve a probar.');
      const b = ctx.body, name = str(b.name, 80), username = str(b.username, 30), email = str(b.email, 160).toLowerCase();
      const password = typeof b.password === 'string' ? b.password : '', password2 = typeof b.password2 === 'string' ? b.password2 : '';
      if (!name || !username || !email || !password || !password2) fail(400, 'Completa todos los campos.');
      if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) fail(400, 'El nombre de usuario debe tener entre 3 y 30 letras, números, puntos o guiones.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(400, 'Introduce un correo electrónico válido.');
      if (password.length < 8) fail(400, 'Contraseña demasiado corta: usa al menos 8 caracteres.');
      if (password.length > 200) fail(400, 'Contraseña demasiado larga: usa como máximo 200 caracteres.');
      if (password !== password2) fail(400, 'Las contraseñas no coinciden.');
      if ((await q('SELECT id FROM users WHERE username_lc=?', [username.toLowerCase()])).length) fail(409, 'El nombre de usuario ya está registrado.');
      if ((await q('SELECT id FROM users WHERE email=?', [email])).length) fail(409, 'El correo electrónico ya está registrado.');
      const id = crypto.randomUUID(), t = now();
      try { await q('INSERT INTO users (id,name,username,username_lc,email,password_hash,role,created_at,last_seen) VALUES (?,?,?,?,?,?,?,?,?)', [id, name, username, username.toLowerCase(), email, await hashPassword(password), 'USER', t, t]); }
      catch (e) { fail(409, 'Ese usuario o correo ya está registrado.'); }
      await startSession(ctx, id);
      ctx.status = 201;
      return { user: publicUser((await q('SELECT * FROM users WHERE id=?', [id]))[0]), achievements: {} };
    },
    'POST /api/login': async ctx => {
      if (!authLimit(ctx.ip)) fail(429, 'Demasiados intentos. Espera unos minutos y vuelve a probar.');
      const ident = str(ctx.body.id, 160).toLowerCase(), password = typeof ctx.body.password === 'string' ? ctx.body.password.slice(0, 200) : '';
      const u = ident ? (await q('SELECT * FROM users WHERE email=? OR username_lc=?', [ident, ident]))[0] : null;
      const ok = await verifyPassword(password, u ? u.password_hash : DUMMY_HASH);
      if (!u || !ok) fail(401, 'Usuario o contraseña incorrectos.'); // mismo mensaje exista o no la cuenta
      await q('UPDATE users SET last_seen=? WHERE id=?', [now(), u.id]);
      await startSession(ctx, u.id);
      return { user: publicUser(u), achievements: await achievementsOf(u.id) };
    },
    'POST /api/logout': async ctx => {
      if (ctx.tokenHash) await q('DELETE FROM sessions WHERE token_hash=?', [ctx.tokenHash]);
      ctx.cookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${PROD ? '; Secure' : ''}`;
      return { ok: true };
    },
    'GET /api/me': async ctx => {
      if (!ctx.user) return { user: null };
      await q('UPDATE users SET last_seen=? WHERE id=?', [now(), ctx.user.id]);
      return { user: publicUser(ctx.user), achievements: await achievementsOf(ctx.user.id) };
    },
    // Partidas: toda consulta filtra por el usuario de la sesión, nunca por un id que envíe el navegador.
    'GET /api/games': async ctx => {
      const u = needUser(ctx);
      return { games: (await q(`SELECT ${LIST} FROM games WHERE user_id=? ORDER BY updated_at DESC LIMIT 500`, [u.id])).map(g => gameOut(g)) };
    },
    'GET /api/games/:id': async ctx => {
      const u = needUser(ctx), g = (await q('SELECT * FROM games WHERE id=? AND user_id=?', [str(ctx.params.id, 40), u.id]))[0];
      if (!g) fail(404, 'Partida no encontrada.'); // la misma respuesta si existe pero es de otra persona
      return { game: gameOut(g, true) };
    },
    'PUT /api/games/:id': async ctx => {
      const u = needUser(ctx), id = str(ctx.params.id, 40), b = ctx.body;
      if (!/^[a-z0-9]{6,40}$/.test(id)) fail(400, 'Identificador de partida no válido.');
      const status = str(b.status, 20), biz = str(b.biz, 20), company = str(b.company, 60) || 'Mi empresa', state = typeof b.state === 'string' ? b.state : '';
      const year = num(b.year, 1, 5), dec = num(b.dec, 1, 5), started = new Date(b.started);
      if (!STATUSES.includes(status) || !BUSINESSES.includes(biz) || year === null || dec === null || isNaN(started) || !state || state.length > 380000) fail(400, 'Datos de la partida no válidos.');
      const parsed = parseJSON(state, null);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.log) || parsed.log.length > 40) fail(400, 'Datos de la partida no válidos.');
      const setup = JSON.stringify({ cash: num((b.setup || {}).cash, 0, 1e12) || 0, price: num((b.setup || {}).price, 0, 1e9) || 0, cust: num((b.setup || {}).cust, 0, 1e9) || 0 });
      const result = status === 'completada' ? cleanResult(b.result) : null;
      if (status === 'completada' && !result) fail(400, 'Falta el resultado de la partida.');
      const existing = (await q('SELECT user_id, status FROM games WHERE id=?', [id]))[0];
      if (existing && existing.user_id !== u.id) fail(404, 'Partida no encontrada.');
      if (existing && existing.status === 'completada') fail(409, 'Esa partida ya terminó y no se puede modificar.');
      const t = now(), done = status === 'completada' ? t : null, vals = [status, biz, company, str(b.director, 60), t, done, Math.round(year), Math.round(dec), str(b.phase, 12), setup, result ? JSON.stringify(result) : null, state];
      if (existing) await q('UPDATE games SET status=?,business=?,company=?,director=?,updated_at=?,completed_at=?,year=?,decision=?,phase=?,setup=?,result=?,state=? WHERE id=? AND user_id=?', [...vals, id, u.id]);
      else await q('INSERT INTO games (status,business,company,director,updated_at,completed_at,year,decision,phase,setup,result,state,id,user_id,started_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [...vals, id, u.id, started.toISOString()]);
      // Una sola partida en curso por usuario: las demás quedan registradas como abandonadas.
      if (status === 'en_curso') await q("UPDATE games SET status='abandonada', updated_at=? WHERE user_id=? AND status='en_curso' AND id<>?", [t, u.id, id]);
      // Registro de decisiones y eventos, para análisis. Solo se insertan las nuevas.
      const have = (await q('SELECT count(*) AS n FROM game_decisions WHERE game_id=?', [id]))[0];
      let n = 0;
      for (const x of parsed.log) {
        if (!x || x.yr) continue; n++;
        if (n <= Number(have.n)) continue;
        await q('INSERT INTO game_decisions (game_id,n,year,is_event,decision_id,area,situation,option,label,delta_index,before_vars,after_vars) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (game_id,n) DO NOTHING',
          [id, n, Math.round(num(x.y, 1, 5) || 1), x.ev ? 1 : 0, str(x.id, 40), str(x.a, 80), str(x.sit, 400), str(x.opt, 2), str(x.l, 200), num(x.di, -100, 100), x.before ? JSON.stringify(x.before).slice(0, 400) : null, x.after ? JSON.stringify(x.after).slice(0, 400) : null]);
      }
      let achievements;
      if (result) { for (const a of result.ach) await q('INSERT INTO user_achievements (user_id,achievement_id,unlocked_at) VALUES (?,?,?) ON CONFLICT (user_id,achievement_id) DO NOTHING', [u.id, a, t]); achievements = await achievementsOf(u.id); }
      return { ok: true, achievements };
    },
    // Administración: el rol se comprueba aquí, en el servidor, en cada petición.
    'GET /api/admin/overview': async ctx => {
      needAdmin(ctx);
      const users = await q('SELECT id,name,username,email,role,created_at,last_seen FROM users ORDER BY created_at DESC LIMIT 5000');
      const games = await q(`SELECT ${LIST} FROM games ORDER BY updated_at DESC LIMIT 20000`);
      const ach = await q('SELECT achievement_id, count(*) AS n FROM user_achievements GROUP BY achievement_id');
      const picks = await q(`SELECT is_event, area, decision_id, min(situation) AS situation, count(*) AS n,
          sum(CASE WHEN option='A' THEN 1 ELSE 0 END) AS a, sum(CASE WHEN option='B' THEN 1 ELSE 0 END) AS b,
          sum(CASE WHEN option='C' THEN 1 ELSE 0 END) AS c, sum(CASE WHEN option='D' THEN 1 ELSE 0 END) AS d
        FROM game_decisions GROUP BY is_event, area, decision_id ORDER BY n DESC LIMIT 15`);
      const byUser = {}; for (const g of games) (byUser[g.user_id] = byUser[g.user_id] || []).push(gameOut(g));
      return { users: users.map(u => ({ id: u.id, name: u.name, username: u.username, email: u.email, role: u.role, created: u.created_at, last: u.last_seen, games: byUser[u.id] || [] })),
        achievements: Object.fromEntries(ach.map(r => [r.achievement_id, Number(r.n)])),
        picks: picks.map(p => ({ ev: !!Number(p.is_event), area: p.area, situation: p.situation, n: Number(p.n), A: Number(p.a), B: Number(p.b), C: Number(p.c), D: Number(p.d) })) };
    },
    'GET /api/admin/games/:id': async ctx => {
      needAdmin(ctx);
      const g = (await q('SELECT * FROM games WHERE id=?', [str(ctx.params.id, 40)]))[0];
      if (!g) fail(404, 'Partida no encontrada.');
      return { game: gameOut(g, true) };
    },
  };
  const table = Object.entries(routes).map(([k, fn]) => { const [method, p] = k.split(' '); const names = []; return { method, fn, names, re: new RegExp('^' + p.replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)')) + '$') }; });

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new HttpError(413, 'La partida es demasiado grande para guardarse.')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { if (!chunks.length) return resolve({}); const b = parseJSON(Buffer.concat(chunks).toString('utf8'), null); b && typeof b === 'object' && !Array.isArray(b) ? resolve(b) : reject(new HttpError(400, 'Datos no válidos.')); });
      req.on('error', reject);
    });
  }
  async function api(req, res, url) {
    const ctx = { status: 200, params: {}, body: {}, ip: (PROD && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '' };
    const send = (status, data) => { res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(ctx.cookie ? { 'Set-Cookie': ctx.cookie } : {}) }); res.end(JSON.stringify(data)); };
    try {
      if (!apiLimit(ctx.ip)) fail(429, 'Demasiadas peticiones. Espera un momento.');
      const route = table.find(r => r.method === req.method && r.re.test(url.pathname));
      if (!route) fail(404, 'No encontrado.');
      route.re.exec(url.pathname).slice(1).forEach((v, i) => { ctx.params[route.names[i]] = decodeURIComponent(v); });
      if (req.method !== 'GET') {
        // Las peticiones que cambian datos deben venir del mismo sitio y en JSON (defensa CSRF junto con SameSite=Lax).
        const origin = req.headers.origin;
        if (origin) { let host = ''; try { host = new URL(origin).host; } catch (e) {} if (host !== req.headers.host) fail(403, 'Origen no permitido.'); }
        if (!/^application\/json/i.test(req.headers['content-type'] || '')) fail(415, 'Formato no admitido.');
        ctx.body = await readBody(req);
      }
      const m = /(?:^|;\s*)sid=([A-Za-z0-9_-]{20,100})/.exec(req.headers.cookie || '');
      if (m) { const h = sha256(m[1]), u = (await q('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?', [h, now()]))[0]; if (u) { ctx.user = u; ctx.tokenHash = h; } }
      const data = await route.fn(ctx);
      send(ctx.status, data);
    } catch (e) {
      if (e instanceof HttpError) return send(e.status, { error: e.message });
      console.error(e); // el detalle técnico queda en el servidor; al usuario solo le llega un mensaje genérico
      send(500, { error: 'Ocurrió un problema. Intenta de nuevo.' });
    }
  }
  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, SECURITY_HEADERS); return res.end(); }
    let rel = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\]|\.\.)+/, '');
    let file = path.join(FRONTEND, rel);
    if (!file.startsWith(FRONTEND) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(FRONTEND, 'index.html');
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': type, 'Cache-Control': type.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600' });
    req.method === 'HEAD' ? res.end() : fs.createReadStream(file).pipe(res);
  }

  const server = http.createServer((req, res) => {
    let url; try { url = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); }
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') return api(req, res, url);
    try { serveStatic(req, res, url); } catch (e) { res.writeHead(400, SECURITY_HEADERS); res.end(); }
  });
  const port = +process.env.PORT || 3000;
  server.listen(port, () => console.log(`Simulador de Negocios en http://localhost:${port} · base de datos: ${db.engine}`));
  const stop = () => server.close(() => db.close().then(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
