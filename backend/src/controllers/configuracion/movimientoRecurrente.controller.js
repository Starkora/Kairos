// Editar movimiento recurrente
exports.editar = async (req, res) => {
  try {
    const id = req.params.id;
    const usuario_id = req.user.id;
    const movimiento = await MovimientoRecurrente.findOne({ where: { id, usuario_id } });
    if (!movimiento) return res.status(404).json({ error: 'Movimiento recurrente no encontrado.' });
    await movimiento.update(req.body);
    res.json(movimiento);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo editar el movimiento recurrente.' });
  }
};

// Eliminar movimiento recurrente
exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const usuario_id = req.user.id;
    const movimiento = await MovimientoRecurrente.findOne({ where: { id, usuario_id } });
    if (!movimiento) return res.status(404).json({ error: 'Movimiento recurrente no encontrado.' });
    await movimiento.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar el movimiento recurrente.' });
  }
};
const MovimientoRecurrente = require('../../../models/movimientoRecurrente');
const MovimientoRecurrenteExcepcion = require('../../../models/movimientoRecurrenteExcepcion');
const Transaccion = require('../../../models/transaccion');

// Crear movimiento recurrente
exports.crear = async (req, res) => {
  try {
    let { cuenta_id, tipo, monto, descripcion, categoria_id, icon, color, frecuencia, inicio, fin, indefinido } = req.body;
    const usuario_id = req.user.id; // Asume que el usuario está en req.user
    // Normalizar tipos
    monto = Number(monto);
    indefinido = (indefinido === true || indefinido === 'true' || indefinido === 1 || indefinido === '1') ? true : false;
    // Crear registro
    const nuevo = await MovimientoRecurrente.create({
      cuenta_id, tipo, monto, descripcion, categoria_id, icon, color, frecuencia, inicio, fin, indefinido, usuario_id
    });
    // Si la fecha de inicio es hoy o ya pasó, materializar el movimiento de HOY para que afecte el saldo
    try {
      const todayStr = new Date().toISOString().slice(0,10);
      const inicioStr = String(inicio).slice(0,10);
      if (inicioStr <= todayStr) {
        await Transaccion.create({
          usuario_id,
          cuenta_id,
          tipo,
          monto,
          descripcion: (descripcion || '').trim() ? `${descripcion} [RECURRENTE#${nuevo.id}]` : `[RECURRENTE#${nuevo.id}]`,
          fecha: inicioStr,
          categoria_id: categoria_id || null,
          plataforma: req.body.plataforma || 'web',
          icon: icon || null,
          color: color || null
        });
      }
    } catch (e) {
      console.warn('[movimientosRecurrentes.crear] No se pudo materializar movimiento de hoy:', e && e.message);
    }
    res.status(201).json(nuevo);
  } catch (err) {
    console.error('[movimientosRecurrentes.crear] Error:', err);
    res.status(500).json({ error: 'No se pudo crear el movimiento recurrente.' });
  }
};

// Aplicar ahora: crea el movimiento de hoy y registra excepción 'skip' para evitar materialización duplicada
exports.aplicarAhora = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const id = req.params.id;
    const mov = await MovimientoRecurrente.findOne({ where: { id, usuario_id } });
    if (!mov) return res.status(404).json({ error: 'Movimiento recurrente no encontrado.' });
    const Transaccion = require('../../../models/transaccion');
    const todayStr = new Date().toISOString().slice(0,10);
    const marker = `[RECURRENTE#${mov.id}]`;
    await Transaccion.create({
      usuario_id,
      cuenta_id: mov.cuenta_id,
      tipo: mov.tipo,
      monto: Number(mov.monto),
      descripcion: (mov.descripcion && String(mov.descripcion).trim()) ? `${mov.descripcion} ${marker}` : marker,
      fecha: todayStr,
      categoria_id: mov.categoria_id || null,
      plataforma: req.body.plataforma || 'web',
      icon: mov.icon || null,
      color: mov.color || null
    });
    // Excepción: saltar la ocurrencia de hoy
    await MovimientoRecurrenteExcepcion.create({
      movimiento_recurrente_id: mov.id,
      usuario_id,
      fecha_original: todayStr,
      accion: 'skip',
      fecha_nueva: null
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[recurrentes.aplicarAhora] Error:', err);
    res.status(500).json({ error: 'No se pudo aplicar el movimiento.' });
  }
};

