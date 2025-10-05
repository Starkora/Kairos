// Rate limiter sencillo en memoria (por IP o clave generada)
// Nota: Para producción con múltiples instancias, usar Redis u otro store compartido.

function rateLimit({ windowMs = 60_000, max = 60, keyGenerator, message = 'Too many requests' } = {}) {
  const hits = new Map(); // key -> { count, reset }

  return (req, res, next) => {
    try {
      const now = Date.now();
      const key = (typeof keyGenerator === 'function') ? keyGenerator(req) : (req.ip || req.connection?.remoteAddress || '');
      const rec = hits.get(key) || { count: 0, reset: now + windowMs };
      if (now > rec.reset) {
        rec.count = 0;
        rec.reset = now + windowMs;
      }
      rec.count += 1;
      hits.set(key, rec);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - rec.count)));
      res.setHeader('X-RateLimit-Reset', String(rec.reset));
      if (rec.count > max) {
        return res.status(429).json({ error: 'rate_limited', message, retryAt: rec.reset });
      }
      next();
    } catch (e) {
      next();
    }
  };
}

module.exports = { rateLimit };

// Rate limit por clave derivada (ej. email normalizado)
function rateLimitByKey({ windowMs = 60_000, max = 6, keyName = 'key', message = 'Too many requests' } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const rawKey = (req.body && req.body[keyName]) || (req.query && req.query[keyName]) || '';
    const key = String(rawKey || '').toLowerCase().trim();
    const rec = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count += 1; hits.set(key, rec);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - rec.count)));
    res.setHeader('X-RateLimit-Reset', String(rec.reset));
    if (!key) return next(); // sin clave, no limitamos por key
    if (rec.count > max) return res.status(429).json({ error: 'rate_limited', message, retryAt: rec.reset });
    next();
  };
}

module.exports.rateLimitByKey = rateLimitByKey;
