const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kairos_secret';
const Usuario = require('../models/usuario');

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (process.env.DEBUG_AUTH === 'true') console.log('Authorization header presente:', !!authHeader);

  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
  const token = authHeader.split(' ')[1];
  if (process.env.DEBUG_AUTH === 'true') console.log('Token recibido (oculto)');

  if (!token) return res.status(401).json({ error: 'Token inválido' });
  try {
  const user = jwt.verify(token, JWT_SECRET);
    if (process.env.DEBUG_AUTH === 'true') console.log('Token decodificado (sin imprimir datos sensibles)');

    // Compatibilidad: si el token no trae id pero sí email, intentar obtener el id desde la BD
    if (!user.id && user.email) {
      if (process.env.DEBUG_AUTH === 'true') console.log('Falta id en token; buscando id por email');
      try {
        const rows = await Usuario.findByEmail(String(user.email).trim());
        const found = Array.isArray(rows) ? rows[0] : null;
        if (found && found.id) {
          user.id = found.id;
          if (process.env.DEBUG_AUTH === 'true') console.log('ID recuperado por email');
        }
      } catch (e) {
        if (process.env.DEBUG_AUTH === 'true') console.log('Error buscando usuario por email:', e && e.message);
      }
    }

    if (!user.id) {
      return res.status(401).json({ error: 'Token inválido: falta el ID del usuario' });
    }

    // Completar datos faltantes del usuario (rol/aprobado) si no vienen en el token
    if (user && (user.rol === undefined || user.aprobado === undefined)) {
      try {
        const rows = await Usuario.findById(user.id);
        const dbUser = Array.isArray(rows) ? rows[0] : null;
        if (dbUser) {
          if (user.rol === undefined) user.rol = dbUser.rol || 'user';
          if (user.aprobado === undefined) user.aprobado = dbUser.aprobado;
        }
      } catch (e) {
        if (process.env.DEBUG_AUTH === 'true') console.log('No se pudo completar rol/aprobado desde BD:', e && e.message);
      }
    }

    
    req.user = user;
    next();
  } catch (err) {
    console.error('Error al verificar token:', err && err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};
