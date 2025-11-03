const db = require('../../config/database');
const Presupuesto = require('../../../models/presupuesto');

exports.listar = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const anio = Number(req.query.anio);
    const mes = Number(req.query.mes);
    if (!anio || !mes) return res.status(400).json({ error: 'Parámetros anio y mes requeridos' });
    const [rows] = await db.query('SELECT p.*, c.nombre AS categoria FROM presupuestos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.usuario_id = ? AND p.anio = ? AND p.mes = ?', [usuario_id, anio, mes]);
    // Gastado por categoría (egresos aplicados en el mes)
    const first = `${anio}-${String(mes).padStart(2,'0')}-01`;
    const last = new Date(anio, mes, 0).toISOString().slice(0,10);
    const [spent] = await db.query(
      `SELECT categoria_id, SUM(monto) AS gastado
       FROM movimientos
       WHERE usuario_id = ? AND tipo = 'egreso' AND applied = 1 AND DATE(fecha) BETWEEN ? AND ?
       GROUP BY categoria_id`,
      [usuario_id, first, last]
    );
    const spentMap = new Map((spent || []).map(r => [Number(r.categoria_id)||0, Number(r.gastado)||0]));
    const withUsage = (rows || []).map(r => ({ ...r, gastado: spentMap.get(Number(r.categoria_id)||0) || 0 }));
    res.json(withUsage);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener presupuestos' });
  }
};

exports.guardar = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { categoria_id, anio, mes, monto } = req.body || {};
    if (!categoria_id || !anio || !mes || monto === undefined) return res.status(400).json({ error: 'Faltan campos' });
    // Upsert por clave única
    const [result] = await db.query(
      `INSERT INTO presupuestos (usuario_id, categoria_id, anio, mes, monto)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monto = VALUES(monto)`,
      [usuario_id, categoria_id, anio, mes, monto]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo guardar el presupuesto' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    await db.query('DELETE FROM presupuestos WHERE id = ? AND usuario_id = ?', [id, usuario_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
};
