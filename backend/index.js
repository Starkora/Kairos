// Sincronizar modelos Sequelize
const sequelize = require('./sequelize');
sequelize.sync().then(() => {
  console.log('[Sequelize] Modelos sincronizados');
}).catch(err => {
  console.error('[Sequelize] Error al sincronizar modelos:', err);
});
require('dotenv').config();
// Evitar imprimir secretos en logs
if (process.env.NODE_ENV !== 'production') {
  console.log('[env] Variables cargadas:', [
    'SENDGRID_API_KEY',
    'MAIL_FROM',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'PORT',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_IDS',
  ].filter((k) => process.env[k]).join(', '));
}

const express = require('express');
const http = require('http');
const db = require('./db');
const app = express();
let PORT = Number(process.env.PORT) || 3001;

const adminRoutes = require('./routes/admin');
app.set('trust proxy', 1);

// Advertencia: JWT_SECRET por defecto en producción
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'kairos_secret')) {
  console.warn('[seguridad] JWT_SECRET no está configurado en producción; usa un valor fuerte en las variables de entorno.');
}

// Middleware CORS
const cors = require('cors');
function normalizeOrigin(o) {
  if (!o) return o;
  return String(o).trim().replace(/\/+$/, '');
}

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002', 
  normalizeOrigin(process.env.WEB_ORIGIN),
  normalizeOrigin(process.env.NGROK_ORIGIN),
  normalizeOrigin(process.env.DEVTUNNELS_ORIGIN)
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    console.log('[CORS] Origin recibido:', origin);
    // Permite herramientas como Postman (sin origin)
    if (!origin) return callback(null, true);
    const isProd = process.env.NODE_ENV === 'production';
    const isNgrok = /https?:\/\/([a-z0-9-]+)\.ngrok(-free)?\.app$/i.test(origin);
    const isDevTunnels = /https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.devtunnels\.ms$/i.test(origin);
    const originNorm = normalizeOrigin(origin);
    if (allowedOrigins.includes(originNorm) || (!isProd && (isNgrok || isDevTunnels))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','ngrok-skip-browser-warning'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
// Soporte preflight
app.options('*', cors(corsOptions));

// Middleware básico
const helmet = require('helmet');
const enableApiCsp = process.env.ENABLE_API_CSP === 'true';
app.use(helmet({
  // Evitar aislar el contexto de apertura para permitir postMessage entre GIS y la app
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  // No requerimos COEP y puede interferir con iframes/scripts de terceros
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: enableApiCsp ? {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"]
    }
  } : false
}));

// Sugerir permiso para FedCM (Google Identity Services) donde aplique
app.use((req, res, next) => {
  try {
    // Nota: El frontend debería servir este encabezado; lo añadimos aquí para integradores que consumen páginas desde el backend.
    res.setHeader('Permissions-Policy', 'identity-credentials-get=(self "https://accounts.google.com")');
  } catch {}
  next();
});
app.use(express.json({ limit: '1mb' }));

// Agregar cookie-parser para poder leer req.cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Session middleware
const session = require('express-session');
const Redis = require('ioredis');
// Eliminamos connect-redis y usamos un store personalizado para evitar incompatibilidades de versiones

