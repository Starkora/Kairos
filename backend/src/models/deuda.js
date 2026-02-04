const db = require('../../config/database');

const Deuda = {
  create: async (deuda) => {
    const [result] = await db.query(
      'INSERT INTO deudas (usuario_id, descripcion, monto_total, monto_pagado, fecha_inicio, fecha_vencimiento, pagada, plataforma) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [deuda.usuario_id, deuda.descripcion, deuda.monto_total, deuda.monto_pagado || 0, deuda.fecha_inicio, deuda.fecha_vencimiento, deuda.pagada || false, deuda.plataforma || 'web']
    );
    return { id: result.insertId, ...deuda };
  },
  findByUsuario: async (usuario_id, plataforma) => {
    const [rows] = await db.query('SELECT * FROM deudas WHERE usuario_id = ? AND plataforma = ?', [usuario_id, plataforma]);
    return rows;
  },
  markAsPaid: async (id) => {
    await db.query('UPDATE deudas SET pagada = TRUE WHERE id = ?', [id]);
  },
  delete: async (id) => {
    try {
      // Eliminar pagos asociados a la deuda
      await db.query('DELETE FROM pagos_deuda WHERE deuda_id = ?', [id]);
      // Eliminar la deuda
      await db.query('DELETE FROM deudas WHERE id = ?', [id]);
    } catch (err) {
      console.error('Error en delete:', err);
      throw err;
    }
  },
  registrarPago: async (deuda_id, monto, fecha) => {
    try {

      const insertPagoQuery = 'INSERT INTO pagos_deuda (deuda_id, monto, fecha) VALUES (?, ?, ?)';
      const updateDeudaQuery = 'UPDATE deudas SET monto_pagado = monto_pagado + ? WHERE id = ?';

      await db.query(insertPagoQuery, [deuda_id, monto, fecha]);

      await db.query(updateDeudaQuery, [monto, deuda_id]);
    } catch (err) {
      console.error('Error en registrarPago:', err); // Log de error
      throw err; // Relanzar el error para que el controlador lo maneje
    }
  },
  obtenerPagos: async (deuda_id) => {
    const [rows] = await db.query('SELECT * FROM pagos_deuda WHERE deuda_id = ?', [deuda_id]);
    return rows;
  },
  update: async (id, deuda) => {
    try {
      const [result] = await db.query(
        'UPDATE deudas SET descripcion = ?, monto_total = ?, fecha_inicio = ?, fecha_vencimiento = ? WHERE id = ?',
        [deuda.descripcion, deuda.monto_total, deuda.fecha_inicio, deuda.fecha_vencimiento, id]
      );
      return result.affectedRows > 0 ? { id, ...deuda } : null;
    } catch (err) {
      console.error('Error en update:', err);
      throw err;
    }
  },
};

module.exports = Deuda;
