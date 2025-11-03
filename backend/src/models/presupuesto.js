const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Presupuesto = sequelize.define('Presupuesto', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  categoria_id: { type: DataTypes.INTEGER, allowNull: false },
  anio: { type: DataTypes.INTEGER, allowNull: false },
  mes: { type: DataTypes.INTEGER, allowNull: false },
  monto: { type: DataTypes.DECIMAL(12,2), allowNull: false },
}, {
  tableName: 'presupuestos',
  timestamps: false
});

module.exports = Presupuesto;
