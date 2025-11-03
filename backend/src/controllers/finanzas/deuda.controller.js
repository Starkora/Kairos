const Deuda = require('../models/deuda');

exports.crearDeuda = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const plataforma = req.body.plataforma;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!plataforma) return res.status(400).json({ error: 'Falta campo plataforma' });
  try {
    const deuda = await Deuda.create({ ...req.body, usuario_id, plataforma });
    res.status(201).json({ success: true, deuda, message: 'Deuda agregada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la deuda', details: err.message });
  }
};

exports.obtenerDeudas = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const plataforma = req.query.plataforma || req.body.plataforma;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!plataforma) return res.status(400).json({ error: 'Falta campo plataforma en la consulta' });
  try {
    const deudas = await Deuda.findByUsuario(usuario_id, plataforma);
    res.json(deudas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener deudas', details: err.message });
  }
};

exports.marcarPagada = async (req, res) => {
  try {
    await Deuda.markAsPaid(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar deuda como pagada', details: err.message });
  }
};

exports.eliminarDeuda = async (req, res) => {
  try {
    console.log('Intentando eliminar deuda con ID:', req.params.id); // Log para depuración
    await Deuda.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar deuda:', err); // Log de error
    res.status(500).json({ error: 'Error al eliminar deuda', details: err.message });
  }
};

// Registrar un pago de deuda
exports.registrarPago = async (req, res) => {
  try {
    const { deuda_id, monto, fecha } = req.body;

    // Validar datos
    if (!deuda_id || !monto || isNaN(monto)) {
      return res.status(400).json({ error: 'Datos inválidos: deuda_id y monto son requeridos y deben ser válidos.' });
    }

    console.log('Datos recibidos para registrar pago:', { deuda_id, monto, fecha });

    // Registrar pago
    await Deuda.registrarPago(deuda_id, monto, fecha);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al registrar pago de deuda:', err);
    res.status(500).json({ error: 'Error al registrar pago de deuda', details: err.message });
  }
};

// Obtener pagos de una deuda
exports.obtenerPagos = async (req, res) => {
  try {
    const pagos = await Deuda.obtenerPagos(req.params.deuda_id);
    res.json(pagos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pagos de deuda', details: err.message });
  }
};

exports.editarDeuda = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  try {
    const deuda = await Deuda.update(req.params.id, { ...req.body, usuario_id });
    if (!deuda) return res.status(404).json({ error: 'Deuda no encontrada' });
    res.json({ success: true, deuda, message: 'Deuda actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al editar la deuda', details: err.message });
  }
};
