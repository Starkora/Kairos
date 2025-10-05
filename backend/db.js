const mysql = require('mysql2/promise');
const fs = require('fs');

const useUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
let poolConfig = {};
if (useUrl) {
  // Parsear la URL para poder inyectar SSL si se requiere
  try {
    const u = new URL(useUrl);
    poolConfig = {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database: (u.pathname || '').replace(/^\//, '') || undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  } catch (e) {
    // Si la URL no parsea, como fallback usar string directa (mysql2 soporta string)
    poolConfig = useUrl;
  }
} else {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  // Compat local: si no se define DB_PASS y usamos root@localhost, asumir 'CodeEsteban' (histórico del proyecto)
  let password = process.env.DB_PASS;
  if (password === undefined) {
    password = (host === 'localhost' && user === 'root') ? 'CodeEsteban' : '';
  }
  poolConfig = {
    host,
    user,
    password,
    database: process.env.DB_NAME || 'kairos',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

// SSL opcional (TiDB/PlanetScale/Railway) controlado por DB_SSL=true
if (String(process.env.DB_SSL || '').toLowerCase() === 'true') {
  if (typeof poolConfig === 'object') {
    // Config por defecto segura para proveedores con CA pública
    let ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
    // Permitir inyectar CA desde archivo o base64
    const caPath = process.env.DB_SSL_CA;
    const caB64 = process.env.DB_SSL_CA_B64;
    try {
      if (caPath && fs.existsSync(caPath)) {
        ssl.ca = fs.readFileSync(caPath, 'utf8');
      } else if (caB64) {
        ssl.ca = Buffer.from(caB64, 'base64').toString('utf8');
      }
    } catch (e) {
      // Si falla la carga de CA, como fallback no establecemos 'ca'
    }
    // Opción para desactivar verificación (no recomendado en prod)
    if (String(process.env.DB_SSL_REJECT_UNAUTH || '').toLowerCase() === 'false') {
      ssl.rejectUnauthorized = false;
    }
    poolConfig.ssl = ssl;
  }
}

const db = (typeof poolConfig === 'string')
  ? mysql.createPool(poolConfig)
  : mysql.createPool(poolConfig);

module.exports = db;
