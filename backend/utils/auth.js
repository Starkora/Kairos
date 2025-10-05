const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kairos_secret';

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (process.env.DEBUG_AUTH === 'true') console.log('Authorization header presente:', !!authHeader);

  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
  const token = authHeader.split(' ')[1];
  if (process.env.DEBUG_AUTH === 'true') console.log('Token recibido (oculto)');

  if (!token) return res.status(401).json({ error: 'Token inválido' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
  if (process.env.DEBUG_AUTH === 'true') console.log('Token decodificado (sin imprimir datos sensibles)');

    if (!user.id) {
      return res.status(401).json({ error: 'Token inválido: falta el ID del usuario' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error al verificar token:', err && err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};
