const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

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
