const db = require('../../config/database');

const Transaccion = {
  getAllByUsuario: async (usuario_id, plataforma) => {
    const sql = `
      SELECT m.id, m.tipo, m.monto, m.descripcion, m.fecha, m.cuenta_id, m.categoria_id, m.icon, m.color, m.applied, c.nombre AS cuenta, cat.nombre AS categoria
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
    const { usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color } = data;
    const tipoNorm = (tipo || '').toLowerCase();
    // Decide si aplicar ahora: si fecha <= hoy (date only) aplicamos
    const todayStr = new Date().toISOString().slice(0,10);
    const fechaStr = String(fecha).slice(0,10);
    const applied = fechaStr <= todayStr ? 1 : 0;
    const [result] = await db.query(
      'INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color, applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usuario_id, cuenta_id, tipoNorm, monto, descripcion, fecha, categoria_id || null, plataforma || 'web', icon || null, color || null, applied]
    );
    // Actualizar saldo solo si se aplica de inmediato
    if (applied) {
      // Tratar 'ahorro' como ingreso (positivo)
      const isIngreso = tipoNorm === 'ingreso' || tipoNorm === 'ahorro';
      if (isIngreso) {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, cuenta_id]);
      } else {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [monto, cuenta_id]);
      }
    }
    return { insertId: result.insertId };
  },
  // Eliminar movimiento y revertir su efecto sobre la cuenta
  deleteById: async (id) => {
    if (!id) throw new Error('ID requerido');
    // Obtener movimiento
    const [rows] = await db.query('SELECT * FROM movimientos WHERE id = ?', [id]);
    if (!rows || rows.length === 0) throw new Error('Movimiento no encontrado');
    const mov = rows[0];
    const { cuenta_id, tipo, monto, applied } = mov;
    const tipoNorm = (tipo || '').toLowerCase();
    // Revertir efecto en la cuenta solo si estaba aplicado
    if (applied) {
      // Tratar 'ahorro' como ingreso (revertir como resto)
      const wasIngreso = tipoNorm === 'ingreso' || tipoNorm === 'ahorro';
      if (wasIngreso) {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [monto, cuenta_id]);
      } else {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, cuenta_id]);
      }
    }
    // Eliminar movimiento
    const [res] = await db.query('DELETE FROM movimientos WHERE id = ?', [id]);
    return res;
  },
  // Actualizar movimiento: revertir efecto anterior y aplicar el nuevo (maneja cambio de cuenta)
  update: async (data) => {
    const { id, usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma } = data;
    if (!id) throw new Error('ID requerido');
    // Normalizar tipo una sola vez para utilizarlo tanto en la lógica como en el UPDATE
    const tipoNorm = (tipo || '').toLowerCase();
    // Obtener movimiento anterior
    const [rows] = await db.query('SELECT * FROM movimientos WHERE id = ?', [id]);
    if (!rows || rows.length === 0) throw new Error('Movimiento no encontrado');
    const old = rows[0];
    // Revertir efecto del movimiento antiguo solo si estaba aplicado
    if (old.applied) {
      const oldTipoNorm = (old.tipo || '').toLowerCase();
      const wasIngreso = oldTipoNorm === 'ingreso' || oldTipoNorm === 'ahorro';
      if (wasIngreso) {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [old.monto, old.cuenta_id]);
      } else {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [old.monto, old.cuenta_id]);
      }
    }
    // Decidir si el nuevo movimiento debe aplicarse ahora
    const todayStr = new Date().toISOString().slice(0,10);
    const fechaStr = String(fecha).slice(0,10);
    const newApplied = fechaStr <= todayStr ? 1 : 0;
    // Aplicar efecto del nuevo movimiento solo si corresponde
    if (newApplied) {
      const isIngreso = tipoNorm === 'ingreso' || tipoNorm === 'ahorro';
      if (isIngreso) {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, cuenta_id]);
      } else {
        await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [monto, cuenta_id]);
      }
    }
    // Actualizar fila de movimientos
    const [res] = await db.query(
      'UPDATE movimientos SET cuenta_id = ?, tipo = ?, monto = ?, descripcion = ?, fecha = ?, categoria_id = ?, icon = ?, color = ?, applied = ? WHERE id = ?',
      [cuenta_id, tipoNorm, monto, descripcion, fecha, categoria_id || null, data.icon || null, data.color || null, newApplied, id]
    );
    return res;
  },
  // Aplicar movimientos pendientes cuya fecha haya llegado o pasado
  applyPendingMovements: async () => {
    const todayStr = new Date().toISOString().slice(0,10);
    const [rows] = await db.query('SELECT * FROM movimientos WHERE applied = 0 AND DATE(fecha) <= ?', [todayStr]);
    for (const mov of rows) {
      try {
        const tipoNorm = (mov.tipo || '').toLowerCase();
        const isIngreso = tipoNorm === 'ingreso' || tipoNorm === 'ahorro';
        if (isIngreso) {
          await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [mov.monto, mov.cuenta_id]);
        } else {
          await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [mov.monto, mov.cuenta_id]);
        }
        await db.query('UPDATE movimientos SET applied = 1 WHERE id = ?', [mov.id]);
      } catch (e) {
        console.error('[applyPendingMovements] Error aplicando movimiento', mov.id, e.message);
      }
    }
    return rows.length;
  }
};

module.exports = Transaccion;
