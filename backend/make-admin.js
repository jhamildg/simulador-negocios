// Uso: npm run make-admin -- correo@ejemplo.com   (da rol ADMIN a una cuenta ya registrada)
require('./env');
const { connect } = require('./db');
(async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) { console.error('Indica el correo de la cuenta.'); process.exit(1); }
  const db = await connect();
  const u = (await db.query('SELECT username FROM users WHERE email=?', [email]))[0];
  if (u) await db.query("UPDATE users SET role='ADMIN' WHERE email=?", [email]);
  console.log(u ? `Listo: ${u.username} ahora es ADMIN.` : 'No existe una cuenta con ese correo. Regístrala primero.');
  await db.close();
})();
