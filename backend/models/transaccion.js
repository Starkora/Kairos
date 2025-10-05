const db = require('../db');

const Transaccion = {
  getAllByUsuario: async (usuario_id, plataforma) => {
    const sql = `
      SELECT m.id, m.tipo, m.monto, m.descripcion, m.fecha, c.nombre AS cuenta, cat.nombre AS categoria
      FROM movimientos m
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN categorias cat ON m.categoria_id = cat.id
      WHERE m.usuario_id = ? AND m.plataforma = ?
      ORDER BY m.fecha DESC, m.id DESC
    `;
    const [rows] = await db.query(sql, [usuario_id, plataforma]);
    return rows;
  },
  create: async (data) => {
    const { usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma } = data;
    const [result] = await db.query(
      'INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id || null, plataforma || 'web']
    );
    // Actualizar saldo de la cuenta
    const signo = tipo === 'ingreso' ? '+' : '-';
    await db.query(
      `UPDATE cuentas SET saldo_actual = saldo_actual ${signo} ? WHERE id = ?`,
      [monto, cuenta_id]
    );
    return { insertId: result.insertId };
  },
};

module.exports = Transaccion;
