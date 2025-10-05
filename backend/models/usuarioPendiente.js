const db = require('../db');

const UsuarioPendiente = {
  create: async (usuario) => {
    const [result] = await db.query(
      'INSERT INTO usuarios_pendientes (email, numero, nombre, apellido, password, codigo, metodo, expires, plataforma, resend_count, next_resend_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)',
      [usuario.email, usuario.numero, usuario.nombre, usuario.apellido || '', usuario.password, usuario.codigo, usuario.metodo, usuario.expires, usuario.plataforma || 'web']
    );
    return result;
  },
  findByEmailForVerify: async (email) => {
    const [results] = await db.query('SELECT email, numero, nombre, apellido, password, codigo, metodo, expires, plataforma, resend_count, next_resend_at FROM usuarios_pendientes WHERE email = ?', [email]);
    return results;
  },
  findByEmail: async (email) => {
    console.log('[Kairos][DEBUG][usuarioPendiente] Ejecutando SQL: SELECT * FROM usuarios_pendientes WHERE email = ?', email);
    const [results] = await db.query('SELECT * FROM usuarios_pendientes WHERE email = ?', [email]);
    console.log('[Kairos][DEBUG][usuarioPendiente] Resultados:', results);
    return results;
  },
  deleteByEmail: async (email) => {
    const [result] = await db.query('DELETE FROM usuarios_pendientes WHERE email = ?', [email]);
    return result;
  },
  updateResendState: async (email, resendCount, nextResendAt) => {
    const [result] = await db.query('UPDATE usuarios_pendientes SET resend_count = ?, next_resend_at = ? WHERE email = ?', [resendCount, nextResendAt, email]);
    return result;
  }
};

module.exports = UsuarioPendiente;
