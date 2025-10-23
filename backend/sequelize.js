const { Sequelize } = require('sequelize');

let sequelize;
const DB_URL = process.env.DATABASE_URL || process.env.MYSQL_URL;
const DB_SSL = String(process.env.DB_SSL || '').toLowerCase() === 'true';

if (DB_URL) {
  // Usar URL completa
  sequelize = new Sequelize(DB_URL, {
    dialect: 'mysql',
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: false,
    },
    dialectOptions: DB_SSL ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {},
  });
} else {
  // Usar variables separadas
  const DB_NAME = process.env.DB_NAME || 'kairos';
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASS = process.env.DB_PASS || 'CodeEsteban';
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || 3306;
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: false,
    },
    dialectOptions: DB_SSL ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {},
  });
}

module.exports = sequelize;
