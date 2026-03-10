const db = require('../../config/database');

const Cuenta = {
  getAllByUsuario: async (usuario_id, plataforma) => {
    const [rows] = await db.query('SELECT * FROM cuentas WHERE usuario_id = ? AND plataforma = ? AND estado = "activo" ORDER BY nombre', [usuario_id, plataforma]);
    return rows;
  },
  deleteById: async (id) => {
    // Soft delete: cambiar estado a 'eliminado' en lugar de DELETE físico
    const [result] = await db.query(
      'UPDATE cuentas SET estado = "eliminado", eliminado_en = NOW() WHERE id = ?', 
      [id]
    );
    return result;
  },
  create: async (data) => {
    const { usuario_id, nombre, saldo_inicial, tipo, plataforma, limite_credito, incluir_en_calculos } = data;
    
    // Si es tarjeta de crédito, usar lógica diferente
    const esTarjetaCredito = tipo && (tipo.toLowerCase().includes('tarjeta') || tipo.toLowerCase().includes('crédito'));
    
    // Por defecto, incluir en cálculos es true
    const incluirEnCalc = incluir_en_calculos !== undefined ? incluir_en_calculos : true;
    
    if (esTarjetaCredito && limite_credito) {
      // Para tarjetas de crédito: saldo_inicial = 0, limite_credito y saldo_disponible
      const [result] = await db.query(
        'INSERT INTO cuentas (usuario_id, nombre, saldo_inicial, saldo_actual, tipo, activa, plataforma, limite_credito, deuda_actual, saldo_disponible, incluir_en_calculos) VALUES (?, ?, 0, 0, ?, 1, ?, ?, 0, ?, ?)',
        [usuario_id, nombre, tipo, plataforma || 'web', limite_credito, limite_credito, incluirEnCalc]
      );
      return { id: result.insertId, nombre, esTarjetaCredito: true };
    } else {
      // Para cuentas normales
      const [result] = await db.query(
        'INSERT INTO cuentas (usuario_id, nombre, saldo_inicial, saldo_actual, tipo, activa, plataforma, incluir_en_calculos) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        [usuario_id, nombre, saldo_inicial, saldo_inicial, tipo, plataforma || 'web', incluirEnCalc]
      );
      return { id: result.insertId, nombre, esTarjetaCredito: false };
    }
  },
  update: async ({ id, usuario_id, nombre, tipo, plataforma, limite_credito, incluir_en_calculos }) => {
    // Verificar duplicado por nombre dentro del mismo usuario y plataforma
    if (!id || !usuario_id || !nombre || !tipo) {
      throw new Error('Faltan campos requeridos');
    }
    const plat = plataforma || 'web';
    const [dups] = await db.query(
      'SELECT id FROM cuentas WHERE usuario_id = ? AND plataforma = ? AND TRIM(LOWER(nombre)) = TRIM(LOWER(?)) AND id <> ? LIMIT 1',
      [usuario_id, plat, nombre, id]
    );
    if (dups.length > 0) {
      const err = new Error('NOMBRE_DUPLICADO');
      err.code = 'NOMBRE_DUPLICADO';
      throw err;
    }
    
    // Construir la query dinámicamente según los campos presentes
    let updateFields = ['nombre = ?', 'tipo = ?'];
    let updateValues = [nombre, tipo];
    
    if (limite_credito !== undefined) {
      updateFields.push('limite_credito = ?', 'saldo_disponible = ? - COALESCE(deuda_actual, 0)');
      updateValues.push(limite_credito, limite_credito);
    }
    
    if (incluir_en_calculos !== undefined) {
      updateFields.push('incluir_en_calculos = ?');
      updateValues.push(incluir_en_calculos);
    }
    
    updateValues.push(id, usuario_id);
    
    const [result] = await db.query(
      `UPDATE cuentas SET ${updateFields.join(', ')} WHERE id = ? AND usuario_id = ?`,
      updateValues
    );
    return result;
  },
  
  // Sincronizar deuda de tarjeta basándose en movimientos existentes
  sincronizarTarjeta: async (cuenta_id, usuario_id) => {
    // Verificar que la cuenta existe y pertenece al usuario
    const [cuentas] = await db.query(
      'SELECT id, tipo, limite_credito FROM cuentas WHERE id = ? AND usuario_id = ?',
      [cuenta_id, usuario_id]
    );
    
    if (!cuentas || cuentas.length === 0) {
      throw new Error('Cuenta no encontrada');
    }
    
    const cuenta = cuentas[0];
    const esTarjeta = cuenta.tipo && (cuenta.tipo.toLowerCase().includes('tarjeta') || cuenta.tipo.toLowerCase().includes('crédito'));
    
    if (!esTarjeta) {
      throw new Error('Esta cuenta no es una tarjeta de crédito');
    }
    
    if (!cuenta.limite_credito || cuenta.limite_credito === 0) {
      throw new Error('Primero debes configurar el límite de crédito de la tarjeta');
    }
    
    // Calcular deuda: sumar todos los egresos y restar todos los pagos (transferencias con "pago")
    const [movimientos] = await db.query(
      'SELECT tipo, monto, descripcion FROM movimientos WHERE cuenta_id = ? AND applied = 1 AND estado = "activo"',
      [cuenta_id]
    );
    
    let deuda = 0;
    movimientos.forEach(mov => {
      const tipo = (mov.tipo || '').toLowerCase();
      const desc = (mov.descripcion || '').toLowerCase();
      const monto = Number(mov.monto || 0);
      
      if (tipo === 'egreso') {
        // Gastos aumentan la deuda
        deuda += monto;
      } else if (tipo === 'transferencia' && (desc.includes('pago') || desc.includes('tarjeta'))) {
        // Pagos reducen la deuda
        deuda -= monto;
      }
    });
    
    // Asegurar que la deuda no sea negativa
    deuda = Math.max(0, deuda);
    const saldo_disponible = cuenta.limite_credito - deuda;
    
    // Actualizar la cuenta
    const [result] = await db.query(
      'UPDATE cuentas SET deuda_actual = ?, saldo_disponible = ? WHERE id = ?',
      [deuda, saldo_disponible, cuenta_id]
    );
    
    return { deuda_actual: deuda, saldo_disponible, limite_credito: cuenta.limite_credito };
  },
  
  // Obtener cuentas eliminadas (para papelera/recuperación)
  getDeletedByUsuario: async (usuario_id, plataforma) => {
    const [rows] = await db.query(
      'SELECT * FROM cuentas WHERE usuario_id = ? AND plataforma = ? AND estado = "eliminado" ORDER BY eliminado_en DESC',
      [usuario_id, plataforma]
    );
    return rows;
  },
  
  // Restaurar cuenta eliminada
  restore: async (id) => {
    const [result] = await db.query(
      'UPDATE cuentas SET estado = "activo", eliminado_en = NULL, eliminado_por = NULL WHERE id = ? AND estado = "eliminado"',
      [id]
    );
    if (result.affectedRows === 0) throw new Error('Cuenta no encontrada o no está eliminada');
    return result;
  }
};

module.exports = Cuenta;
