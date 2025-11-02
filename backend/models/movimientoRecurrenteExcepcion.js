const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

// Excepciones por serie recurrente: saltar una fecha o posponerla a otra
const MovimientoRecurrenteExcepcion = sequelize.define('MovimientoRecurrenteExcepcion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  movimiento_recurrente_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha_original: { type: DataTypes.DATEONLY, allowNull: false },
  accion: { type: DataTypes.STRING, allowNull: false }, // 'skip' | 'postpone'
  fecha_nueva: { type: DataTypes.DATEONLY }, // requerido si accion='postpone'
  usuario_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'movimientos_recurrentes_excepciones',
  timestamps: false
});

module.exports = MovimientoRecurrenteExcepcion;
