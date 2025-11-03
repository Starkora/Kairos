const Categoria = require('../../models/categoria');
const db = require('../../config/database'); // Asegúrate de requerir tu conexión a la base de datos

exports.getAll = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const plataforma = req.query.plataforma || req.body.plataforma;
  console.log('Usuario ID en getAll:', usuario_id); // Depuración
  console.log('Plataforma en getAll:', plataforma); // Depuración
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!plataforma) return res.status(400).json({ error: 'Falta campo plataforma en la consulta' });
  try {
    const rows = await Categoria.getAllByUsuario(usuario_id, plataforma);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getByTipo = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const plataforma = req.query.plataforma || req.body.plataforma;
  const tipo = req.params.tipo;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!plataforma) return res.status(400).json({ error: 'Falta campo plataforma en la consulta' });
  try {
    const rows = await Categoria.getByTipoAndUsuario(tipo, usuario_id, plataforma);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const { nombre, tipo, plataforma } = req.body;
  console.log('Datos recibidos en create:', { nombre, tipo, plataforma }); // Depuración
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!nombre || !tipo || !plataforma) return res.status(400).json({ error: 'Faltan campos requeridos (incluye plataforma)' });
  try {
    const result = await Categoria.create({ usuario_id, nombre, tipo, plataforma });
    res.status(201).json({ message: 'Categoría creada', id: result.id });
  } catch (err) {
    // Detectar errores comunes de MySQL (enum/truncation) y dar una indicación clara
    if (err && (err.code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(err.message || ''))) {
      return res.status(409).json({ code: 'DUPLICATE_CATEGORY', message: 'Ya existe una categoría con ese nombre.' });
    }
    // Error por valor no permitido en ENUM o truncación de campo
    if (err && (err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || /truncated|incorrect value for column/i.test(err.message || ''))) {
      return res.status(400).json({ code: 'INVALID_TYPE', message: 'El tipo proporcionado no es válido en la base de datos. Aplica la migración add_ahorro_to_categorias.sql para permitir el tipo "ahorro".' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const { nombre, tipo, plataforma } = req.body;
  const id = req.params.id;
  console.log('Datos recibidos en update:', { id, nombre, tipo, plataforma }); // Depuración
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!nombre || !tipo || !plataforma) return res.status(400).json({ error: 'Faltan campos requeridos (incluye plataforma)' });
  try {
    const result = await Categoria.update({ id, usuario_id, nombre, tipo, plataforma });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || /Duplicate entry/i.test(err.message || ''))) {
      return res.status(409).json({ code: 'DUPLICATE_CATEGORY', message: 'Ya existe una categoría con ese nombre.' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const id = req.params.id;
  console.log('Datos recibidos en delete:', { id }); // Depuración
  console.log('Usuario ID en delete:', usuario_id); // Depuración
  try {
    // Eliminar movimientos relacionados antes de eliminar la categoría
    await db.query('DELETE FROM movimientos WHERE categoria_id = ?', [id]);
    const result = await Categoria.delete({ id, usuario_id });
    console.log('Resultado de la consulta delete:', result); // Depuración
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    console.error('Error en delete:', err); // Depuración
    res.status(500).json({ error: err.message });
  }
};
