const db = require('../../../config/database');

// GET /api/preferencias -> devuelve objeto { data: {...} }
async function getPreferencias(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [userId]);
    if (Array.isArray(rows) && rows.length > 0) {
      return res.json({ data: rows[0].data || {} });
    }
    return res.json({ data: {} });
  } catch (e) {
    console.error('getPreferencias error:', e);
    return res.status(500).json({ error: 'Error obteniendo preferencias' });
  }
}

// POST /api/preferencias -> guarda merge de data
// body: { data: { ...partial } }
async function savePreferencias(req, res) {
  try {
    const userId = req.user.id;
    const partial = (req.body && req.body.data) || {};
    if (typeof partial !== 'object' || Array.isArray(partial)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }
    // Leer existentes
    const [rows] = await db.query('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [userId]);
    const current = (Array.isArray(rows) && rows[0] && rows[0].data) ? rows[0].data : {};
    // Merge superficial (shallow)
    const next = { ...current, ...partial };
    if (Array.isArray(rows) && rows.length > 0) {
      await db.query('UPDATE usuarios_preferencias SET data = ? WHERE usuario_id = ?', [JSON.stringify(next), userId]);
    } else {
      await db.query('INSERT INTO usuarios_preferencias (usuario_id, data) VALUES (?, ?)', [userId, JSON.stringify(next)]);
    }
    return res.json({ success: true, data: next });
  } catch (e) {
    console.error('savePreferencias error:', e);
    return res.status(500).json({ error: 'Error guardando preferencias' });
  }
}

module.exports = { getPreferencias, savePreferencias };