// Permitir conexión mediante REDIS_URL (Upstash u otros). Si NO hay URL, usar MemoryStore sin intentar localhost.
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
let redisClient = null;
if (redisUrl) {
  redisClient = new Redis(redisUrl, {
    // Upstash usa TLS (rediss) y autenticación por URL; ioredis lo maneja automáticamente
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    // Evitar bucles de reintentos/colas cuando hay problemas de red
    retryStrategy: () => null,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
} else {
  console.warn('[session] REDIS_URL no definido. Usando MemoryStore para sesiones.');
}

// Logs de conexión a Redis para depurar
if (process.env.DEBUG_REDIS === 'true') {
  redisClient.on('connect', () => console.log('Conectando a Redis...'));
  redisClient.on('ready', () => console.log('Redis listo para usar.'));
}
if (redisClient) {
  redisClient.on('error', (err) => console.error('Error de Redis:', err));
}

// Configurar almacenamiento de sesiones personalizado
class CustomRedisStore extends session.Store {
  constructor(redisClient, { prefix = 'sess:', ttl = 60 * 15 } = {}) { // ttl en segundos
    super();
    this.redisClient = redisClient;
    this.prefix = prefix;
    this.ttl = ttl;
  }

  key(sid) {
    return `${this.prefix}${sid}`;
  }

  async get(sid, callback) {
    try {
      const data = await this.redisClient.get(this.key(sid));
      callback(null, data ? JSON.parse(data) : null);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      await this.redisClient.set(this.key(sid), JSON.stringify(sessionData), 'EX', this.ttl);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.redisClient.del(this.key(sid));
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

// Configurable session TTL (minutos)
const sessionTtlMinutes = Number(process.env.SESSION_TTL_MINUTES || 15);
let store = null;
if (redisClient) {
  // ttl en segundos
  store = new CustomRedisStore(redisClient, { prefix: 'sess:', ttl: sessionTtlMinutes * 60 });
} else {
  // Fallback MemoryStore para entornos sin Redis (no recomendado en multi-instancia)
  store = new session.MemoryStore();
}

// Cookies cross-site (ngrok) requieren SameSite=None y Secure; usamos secure:'auto' + trust proxy
const sameSitePolicy = process.env.SAMESITE || (process.env.CROSS_SITE_COOKIES === 'true' ? 'none' : 'lax');

app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'kairos_secret',
  resave: false,
  // No guardar sesiones vacías por defecto (mejor para producción)
  saveUninitialized: false,
  // Renueva la cookie en cada request activa (expira por inactividad)
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: 'auto', // requiere app.set('trust proxy', 1) para https detrás de ngrok
    sameSite: sameSitePolicy,
    maxAge: 1000 * 60 * sessionTtlMinutes // configurable por env
  }
}));

// Rutas
const transaccionesRouter = require('./routes/transacciones');
const categoriasRouter = require('./routes/categorias');
const cuentasRouter = require('./routes/cuentas');
const categoriasCuentaRouter = require('./routes/categoriasCuenta');


const usuariosRouter = require('./routes/usuarios');
const googleAuthRouter = require('./routes/googleAuth');
const deudasRouter = require('./routes/deudas');
const metasRouter = require('./routes/metas');
const notificacionesController = require('./controllers/notificacionesController');
const presupuestosRouter = require('./routes/presupuestos');
const preferenciasRouter = require('./routes/preferencias');
const insightsRouter = require('./routes/insights');
// Limpieza de usuarios_pendientes expirados (usa evento MySQL si existe; si no, fallback en Node)
let cleanupInterval = null;
const cleanupExpiredPendings = async () => {
  try {
    const now = Date.now();
    await db.query('DELETE FROM usuarios_pendientes WHERE expires IS NOT NULL AND expires < ?', [now]);
  } catch (err) {
    console.error('[cleanupExpiredPendings] Error al limpiar usuarios_pendientes expirados:', err);
  }
};

async function setupCleanupJob() {
  try {
    // Comprobar si el evento existe en MySQL
    const [rows] = await db.query("SELECT EVENT_NAME FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = DATABASE() AND EVENT_NAME = 'ev_cleanup_usuarios_pendientes'");
    const hasEvent = Array.isArray(rows) && rows.length > 0;
    if (hasEvent) {
      console.log('[cleanup] Evento MySQL ev_cleanup_usuarios_pendientes detectado. No se inicia job en Node.');
      app.locals.cleanupStrategy = 'mysql-event';
    } else {
      console.log('[cleanup] Evento MySQL no encontrado. Iniciando job de limpieza en Node cada 60s.');
      cleanupInterval = setInterval(cleanupExpiredPendings, 60 * 1000);
      app.locals.cleanupStrategy = 'node-fallback';
    }
  } catch (err) {
    console.warn('[cleanup] No se pudo verificar el evento MySQL. Usando fallback en Node.', err);
    cleanupInterval = setInterval(cleanupExpiredPendings, 60 * 1000);
    app.locals.cleanupStrategy = 'node-fallback';
  }
}
setupCleanupJob();

// Job para aplicar movimientos pendientes cuya fecha haya llegado
async function applyPendingJob() {
  try {
    const Transaccion = require('./models/transaccion');
    const MovimientoRecurrente = require('./models/movimientoRecurrente');
    // Primero materializamos las ocurrencias recurrentes de HOY
    try {
      const mat = await (MovimientoRecurrente.materializeDueForToday && MovimientoRecurrente.materializeDueForToday());
      if (mat > 0) console.log(`[applyPendingJob] Ocurrencias recurrentes materializadas: ${mat}`);
    } catch (e) {
      console.error('[applyPendingJob] Error materializando recurrentes:', e && e.message);
    }
    const appliedCount = await Transaccion.applyPendingMovements();
    if (appliedCount > 0) console.log(`[applyPendingJob] Movimientos aplicados: ${appliedCount}`);
  } catch (e) {
    console.error('[applyPendingJob] Error ejecutando job:', e.message);
  }
}
// En producción se puede programar una vez al día; mientras tanto ejecutamos cada 60s para dev/test
const applyInterval = process.env.NODE_ENV === 'production' ? 24 * 60 * 60 * 1000 : 60 * 1000;
setInterval(applyPendingJob, applyInterval);
// Ejecutar al arrancar una vez
applyPendingJob();

// Endpoint de salud para monitorear limpieza de usuarios_pendientes
// Middleware de protección adicional: allowlist de IPs y rate limiting simple
const adminHealthAllowIps = (process.env.ADMIN_HEALTH_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
const adminHealthWindowSec = Number(process.env.ADMIN_HEALTH_RATE_LIMIT_WINDOW_SECONDS || 60);
const adminHealthMaxReq = Number(process.env.ADMIN_HEALTH_RATE_LIMIT_MAX || 30);
const adminHealthHits = new Map(); // key: ip, value: { count, reset }

function getClientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xri = req.headers['x-real-ip'];
  if (xri) return String(xri).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') {
    const first = xff.split(',')[0];
    if (first) return first.trim();
  }
  return req.ip || req.connection?.remoteAddress || '';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const winMs = adminHealthWindowSec * 1000;
  const rec = adminHealthHits.get(ip) || { count: 0, reset: now + winMs };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + winMs;
  }
  rec.count += 1;
  adminHealthHits.set(ip, rec);
  return { allowed: rec.count <= adminHealthMaxReq, remaining: Math.max(0, adminHealthMaxReq - rec.count), reset: rec.reset };
}

