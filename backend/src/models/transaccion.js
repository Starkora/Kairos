const db = require('../../config/database');

// Helper para verificar si una cuenta es tarjeta de crédito
const esTarjetaCredito = async (cuenta_id) => {
  const [rows] = await db.query('SELECT tipo FROM cuentas WHERE id = ?', [cuenta_id]);
  if (!rows || rows.length === 0) return false;
  const tipo = rows[0].tipo || '';
  return tipo.toLowerCase().includes('tarjeta') || tipo.toLowerCase().includes('crédito');
};

// Helper para actualizar saldo de cuenta normal o tarjeta de crédito
const actualizarSaldo = async (cuenta_id, monto, esIngreso, esPagoTarjeta = false) => {
  const isTarjeta = await esTarjetaCredito(cuenta_id);
  
  if (isTarjeta) {
    if (esPagoTarjeta) {
      // Pago de tarjeta: reduce deuda, aumenta disponible
      await db.query(
        'UPDATE cuentas SET deuda_actual = GREATEST(0, deuda_actual - ?), saldo_disponible = limite_credito - GREATEST(0, deuda_actual - ?) WHERE id = ?',
        [monto, monto, cuenta_id]
      );
    } else if (!esIngreso) {
      // Gasto con tarjeta: aumenta deuda, reduce disponible
      await db.query(
        'UPDATE cuentas SET deuda_actual = deuda_actual + ?, saldo_disponible = limite_credito - (deuda_actual + ?) WHERE id = ?',
        [monto, monto, cuenta_id]
      );
    }
    // Ingresos no se registran en tarjetas de crédito
  } else {
    // Cuenta normal
    if (esIngreso) {
      await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, cuenta_id]);
    } else {
      await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [monto, cuenta_id]);
    }
  }
};

