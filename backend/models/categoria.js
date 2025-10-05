const db = require('../db');

const Categoria = {
  getAllByUsuario: async (usuario_id, plataforma) => {
    const [rows] = await db.query('SELECT * FROM categorias WHERE usuario_id = ? AND plataforma = ? ORDER BY nombre', [usuario_id, plataforma]);
    return rows;
  },
  getByTipoAndUsuario: async (tipo, usuario_id, plataforma) => {
    const [rows] = await db.query('SELECT * FROM categorias WHERE tipo = ? AND usuario_id = ? AND plataforma = ? ORDER BY nombre', [tipo, usuario_id, plataforma]);
    return rows;
  },
  create: async (data) => {
    const { usuario_id, nombre, tipo, plataforma } = data;
    const [result] = await db.query('INSERT INTO categorias (usuario_id, nombre, tipo, plataforma) VALUES (?, ?, ?, ?)', [usuario_id, nombre, tipo, plataforma || 'web']);
    return { id: result.insertId, nombre, tipo };
  },
  update: async (data) => {
    const { id, usuario_id, nombre, tipo, plataforma } = data;
    const [result] = await db.query(
      'UPDATE categorias SET nombre = ?, tipo = ?, plataforma = ? WHERE id = ? AND usuario_id = ?',
      [nombre, tipo, plataforma, id, usuario_id]
    );
    return result;
  },
  delete: async (data) => {
    const { id, usuario_id } = data;
    const [result] = await db.query(
      'DELETE FROM categorias WHERE id = ? AND usuario_id = ?',
      [id, usuario_id]
    );
    return result;
  }
};

module.exports = Categoria;