app.get('/api/admin/health', async (req, res) => {
  const adminKey = process.env.ADMIN_HEALTH_KEY;
  if (!adminKey) {
    return res.status(500).json({ ok: false, error: 'missing_admin_key', message: 'ADMIN_HEALTH_KEY no está configurada' });
  }
  // IP allowlist (si se configuró)
  const ip = getClientIp(req);
  if (adminHealthAllowIps.length > 0 && !adminHealthAllowIps.includes(ip)) {
    return res.status(403).json({ ok: false, error: 'forbidden_ip', message: 'IP no permitida', ip });
  }
  // Rate limiting
  const rl = checkRateLimit(ip);
  res.setHeader('X-RateLimit-Limit', String(adminHealthMaxReq));
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  res.setHeader('X-RateLimit-Reset', String(rl.reset));
  if (!rl.allowed) {
    return res.status(429).json({ ok: false, error: 'rate_limited', message: 'Demasiadas solicitudes', retryAt: rl.reset });
  }
  const provided = req.header('X-Admin-Key');
  if (!provided) {
    return res.status(401).json({ ok: false, error: 'unauthorized', message: 'Falta cabecera X-Admin-Key' });
  }
  if (provided !== adminKey) {
    return res.status(403).json({ ok: false, error: 'forbidden', message: 'X-Admin-Key inválida' });
  }
  try {
    const [schedRows] = await db.query('SELECT @@event_scheduler AS scheduler');
    const scheduler = (Array.isArray(schedRows) && schedRows[0] && schedRows[0].scheduler) || null;

    const [eventRows] = await db.query("SELECT EVENT_NAME, STATUS, LAST_EXECUTED, INTERVAL_VALUE, INTERVAL_FIELD FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = DATABASE() AND EVENT_NAME = 'ev_cleanup_usuarios_pendientes'");
    const eventInfo = Array.isArray(eventRows) && eventRows[0] ? {
      name: eventRows[0].EVENT_NAME,
      status: eventRows[0].STATUS,
      lastExecuted: eventRows[0].LAST_EXECUTED,
      schedule: `${eventRows[0].INTERVAL_VALUE || ''} ${eventRows[0].INTERVAL_FIELD || ''}`.trim()
    } : null;

    res.json({
      ok: true,
      time: Date.now(),
      cleanupStrategy: app.locals.cleanupStrategy || 'unknown',
      eventScheduler: scheduler,
      mysqlEvent: {
        present: !!eventInfo,
        info: eventInfo
      },
      clientIp: ip,
    });
  } catch (err) {
    console.error('[health] Error:', err);
    res.status(500).json({ ok: false, error: 'health_error', message: String(err && err.message || err) });
  }
});

// Healthcheck de base de datos: SELECT 1
app.get('/api/health/db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    return res.json({ ok: true, result: rows && rows[0] ? rows[0].ok : null, time: Date.now() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
});

