exports.create = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const { nombre, saldo_inicial, tipo, plataforma } = req.body;

  console.log('Datos recibidos en create:', { nombre, saldo_inicial, tipo, plataforma }); // Depuración

  if (!nombre || saldo_inicial === undefined || !tipo || !plataforma) {
    console.error('Datos inválidos en create:', { nombre, saldo_inicial, tipo, plataforma }); // Depuración
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    const result = await Cuenta.create({ usuario_id, nombre, saldo_inicial, tipo, plataforma });
    console.log('Cuenta creada:', result); // Depuración
    res.status(201).json({ message: 'Cuenta creada', id: result.id });
  } catch (err) {
    console.error('Error al crear cuenta:', err.message); // Depuración
    res.status(500).json({ error: err.message });
  }
};
const Cuenta = require('../models/cuenta');

exports.getAll = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const plataforma = req.query.plataforma || req.body.plataforma;

  console.log('Usuario ID en getAll:', usuario_id); // Depuración
  console.log('Plataforma en getAll:', plataforma); // Depuración

  if (!plataforma) {
    console.error('Plataforma faltante en getAll:', plataforma); // Depuración
    return res.status(400).json({ error: 'Falta campo plataforma en la consulta' });
  }

  try {
    const rows = await Cuenta.getAllByUsuario(usuario_id, plataforma);
    console.log('Cuentas obtenidas:', rows); // Depuración
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener cuentas:', err.message); // Depuración
    res.status(500).json({ error: err.message });
  }
};

exports.deleteById = async (req, res) => {
  const id = req.params.id;
  const usuario_id = req.user && req.user.id;

  console.log('ID recibido para eliminar:', id); // Depuración
  console.log('Usuario autenticado:', usuario_id); // Depuración

  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });

  try {
    await Cuenta.deleteById(id);
    console.log('Cuenta eliminada:', id); // Depuración
    res.json({ message: 'Cuenta eliminada' });
  } catch (err) {
    console.error('Error al eliminar cuenta:', err.message); // Depuración
    res.status(500).json({ error: err.message });
  }
};

// Actualizar nombre y tipo de una cuenta
exports.update = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const id = req.params.id;
  const { nombre, tipo, plataforma } = req.body;

  console.log('Datos recibidos en update cuenta:', { id, nombre, tipo, plataforma });

  if (!id || !nombre || !tipo) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    await Cuenta.update({ id, usuario_id, nombre: nombre.trim(), tipo: tipo.trim(), plataforma });
    res.json({ message: 'Cuenta actualizada' });
  } catch (err) {
    console.error('Error al actualizar cuenta:', err.message);
    if (err.code === 'NOMBRE_DUPLICADO' || err.message === 'NOMBRE_DUPLICADO') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese nombre' });
    }
    res.status(500).json({ error: err.message });
  }
};
