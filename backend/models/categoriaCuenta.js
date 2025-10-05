const db = require('../db');

const CategoriaCuenta = {
  getAllByUsuario: async (usuario_id) => {
    const [rows] = await db.query('SELECT * FROM categorias_cuenta WHERE usuario_id = ?', [usuario_id]);
    return rows;
  },
  create: async ({ usuario_id, nombre }) => {
    const [result] = await db.query('INSERT INTO categorias_cuenta (usuario_id, nombre) VALUES (?, ?)', [usuario_id, nombre]);
    return { id: result.insertId, usuario_id, nombre };
  },
  delete: async ({ id, usuario_id }) => {
    const [result] = await db.query('DELETE FROM categorias_cuenta WHERE id = ? AND usuario_id = ?', [id, usuario_id]);
    return result;
  },
  update: async ({ id, usuario_id, nombre }) => {
    const [result] = await db.query('UPDATE categorias_cuenta SET nombre = ? WHERE id = ? AND usuario_id = ?', [nombre, id, usuario_id]);
    return result;
  },
};

module.exports = CategoriaCuenta;