app.use('/api/transacciones', transaccionesRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/cuentas', cuentasRouter);
app.use('/api/categorias-cuenta', categoriasCuentaRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/usuarios/google', googleAuthRouter); // /api/usuarios/google
app.use('/api/deudas', deudasRouter);
app.use('/api/metas', metasRouter);
app.use('/api/presupuestos', presupuestosRouter);
app.use('/api/preferencias', preferenciasRouter);
app.use('/api/insights', insightsRouter);
const movimientosRecurrentesRouter = require('./routes/movimientosRecurrentes');
app.use('/api/movimientos-recurrentes', movimientosRecurrentesRouter);
app.use('/api/admin', adminRoutes);
app.use('/api', notificacionesController);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API Kairos funcionando');
});

// Forzar el guardado de la sesión después de asignar el código de verificación
app.post('/api/guardar-codigo', (req, res) => {
  req.session.codigoVerificacion = '602755';
  console.log('Código asignado a la sesión:', req.session.codigoVerificacion);
  console.log('Estado de la sesión antes de guardar:', req.session);
  req.session.save((err) => {
    if (err) {
      console.error('Error al guardar la sesión:', err);
      return res.status(500).json({ error: 'Error al guardar la sesión' });
    } else {
      console.log('Sesión guardada correctamente en Redis.');
      // Verificar el contenido de la sesión en Redis después de guardar
      req.session.save((err) => {
        if (err) {
          console.error('Error al guardar la sesión:', err);
        } else {
          console.log('Sesión guardada correctamente. Verificando contenido en Redis...');
          redisClient.get(`sess:${req.sessionID}`, (err, sessionData) => {
            if (err) {
              console.error('Error al obtener la sesión de Redis:', err);
            } else {
              console.log('Contenido de la sesión en Redis después de guardar:', sessionData);
            }
          });
        }
      });
      return res.status(200).json({ message: 'Código de verificación guardado en la sesión' });
    }
  });
});

// Verificar si las cookies se envían correctamente
if (process.env.DEBUG_HTTP === 'true') {
  app.use((req, res, next) => {
    console.log('Cookies recibidas en la solicitud:', req.cookies);
    console.log('ID de sesión recibido:', req.sessionID);
    next();
  });
}

// Verificar el contenido de la sesión al inicio de cada solicitud
if (process.env.DEBUG_HTTP === 'true') {
  app.use((req, res, next) => {
    console.log('Estado de la sesión al inicio de la solicitud:', req.session);
    next();
  });
}

// Verificar el almacenamiento en Redis cuando esté listo
if (process.env.DEBUG_REDIS === 'true') {
  redisClient.once('ready', async () => {
    try {
      const keys = await redisClient.keys('*');
      console.log('Claves almacenadas en Redis:', keys);
    } catch (err) {
      console.error('Error al obtener claves de Redis:', err);
    }
  });
}

// Arranque robusto: manejar EADDRINUSE creando un servidor nuevo por intento
function startServer(port, attemptsLeft = 10) {
  const server = http.createServer(app);

  const onListening = () => {
    console.log(`Servidor Kairos backend escuchando en puerto ${port}`);
  };

  const onError = (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Puerto ${port} en uso, intentando en ${nextPort}... (${attemptsLeft - 1} intentos restantes)`);
      server.removeAllListeners();
      setTimeout(() => startServer(nextPort, attemptsLeft - 1), 300);
    } else {
      console.error('No se pudo iniciar el servidor:', err);
    }
  };

  server.once('listening', onListening);
  server.once('error', onError);
  server.listen(port);
}

startServer(PORT);

// Verificar el contenido de la sesión en Redis
if (process.env.DEBUG_HTTP === 'true') {
  app.use((req, res, next) => {
    if (req.sessionID) {
      redisClient.get(`sess:${req.sessionID}`, (err, sessionData) => {
        if (err) {
          console.error('Error al obtener la sesión de Redis:', err);
        } else {
          console.log('Datos de la sesión en Redis:', sessionData);
        }
      });
    }
    next();
  });
}

// Validaciones de configuración crítica (solo en producción)
if (process.env.NODE_ENV === 'production') {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'kairos_secret') {
    console.error('[SECURITY] JWT_SECRET no configurado correctamente en producción.');
    process.exit(1);
  }
  if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM) {
    console.warn('[SECURITY] Falta configuración de email (SENDGRID_API_KEY o MAIL_FROM).');
  }
}