// Saltar una vez (hoy)
exports.saltarHoy = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const id = req.params.id;
    const mov = await MovimientoRecurrente.findOne({ where: { id, usuario_id } });
    if (!mov) return res.status(404).json({ error: 'Movimiento recurrente no encontrado.' });
    const todayStr = new Date().toISOString().slice(0,10);
    await MovimientoRecurrenteExcepcion.create({
      movimiento_recurrente_id: mov.id,
      usuario_id,
      fecha_original: todayStr,
      accion: 'skip',
      fecha_nueva: null
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo registrar la excepción.' });
  }
};

// Posponer (hoy -> nueva fecha)
exports.posponer = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const id = req.params.id;
    const { dias, nuevaFecha } = req.body || {};
    const mov = await MovimientoRecurrente.findOne({ where: { id, usuario_id } });
    if (!mov) return res.status(404).json({ error: 'Movimiento recurrente no encontrado.' });
    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);
    let target = null;
    if (nuevaFecha) {
      target = new Date(nuevaFecha);
    } else {
      const offset = Number(dias || 0);
      target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (isNaN(offset) ? 7 : offset));
    }
    const targetStr = target.toISOString().slice(0,10);
    await MovimientoRecurrenteExcepcion.create({
      movimiento_recurrente_id: mov.id,
      usuario_id,
      fecha_original: todayStr,
      accion: 'postpone',
      fecha_nueva: targetStr
    });
    res.json({ ok: true, nuevaFecha: targetStr });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo registrar la posposición.' });
  }
};

// Obtener movimientos recurrentes del usuario
exports.listar = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const lista = await MovimientoRecurrente.findAll({ where: { usuario_id } });
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener la lista.' });
  }
};

function ultimoDiaDelMes(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Generar instancias de fechas para movimientos recurrentes
function generarFechasRecurrentes(movimiento, rangoInicio, rangoFin) {
  const fechas = [];
  const inicio = new Date(movimiento.inicio);
  const fin = movimiento.indefinido ? (rangoFin ? new Date(rangoFin) : new Date(inicio.getFullYear()+1, inicio.getMonth(), inicio.getDate())) : new Date(movimiento.fin);
  let actual = new Date(inicio);
  const diaOriginal = inicio.getDate();
  while (actual <= fin) {
    let year = actual.getFullYear();
    let month = actual.getMonth();
    let dia = diaOriginal;
    if (movimiento.frecuencia === 'mensual') {
      const ultimoDia = ultimoDiaDelMes(year, month);
      if (dia > ultimoDia) dia = ultimoDia;
      const fechaPush = new Date(year, month, dia);
      fechas.push(fechaPush);
      // Avanzar al siguiente mes
      actual.setMonth(month + 1);
      actual.setDate(1); // Evitar saltos por meses cortos
    } else if (movimiento.frecuencia === 'semanal') {
      fechas.push(new Date(actual));
      actual.setDate(actual.getDate() + 7);
    } else if (movimiento.frecuencia === 'diaria') {
      fechas.push(new Date(actual));
      actual.setDate(actual.getDate() + 1);
    } else {
      break;
    }
  }
  return fechas;
}

// Endpoint para obtener instancias recurrentes para el calendario
exports.instanciasCalendario = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const lista = await MovimientoRecurrente.findAll({ where: { usuario_id } });
    // Opcional: puedes recibir rangoInicio/rangoFin por query para limitar el rango
    const rangoInicio = req.query.rangoInicio;
    const rangoFin = req.query.rangoFin;

    // Obtener un mapa de cuentas para adjuntar el nombre de la cuenta en cada instancia
    const db = require('../../config/database');
    let cuentasMap = {};
    try {
      const [cuentas] = await db.query('SELECT id, nombre FROM cuentas WHERE usuario_id = ?', [usuario_id]);
      cuentasMap = (cuentas || []).reduce((acc, c) => { acc[c.id] = c.nombre; return acc; }, {});
    } catch (e) {
      // Si falla, dejamos el mapa vacío y seguimos devolviendo las instancias
      cuentasMap = {};
    }

    const instancias = lista.flatMap(mov => {
      const fechas = generarFechasRecurrentes(mov, rangoInicio, rangoFin);
      return fechas.map(fecha => ({
        ...mov.dataValues,
        fecha: fecha.toISOString().slice(0, 10),
        cuenta: cuentasMap[mov.cuenta_id] || null, // nombre de la cuenta para UI del calendario
        _recurrente: true, // marca para distinguir en el frontend
      }));
    });
    res.json(instancias);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo generar las instancias.' });
  }
};
