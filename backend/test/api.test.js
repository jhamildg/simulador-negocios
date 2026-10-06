// Pruebas de la API (sin dependencias): arranca el servidor con una base temporal y comprueba cuentas, sesiones y permisos.
// Uso: npm test
const { spawn } = require('child_process');
const path = require('path');
const PORT = 3987, BASE = 'http://localhost:' + PORT;
let pass = 0, failN = 0;
const ok = (name, cond) => { cond ? pass++ : failN++; console.log((cond ? 'PASA  ' : 'FALLA ') + name); };
function client() { let cookie = ''; return async (method, url, body) => {
  const r = await fetch(BASE + url, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return { status: r.status, data: await r.json().catch(() => ({})), setCookie: sc || '' }; }; }
const state = log => JSON.stringify({ year: 1, log });
const game = (extra = {}) => ({ status: 'en_curso', biz: 'comida', company: 'Sabor Camba', started: new Date().toISOString(), year: 1, dec: 2, phase: 'res', setup: { cash: 60000, price: 35, cust: 780 },
  state: state([{ y: 1, a: 'Precios', l: 'Subir el precio 8%', di: 1.2, id: 'precio1', opt: 'A', sit: 'Situación', before: { cash: 1 }, after: { cash: 2 } }]), ...extra });
const result = { final: 'Empresa estable', index: 61.2, value: 900000, valueX: 1.2, sales: 700000, salesX: 1.1, profit: 80000, debt: 0, cash: 90000, cust: 800, rep: 55, sat: 56, prod: 60, inno: 20, share: 12.5, emp: 5, cap: 21000, yearReached: 5, durationMin: 14,
  style: 'Director prudente', mix: { G: 20, C: 40, I: 10, R: 30 }, ach: ['millon', 'inventado'], bankrupt: false };

(async () => {
  const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT, SQLITE_PATH: ':memory:', DATABASE_URL: '', NODE_ENV: 'development', ADMIN_EMAILS: '', AUTH_RATE_LIMIT: '12' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(r => srv.stdout.once('data', r));
  try {
    const A = client(), B = client(), X = client();
    const reg = (c, u, extra = {}) => c('POST', '/api/register', { name: 'Nombre ' + u, username: u, email: u + '@ejemplo.test', password: 'clave-segura-1', password2: 'clave-segura-1', ...extra });
    let r = await reg(A, 'ana');
    ok('1. crear usuario nuevo', r.status === 201 && r.data.user.username === 'ana' && r.data.user.role === 'USER');
    ok('   la respuesta no incluye contraseña ni hash', !JSON.stringify(r.data).match(/password|hash|clave-segura/i));
    ok('   la cookie de sesión es HttpOnly y SameSite', /HttpOnly/i.test(r.setCookie) && /SameSite=Lax/i.test(r.setCookie));
    ok('2. mismo usuario (aunque cambie mayúsculas) se rechaza', (await reg(X, 'ANA', { email: 'otro@ejemplo.test' })).data.error === 'El nombre de usuario ya está registrado.');
    ok('3. mismo correo se rechaza', (await reg(X, 'ana2', { email: 'ANA@ejemplo.test' })).data.error === 'El correo electrónico ya está registrado.');
    ok('   correo no válido', (await reg(X, 'xavi1', { email: 'no-es-correo' })).data.error === 'Introduce un correo electrónico válido.');
    ok('   contraseña corta', (await reg(X, 'xavi2', { password: '123', password2: '123' })).data.error.startsWith('Contraseña demasiado corta'));
    ok('   contraseñas distintas', (await reg(X, 'xavi3', { password2: 'otra-clave-99' })).data.error === 'Las contraseñas no coinciden.');
    ok('   intentar registrarse como ADMIN desde el navegador no funciona', (await reg(X, 'xavi4', { role: 'ADMIN' })).data.user.role === 'USER');
    const A2 = client();
    ok('4. iniciar sesión con usuario', (await A2('POST', '/api/login', { id: 'ana', password: 'clave-segura-1' })).status === 200);
    ok('   iniciar sesión con correo', (await client()('POST', '/api/login', { id: 'ana@ejemplo.test', password: 'clave-segura-1' })).status === 200);
    const bad1 = await client()('POST', '/api/login', { id: 'ana', password: 'incorrecta' }), bad2 = await client()('POST', '/api/login', { id: 'noexiste', password: 'incorrecta' });
    ok('5. contraseña incorrecta se rechaza', bad1.status === 401 && bad1.data.error === 'Usuario o contraseña incorrectos.');
    ok('   mismo mensaje si el usuario no existe', bad2.status === 401 && bad2.data.error === bad1.data.error);
    ok('7. la sesión se mantiene entre peticiones', (await A2('GET', '/api/me')).data.user.username === 'ana');
    ok('   sin sesión no hay acceso a partidas', (await client()('GET', '/api/games')).status === 401);
    ok('8. crear una partida', (await A('PUT', '/api/games/gpartidaa1', game())).status === 200);
    ok('   datos de partida no válidos se rechazan', (await A('PUT', '/api/games/gpartidaa2', game({ biz: 'otro' }))).status === 400);
    r = await A('GET', '/api/games/gpartidaa1');
    ok('9. el estado guardado se recupera igual', r.status === 200 && r.data.game.state === game().state && r.data.game.company === 'Sabor Camba');
    await A('PUT', '/api/games/gpartidaa3', game());
    r = await A('GET', '/api/games');
    ok('   empezar otra partida deja la anterior como abandonada, sin borrarla', r.data.games.length === 2 && r.data.games.find(g => g.id === 'gpartidaa1').status === 'abandonada');
    r = await A('PUT', '/api/games/gpartidaa3', game({ status: 'completada', year: 5, dec: 5, phase: 'end', result }));
    ok('10. completar una partida guarda el resultado', r.status === 200 && (await A('GET', '/api/games')).data.games.find(g => g.id === 'gpartidaa3').result.index === 61.2);
    ok('11. los logros quedan en la cuenta (y los inventados se descartan)', Object.keys(r.data.achievements).join() === 'millon');
    ok('    una partida terminada no se puede modificar', (await A('PUT', '/api/games/gpartidaa3', game())).status === 409);
    await reg(B, 'beto');
    ok('12. el usuario B no ve partidas de A', (await B('GET', '/api/games')).data.games.length === 0);
    ok('13. B no puede abrir una partida de A por su id', (await B('GET', '/api/games/gpartidaa1')).status === 404);
    ok('    B no puede sobrescribir una partida de A', (await B('PUT', '/api/games/gpartidaa1', game())).status === 404 && (await A('GET', '/api/games/gpartidaa1')).data.game.company === 'Sabor Camba');
    ok('14. un usuario normal no entra al panel de administrador', (await B('GET', '/api/admin/overview')).status === 403 && (await B('GET', '/api/admin/games/gpartidaa1')).status === 403);
    ok('    sin sesión tampoco', (await client()('GET', '/api/admin/overview')).status === 401);
    ok('    petición desde otro sitio se rechaza', (await fetch(BASE + '/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://sitio-malo.test' }, body: '{}' })).status === 403);
    ok('6. cerrar sesión invalida la sesión en el servidor', (await A2('POST', '/api/logout', {})).status === 200 && (await A2('GET', '/api/me')).data.user === null);
    let limited = false; for (let i = 0; i < 14; i++) if ((await client()('POST', '/api/login', { id: 'ana', password: 'x' })).status === 429) limited = true;
    ok('    demasiados intentos de acceso se bloquean', limited);
  } catch (e) { failN++; console.error(e); }
  srv.kill();
  console.log(`\n${pass} pruebas pasaron, ${failN} fallaron.`);
  process.exit(failN ? 1 : 0);
})();
