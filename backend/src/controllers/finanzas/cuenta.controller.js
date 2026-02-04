exports.create = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const { nombre, saldo_inicial, tipo, plataforma } = req.body;

  if (!nombre || saldo_inicial === undefined || !tipo || !plataforma) {
    console.error('Datos inválidos en create:', { nombre, saldo_inicial, tipo, plataforma }); // Depuración
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    const result = await Cuenta.create({ usuario_id, nombre, saldo_inicial, tipo, plataforma });
    res.status(201).json({ message: 'Cuenta creada', id: result.id });
  } catch (err) {
    console.error('Error al crear cuenta:', err.message); // Depuración
    res.status(500).json({ error: err.message });
  }
};
const Cuenta = require('../../models/cuenta');

exports.getAll = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const plataforma = req.query.plataforma || req.body.plataforma;

  if (!plataforma) {
    console.error('Plataforma faltante en getAll:', plataforma); // Depuración
    return res.status(400).json({ error: 'Falta campo plataforma en la consulta' });
  }

  try {
    const rows = await Cuenta.getAllByUsuario(usuario_id, plataforma);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener cuentas:', err.message); // Depuración
    res.status(500).json({ error: err.message });
  }
};

exports.deleteById = async (req, res) => {
  const id = Number(req.params.id);
  const usuario_id = req.user && req.user.id;
  const cascade = String(req.query.cascade || '').toLowerCase() === 'true' || req.body?.cascade === true;

  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const db = require('../../../config/database');
  try {
    // 1) Verificar que la cuenta pertenezca al usuario
    const [owns] = await db.query('SELECT id FROM cuentas WHERE id = ? AND usuario_id = ? LIMIT 1', [id, usuario_id]);
    if (!owns || owns.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    // 2) Verificar si hay movimientos asociados
    const [movs] = await db.query('SELECT COUNT(*) AS total FROM movimientos WHERE cuenta_id = ?', [id]);
    const total = (movs && movs[0] && Number(movs[0].total)) || 0;
    if (total > 0 && !cascade) {
      return res.status(409).json({ code: 'ACCOUNT_HAS_MOVEMENTS', message: 'La cuenta tiene movimientos registrados', count: total });
    }

    // 3) Si cascade=true, eliminar movimientos primero dentro de una transacción
    if (total > 0 && cascade) {
      await db.query('START TRANSACTION');
      try {
        await db.query('DELETE FROM movimientos WHERE cuenta_id = ?', [id]);
        await db.query('DELETE FROM cuentas WHERE id = ?', [id]);
        await db.query('COMMIT');
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }
      return res.json({ message: 'Cuenta y movimientos eliminados', deletedMovements: total });
    }

    // 4) Sin movimientos, eliminar normalmente
    await Cuenta.deleteById(id);
    return res.json({ message: 'Cuenta eliminada' });
  } catch (err) {
    console.error('Error al eliminar cuenta:', err && err.message);
    return res.status(500).json({ error: err.message || 'Error al eliminar cuenta' });
  }
};

// Actualizar nombre y tipo de una cuenta
exports.update = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const id = req.params.id;
  const { nombre, tipo, plataforma } = req.body;

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
