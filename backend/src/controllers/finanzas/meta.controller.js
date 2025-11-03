const Meta = require('../../../models/meta');

exports.crearMeta = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const plataforma = req.body.plataforma;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!plataforma) return res.status(400).json({ error: 'Falta campo plataforma' });
  try {
    const meta = await Meta.create({ ...req.body, usuario_id, plataforma });
    res.status(201).json({ success: true, message: 'Meta agregada correctamente', meta });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la meta', details: err.message });
  }
  console.log('Datos recibidos en req.body:', req.body);
};

exports.obtenerMetas = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const plataforma = req.query.plataforma || req.body.plataforma;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!plataforma) return res.status(400).json({ error: 'Falta campo plataforma en la consulta' });
  try {
    const metas = await Meta.findByUsuario(usuario_id, plataforma);
    res.json(metas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener metas', details: err.message });
  }
};

exports.actualizarMontoAhorrado = async (req, res) => {
  try {
    await Meta.updateMontoAhorrado(req.params.id, req.body.monto_ahorrado);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar monto ahorrado', details: err.message });
  }
};

exports.marcarCumplida = async (req, res) => {
  try {
    await Meta.markAsCompleted(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar meta como cumplida', details: err.message });
  }
};

exports.eliminarMeta = async (req, res) => {
  try {
    await Meta.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar meta', details: err.message });
  }
};

// Registrar un aporte a meta
exports.registrarAporte = async (req, res) => {
  try {
    const { meta_id, monto, fecha } = req.body;
    await Meta.registrarAporte(meta_id, monto, fecha);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar aporte a meta', details: err.message });
  }
};

// Obtener aportes de una meta
exports.obtenerAportes = async (req, res) => {
  try {
    const aportes = await Meta.obtenerAportes(req.params.meta_id);
    res.json(aportes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener aportes de meta', details: err.message });
  }
};

exports.editarMeta = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  try {
    const meta = await Meta.update(req.params.id, { ...req.body, usuario_id });
    if (!meta) return res.status(404).json({ error: 'Meta no encontrada' });
    res.json({ success: true, meta, message: 'Meta actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al editar la meta', details: err.message });
  }
};
