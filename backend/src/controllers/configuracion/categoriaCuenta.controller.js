const CategoriaCuenta = require('../../models/categoriaCuenta');


exports.getAll = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  try {
    const results = await CategoriaCuenta.getAllByUsuario(usuario_id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías de cuenta' });
  }
};


exports.create = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const { nombre } = req.body;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const result = await CategoriaCuenta.create({ usuario_id, nombre });
    res.status(201).json(result);
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(err.message || ''))) {
      return res.status(409).json({ code: 'DUPLICATE_ACCOUNT_CATEGORY', message: 'Ya existe una categoría de cuenta con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al crear categoría de cuenta' });
  }
};


exports.update = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const { nombre } = req.body;
  const id = req.params.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const result = await CategoriaCuenta.update({ id, usuario_id, nombre });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoría de cuenta no encontrada' });
    res.json({ message: 'Categoría de cuenta actualizada' });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(err.message || ''))) {
      return res.status(409).json({ code: 'DUPLICATE_ACCOUNT_CATEGORY', message: 'Ya existe una categoría de cuenta con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al actualizar categoría de cuenta' });
  }
};


exports.delete = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const id = req.params.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  try {
    const result = await CategoriaCuenta.delete({ id, usuario_id });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoría de cuenta no encontrada' });
    res.json({ message: 'Categoría de cuenta eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar categoría de cuenta' });
  }
};
