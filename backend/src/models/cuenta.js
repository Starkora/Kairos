const db = require('../../config/database');

const Cuenta = {
  getAllByUsuario: async (usuario_id, plataforma) => {
    const [rows] = await db.query('SELECT * FROM cuentas WHERE usuario_id = ? AND plataforma = ? ORDER BY nombre', [usuario_id, plataforma]);
    return rows;
  },
  deleteById: async (id) => {
    const [result] = await db.query('DELETE FROM cuentas WHERE id = ?', [id]);
    return result;
  },
  create: async (data) => {
    const { usuario_id, nombre, saldo_inicial, tipo, plataforma, limite_credito } = data;
    
    // Si es tarjeta de crédito, usar lógica diferente
    const esTarjetaCredito = tipo && (tipo.toLowerCase().includes('tarjeta') || tipo.toLowerCase().includes('crédito'));
    
    if (esTarjetaCredito && limite_credito) {
      // Para tarjetas de crédito: saldo_inicial = 0, limite_credito y saldo_disponible
      const [result] = await db.query(
        'INSERT INTO cuentas (usuario_id, nombre, saldo_inicial, saldo_actual, tipo, activa, plataforma, limite_credito, deuda_actual, saldo_disponible) VALUES (?, ?, 0, 0, ?, 1, ?, ?, 0, ?)',
        [usuario_id, nombre, tipo, plataforma || 'web', limite_credito, limite_credito]
      );
      return { id: result.insertId, nombre, esTarjetaCredito: true };
    } else {
      // Para cuentas normales
      const [result] = await db.query(
        'INSERT INTO cuentas (usuario_id, nombre, saldo_inicial, saldo_actual, tipo, activa, plataforma) VALUES (?, ?, ?, ?, ?, 1, ?)',
        [usuario_id, nombre, saldo_inicial, saldo_inicial, tipo, plataforma || 'web']
      );
      return { id: result.insertId, nombre, esTarjetaCredito: false };
    }
  },
  update: async ({ id, usuario_id, nombre, tipo, plataforma, limite_credito }) => {
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
    
    // Si se proporciona límite de crédito, actualizarlo también
    if (limite_credito !== undefined) {
      const [result] = await db.query(
        'UPDATE cuentas SET nombre = ?, tipo = ?, limite_credito = ?, saldo_disponible = ? - COALESCE(deuda_actual, 0) WHERE id = ? AND usuario_id = ?',
        [nombre, tipo, limite_credito, limite_credito, id, usuario_id]
      );
      return result;
    }
    
    const [result] = await db.query('UPDATE cuentas SET nombre = ?, tipo = ? WHERE id = ? AND usuario_id = ?', [nombre, tipo, id, usuario_id]);
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
      'SELECT tipo, monto, descripcion FROM movimientos WHERE cuenta_id = ? AND applied = 1',
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
  }
};

module.exports = Cuenta;
