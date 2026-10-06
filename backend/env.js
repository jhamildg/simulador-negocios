// Carga variables desde backend/.env si existe (sin dependencias). En el hosting se definen en su panel.
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, '.env');
if (fs.existsSync(f)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
