module.exports.requireAdmin = (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autenticado' });
    if (String(user.rol || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Requiere rol admin' });
    }
    next();
  } catch (e) {
    return res.status(403).json({ error: 'No autorizado' });
  }
};
