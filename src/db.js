const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? false : false,
  dialectOptions: config.nodeEnv === 'production'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {}
});

module.exports = sequelize;
