const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const db = require('../db');
const Transaccion = require('./transaccion');
const MovimientoRecurrenteExcepcion = require('./movimientoRecurrenteExcepcion');

const MovimientoRecurrente = sequelize.define('MovimientoRecurrente', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cuenta_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false },
  monto: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  descripcion: { type: DataTypes.STRING },
  categoria_id: { type: DataTypes.INTEGER },
  icon: { type: DataTypes.STRING },
  color: { type: DataTypes.STRING },
  frecuencia: { type: DataTypes.STRING, allowNull: false }, // mensual, semanal, diaria
  inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fin: { type: DataTypes.DATEONLY },
  indefinido: { type: DataTypes.BOOLEAN, defaultValue: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'movimientos_recurrentes',
  timestamps: false
});

module.exports = MovimientoRecurrente;

// Materializa (crea) movimientos reales para las ocurrencias de HOY
// Evita duplicados buscando por marcador [RECURRENTE#<id>] y misma fecha
MovimientoRecurrente.materializeDueForToday = async function materializeDueForToday() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  function isDueToday(row) {
    const inicio = new Date(row.inicio);
    const fin = row.indefinido ? null : (row.fin ? new Date(row.fin) : null);
    // Rango
    const d0 = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const dT = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dT < d0) return false;
    if (fin) {
      const dF = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
      if (dT > dF) return false;
    }
    const freq = String(row.frecuencia || '').toLowerCase();
    if (freq === 'diaria') return true;
    if (freq === 'semanal') {
      const diffDays = Math.floor((dT - d0) / (24 * 60 * 60 * 1000));
      return diffDays % 7 === 0;
    }
    if (freq === 'mensual') {
      // Debe coincidir el día del mes, ajustando al último día si no existe
      const originalDay = d0.getDate();
      const y = dT.getFullYear();
      const m = dT.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      const targetDay = Math.min(originalDay, lastDay);
      if (dT.getDate() !== targetDay) return false;
      // Asegurar que entre inicio->hoy pasaron n meses enteros
      const monthsDiff = (dT.getFullYear() - d0.getFullYear()) * 12 + (dT.getMonth() - d0.getMonth());
      return monthsDiff >= 0; // ya validado con rango; hoy está en el día objetivo
    }
    return false;
  }

  // Traer todos los recurrentes; la cantidad suele ser baja por usuario
  const [rows] = await db.query('SELECT * FROM movimientos_recurrentes');
  // Traer excepciones de hoy (original) y las que fijan hoy como nueva fecha
  let excByRecOriginal = new Map();
  let excByRecNew = new Map();
  try {
    const [excsOrig] = await db.query('SELECT * FROM movimientos_recurrentes_excepciones WHERE fecha_original = ?', [todayStr]);
    for (const e of (excsOrig || [])) {
      if (!excByRecOriginal.has(e.movimiento_recurrente_id)) excByRecOriginal.set(e.movimiento_recurrente_id, []);
      excByRecOriginal.get(e.movimiento_recurrente_id).push(e);
    }
    const [excsNew] = await db.query('SELECT * FROM movimientos_recurrentes_excepciones WHERE fecha_nueva = ?', [todayStr]);
    for (const e of (excsNew || [])) {
      if (!excByRecNew.has(e.movimiento_recurrente_id)) excByRecNew.set(e.movimiento_recurrente_id, []);
      excByRecNew.get(e.movimiento_recurrente_id).push(e);
    }
  } catch (_) {}
  let created = 0;
  for (const r of rows || []) {
    try {
      // Si hay excepción con fecha_nueva == hoy, se debe materializar hoy sin importar la regla
      const hasNewToday = excByRecNew.has(r.id);
      const dueByRule = isDueToday(r);
      // Si hay excepción en fecha_original == hoy con accion skip o postpone, no materializar hoy por la regla base
      const excOrig = (excByRecOriginal.get(r.id) || [])[0];
      const skipToday = !!excOrig && (excOrig.accion === 'skip' || excOrig.accion === 'postpone');
      if (!hasNewToday && (!dueByRule || skipToday)) continue;
      const marker = `[RECURRENTE#${r.id}]`;
      // Verificar si ya existe un movimiento hoy con el marcador
      const [exists] = await db.query(
        'SELECT id FROM movimientos WHERE usuario_id = ? AND DATE(fecha) = ? AND descripcion LIKE ?',
        [r.usuario_id, todayStr, `%${marker}%`]
      );
      if (Array.isArray(exists) && exists.length > 0) continue;
      // Crear movimiento real que afecte saldo
      await Transaccion.create({
        usuario_id: r.usuario_id,
        cuenta_id: r.cuenta_id,
        tipo: r.tipo,
        monto: Number(r.monto),
        descripcion: (r.descripcion && String(r.descripcion).trim()) ? `${r.descripcion} ${marker}` : marker,
        fecha: todayStr,
        categoria_id: r.categoria_id || null,
        plataforma: 'web',
        icon: r.icon || null,
        color: r.color || null
      });
      created += 1;
    } catch (e) {
      // Continuar con el resto, log de depuración mínimo
      console.warn('[recurrentes.materialize] Error con', r && r.id, e && e.message);
    }
  }
  if (created > 0) console.log(`[recurrentes.materialize] Movimientos creados hoy: ${created}`);
  return created;
};