const Transaccion = {
  getAllByUsuario: async (usuario_id, plataforma) => {
    const sql = `
      SELECT m.id, m.tipo, m.monto, m.descripcion, m.fecha, m.cuenta_id, m.categoria_id, m.icon, m.color, m.applied, c.nombre AS cuenta, cat.nombre AS categoria
      FROM movimientos m
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN categorias cat ON m.categoria_id = cat.id
      WHERE m.usuario_id = ? AND m.plataforma = ? AND m.estado = 'activo' AND c.estado = 'activo'
      ORDER BY m.fecha DESC, m.id DESC
    `;
    const [rows] = await db.query(sql, [usuario_id, plataforma]);
    return rows;
  },
  create: async (data) => {
    const { usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color } = data;
    const tipoNorm = (tipo || '').toLowerCase();
    const desc = (descripcion || '').toLowerCase();
    
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
      // Para ahorros, distinguir entre origen (egreso) y destino (ingreso) por descripción
      let isIngreso = tipoNorm === 'ingreso';
      if (tipoNorm === 'ahorro') {
        isIngreso = desc.includes('ahorro desde');  // Solo es ingreso si es el destino
      }
      const esPagoTarjeta = tipoNorm === 'transferencia' && (desc.includes('pago') || desc.includes('tarjeta'));
      await actualizarSaldo(cuenta_id, monto, isIngreso, esPagoTarjeta);
    }
    
    return { insertId: result.insertId };
  },
  // Eliminar movimiento (soft delete) y revertir su efecto sobre la cuenta
  deleteById: async (id) => {
    if (!id) throw new Error('ID requerido');
    // Obtener movimiento
    const [rows] = await db.query('SELECT * FROM movimientos WHERE id = ? AND estado = "activo"', [id]);
    if (!rows || rows.length === 0) throw new Error('Movimiento no encontrado');
    const mov = rows[0];
    const { cuenta_id, tipo, monto, applied, descripcion } = mov;
    const tipoNorm = (tipo || '').toLowerCase();
    const desc = (descripcion || '').toLowerCase();
    
    // Revertir efecto en la cuenta solo si estaba aplicado
    if (applied) {
      const isTarjeta = await esTarjetaCredito(cuenta_id);
      
      // Para ahorros, distinguir entre origen (egreso) y destino (ingreso) por descripción
      let wasIngreso = tipoNorm === 'ingreso';
      if (tipoNorm === 'ahorro') {
        // "Ahorro para X" = origen (egreso, se restó) → al eliminar debe SUMAR
        // "Ahorro desde Y" = destino (ingreso, se sumó) → al eliminar debe RESTAR
        wasIngreso = desc.includes('ahorro desde');  // Solo es ingreso si es el destino
      }
      
      const wasPagoTarjeta = tipoNorm === 'pago_tarjeta';
      
      if (wasPagoTarjeta) {
        // Revertir pago de tarjeta
        if (isTarjeta) {
          // Si la cuenta es tarjeta: aumentar deuda de nuevo (se le había pagado)
          await db.query(
            'UPDATE cuentas SET deuda_actual = deuda_actual + ?, saldo_disponible = limite_credito - (deuda_actual + ?) WHERE id = ?',
            [monto, monto, cuenta_id]
          );
        } else {
          // Si la cuenta es normal: devolver el dinero (se había restado)
          await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, cuenta_id]);
        }
      } else if (isTarjeta) {
        const wasPagoTarjetaOld = tipoNorm === 'transferencia' && (desc.includes('pago') || desc.includes('tarjeta'));
        if (wasPagoTarjetaOld) {
          // Revertir pago antigua forma: aumenta deuda de nuevo
          await db.query(
            'UPDATE cuentas SET deuda_actual = deuda_actual + ?, saldo_disponible = limite_credito - (deuda_actual + ?) WHERE id = ?',
            [monto, monto, cuenta_id]
          );
        } else if (!wasIngreso) {
          // Revertir gasto: reduce deuda
          await db.query(
            'UPDATE cuentas SET deuda_actual = GREATEST(0, deuda_actual - ?), saldo_disponible = limite_credito - GREATEST(0, deuda_actual - ?) WHERE id = ?',
            [monto, monto, cuenta_id]
          );
        }
      } else {
        // Cuenta normal
        if (wasIngreso) {
          // Si fue ingreso: al eliminar se RESTA
          await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [monto, cuenta_id]);
        } else {
          // Si fue egreso: al eliminar se SUMA
          await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, cuenta_id]);
        }
      }
    }
    // Soft delete: cambiar estado a 'eliminado' en lugar de DELETE físico
    const [res] = await db.query(
      'UPDATE movimientos SET estado = "eliminado", eliminado_en = NOW() WHERE id = ?', 
      [id]
    );
    return res;
  },
  // Actualizar movimiento: revertir efecto anterior y aplicar el nuevo (maneja cambio de cuenta)
  update: async (data) => {
    const { id, usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma } = data;
    if (!id) throw new Error('ID requerido');
    const tipoNorm = (tipo || '').toLowerCase();
    const desc = (descripcion || '').toLowerCase();
    
    // Obtener movimiento anterior
    const [rows] = await db.query('SELECT * FROM movimientos WHERE id = ? AND estado = "activo"', [id]);
    if (!rows || rows.length === 0) throw new Error('Movimiento no encontrado');
    const old = rows[0];
    
    // Revertir efecto del movimiento antiguo solo si estaba aplicado
    if (old.applied) {
      const oldTipoNorm = (old.tipo || '').toLowerCase();
      const oldDesc = (old.descripcion || '').toLowerCase();
      
      // Para ahorros, distinguir entre origen y destino por descripción
      let wasIngreso = oldTipoNorm === 'ingreso';
      if (oldTipoNorm === 'ahorro') {
        wasIngreso = oldDesc.includes('ahorro desde');  // Solo es ingreso si es el destino
      }
      
      const wasPagoTarjeta = oldTipoNorm === 'transferencia' && (oldDesc.includes('pago') || oldDesc.includes('tarjeta'));
      const isTarjeta = await esTarjetaCredito(old.cuenta_id);
      
      if (isTarjeta) {
        if (wasPagoTarjeta) {
          // Revertir pago: aumenta deuda
          await db.query(
            'UPDATE cuentas SET deuda_actual = deuda_actual + ?, saldo_disponible = limite_credito - (deuda_actual + ?) WHERE id = ?',
            [old.monto, old.monto, old.cuenta_id]
          );
        } else if (!wasIngreso) {
          // Revertir gasto: reduce deuda
          await db.query(
            'UPDATE cuentas SET deuda_actual = GREATEST(0, deuda_actual - ?), saldo_disponible = limite_credito - GREATEST(0, deuda_actual - ?) WHERE id = ?',
            [old.monto, old.monto, old.cuenta_id]
          );
        }
      } else {
        if (wasIngreso) {
          await db.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [old.monto, old.cuenta_id]);
        } else {
          await db.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [old.monto, old.cuenta_id]);
        }
      }
    }
    
    // Decidir si el nuevo movimiento debe aplicarse ahora
    const todayStr = new Date().toISOString().slice(0,10);
    const fechaStr = String(fecha).slice(0,10);
    const newApplied = fechaStr <= todayStr ? 1 : 0;
    
    // Aplicar efecto del nuevo movimiento solo si corresponde
    if (newApplied) {
      // Para ahorros, distinguir entre origen (egreso) y destino (ingreso) por descripción
      let isIngreso = tipoNorm === 'ingreso';
      if (tipoNorm === 'ahorro') {
        isIngreso = desc.includes('ahorro desde');  // Solo es ingreso si es el destino
      }
      const esPagoTarjeta = tipoNorm === 'transferencia' && (desc.includes('pago') || desc.includes('tarjeta'));
      await actualizarSaldo(cuenta_id, monto, isIngreso, esPagoTarjeta);
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
    const [rows] = await db.query('SELECT * FROM movimientos WHERE applied = 0 AND DATE(fecha) <= ? AND estado = "activo"', [todayStr]);
    for (const mov of rows) {
      try {
        const tipoNorm = (mov.tipo || '').toLowerCase();
        const desc = (mov.descripcion || '').toLowerCase();
        // Para ahorros, distinguir entre origen (egreso) y destino (ingreso) por descripción
        let isIngreso = tipoNorm === 'ingreso';
        if (tipoNorm === 'ahorro') {
          isIngreso = desc.includes('ahorro desde');  // Solo es ingreso si es el destino
        }
        const esPagoTarjeta = tipoNorm === 'transferencia' && (desc.includes('pago') || desc.includes('tarjeta'));
        
        await actualizarSaldo(mov.cuenta_id, mov.monto, isIngreso, esPagoTarjeta);
        await db.query('UPDATE movimientos SET applied = 1 WHERE id = ?', [mov.id]);
      } catch (e) {
        console.error('Error applying movement:', e);
      }
    }
    return rows.length;
  },
  
  // Obtener movimientos eliminados (para papelera/recuperación)
  getDeletedByUsuario: async (usuario_id, plataforma) => {
    const sql = `
      SELECT m.id, m.tipo, m.monto, m.descripcion, m.fecha, m.cuenta_id, m.categoria_id, 
             m.icon, m.color, m.applied, m.eliminado_en, c.nombre AS cuenta, cat.nombre AS categoria
      FROM movimientos m
      LEFT JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN categorias cat ON m.categoria_id = cat.id
      WHERE m.usuario_id = ? AND m.plataforma = ? AND m.estado = 'eliminado'
      ORDER BY m.eliminado_en DESC, m.id DESC
    `;
    const [rows] = await db.query(sql, [usuario_id, plataforma]);
    return rows;
  },
  
  // Restaurar movimiento eliminado
  restore: async (id) => {
    if (!id) throw new Error('ID requerido');
    const [result] = await db.query(
      'UPDATE movimientos SET estado = "activo", eliminado_en = NULL, eliminado_por = NULL WHERE id = ? AND estado = "eliminado"',
      [id]
    );
    if (result.affectedRows === 0) throw new Error('Movimiento no encontrado o no está eliminado');
    return result;
  },
  
  // Eliminar permanentemente (físico)
  permanentDelete: async (id) => {
    if (!id) throw new Error('ID requerido');
    const [result] = await db.query('DELETE FROM movimientos WHERE id = ? AND estado = "eliminado"', [id]);
    if (result.affectedRows === 0) throw new Error('Movimiento no encontrado o no está eliminado');
    return result;
  }
};

module.exports = Transaccion;
