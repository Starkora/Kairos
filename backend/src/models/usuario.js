const db = require('../../config/database');

const Usuario = {
  create: async (usuario) => {
    const [result] = await db.query(
      'INSERT INTO usuarios (email, numero, password, verificado, plataforma, nombre, apellido, rol, aprobado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        usuario.email,
        usuario.numero,
        usuario.password,
        usuario.verificado,
        usuario.plataforma || 'web',
        usuario.nombre || '',
        usuario.apellido || '',
        usuario.rol || 'user',
        typeof usuario.aprobado === 'number' ? usuario.aprobado : 0,
      ]
    );
    return { id: result.insertId };
  },
  findByEmail: async (email) => {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows;
  },
  findByEmailAndPlataforma: async (email, plataforma) => {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ? AND plataforma = ?', [email, plataforma]);
    return rows;
  },
  findByNumero: async (numero) => {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE numero = ?', [numero]);
    return rows;
  },
  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    return rows;
  },
  verify: async (id) => {
    await db.query('UPDATE usuarios SET verificado = 1 WHERE id = ?', [id]);
  },
  updatePassword: async (email, newPassword) => {
    await db.query('UPDATE usuarios SET password = ? WHERE email = ?', [newPassword, email]);
  }
};

module.exports = Usuario;
