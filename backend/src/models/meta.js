const db = require('../../config/database');

const Meta = {
  create: async (meta) => {
    const [result] = await db.query(
      'INSERT INTO metas (usuario_id, descripcion, monto_objetivo, monto_ahorrado, fecha_inicio, fecha_objetivo, cumplida, plataforma) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [meta.usuario_id, meta.descripcion, meta.monto_objetivo, meta.monto_ahorrado || 0, meta.fecha_inicio, meta.fecha_objetivo, meta.cumplida || false, meta.plataforma || 'web']
    );
    return { id: result.insertId, ...meta };
  },
  findByUsuario: async (usuario_id, plataforma) => {
    const [rows] = await db.query('SELECT * FROM metas WHERE usuario_id = ? AND plataforma = ?', [usuario_id, plataforma]);
    return rows;
  },
  updateMontoAhorrado: async (id, monto_ahorrado) => {
    await db.query('UPDATE metas SET monto_ahorrado = ? WHERE id = ?', [monto_ahorrado, id]);
  },
  markAsCompleted: async (id) => {
    await db.query('UPDATE metas SET cumplida = TRUE WHERE id = ?', [id]);
  },
  delete: async (id) => {
    try {
      // Eliminar aportes asociados a la meta
      await db.query('DELETE FROM aportes_meta WHERE meta_id = ?', [id]);
      // Eliminar la meta
      await db.query('DELETE FROM metas WHERE id = ?', [id]);
    } catch (err) {
      console.error('Error en delete:', err);
      throw err;
    }
  },
  registrarAporte: async (meta_id, monto, fecha) => {
    await db.query('INSERT INTO aportes_meta (meta_id, monto, fecha) VALUES (?, ?, ?)', [meta_id, monto, fecha]);
    await db.query('UPDATE metas SET monto_ahorrado = monto_ahorrado + ? WHERE id = ?', [monto, meta_id]);
  },
  obtenerAportes: async (meta_id) => {
    const [rows] = await db.query('SELECT * FROM aportes_meta WHERE meta_id = ?', [meta_id]);
    return rows;
  },
  update: async (id, meta) => {
    try {
      const [result] = await db.query(
        'UPDATE metas SET descripcion = ?, monto_objetivo = ?, fecha_inicio = ?, fecha_objetivo = ? WHERE id = ?',
        [meta.descripcion, meta.monto_objetivo, meta.fecha_inicio, meta.fecha_objetivo, id]
      );
      return result.affectedRows > 0 ? { id, ...meta } : null;
    } catch (err) {
      console.error('Error en update:', err);
      throw err;
    }
  },
};

module.exports = Meta;
