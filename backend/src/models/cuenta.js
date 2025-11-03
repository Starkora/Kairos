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
    const { usuario_id, nombre, saldo_inicial, tipo, plataforma } = data;
    const [result] = await db.query('INSERT INTO cuentas (usuario_id, nombre, saldo_inicial, saldo_actual, tipo, activa, plataforma) VALUES (?, ?, ?, ?, ?, 1, ?)', [usuario_id, nombre, saldo_inicial, saldo_inicial, tipo, plataforma || 'web']);
    return { id: result.insertId, nombre };
  },
  update: async ({ id, usuario_id, nombre, tipo, plataforma }) => {
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
    const [result] = await db.query('UPDATE cuentas SET nombre = ?, tipo = ? WHERE id = ? AND usuario_id = ?', [nombre, tipo, id, usuario_id]);
    return result;
  }
};

module.exports = Cuenta;
