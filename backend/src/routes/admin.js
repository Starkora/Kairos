const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../utils/auth');
const { requireAdmin } = require('../middlewares/admin.middleware');

// GET /api/admin/users/pending - lista usuarios no aprobados
router.get('/users/pending', auth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, nombre, apellido, numero, plataforma, created_at AS creado_en, verificado, rol, aprobado FROM usuarios WHERE aprobado = 0 ORDER BY id DESC');
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error('[admin] pending users error:', e);
    res.status(500).json({ error: 'Error al obtener usuarios pendientes' });
  }
});

// POST /api/admin/users/:id/approve - marca aprobado = 1
router.post('/users/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const [result] = await db.query('UPDATE usuarios SET aprobado = 1 WHERE id = ?', [id]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[admin] approve user error:', e);
    res.status(500).json({ error: 'Error al aprobar usuario' });
  }
});

module.exports = router;
// POST /api/admin/users/:id/promote - Asigna rol=admin a un usuario
router.post('/users/:id/promote', auth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const [result] = await db.query('UPDATE usuarios SET rol = ? WHERE id = ?', ['admin', id]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true, rol: 'admin' });
  } catch (e) {
    console.error('[admin] promote user error:', e);
    res.status(500).json({ error: 'Error al promover usuario' });
  }
});


