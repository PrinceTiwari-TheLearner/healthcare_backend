const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false }
}, { tableName: 'users', underscored: true });

const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(30), allowNull: false },
  dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false },
  address: { type: DataTypes.STRING(255), allowNull: false }
}, { tableName: 'patients', underscored: true });

const Doctor = sequelize.define('Doctor', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  specialization: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(30), allowNull: false },
  licenseNumber: { type: DataTypes.STRING(80), allowNull: false, unique: true }
}, { tableName: 'doctors', underscored: true });

const PatientDoctorMapping = sequelize.define('PatientDoctorMapping', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
}, {
  tableName: 'patient_doctor_mappings',
  underscored: true,
  indexes: [{ unique: true, fields: ['patient_id', 'doctor_id'] }]
});

User.hasMany(Patient, { foreignKey: { name: 'createdById', field: 'created_by_id' }, as: 'patients' });
Patient.belongsTo(User, { foreignKey: { name: 'createdById', field: 'created_by_id' }, as: 'createdBy' });
User.hasMany(Doctor, { foreignKey: { name: 'createdById', field: 'created_by_id' }, as: 'doctors' });
Doctor.belongsTo(User, { foreignKey: { name: 'createdById', field: 'created_by_id' }, as: 'createdBy' });
Patient.belongsToMany(Doctor, { through: PatientDoctorMapping, foreignKey: 'patientId', otherKey: 'doctorId', as: 'doctors' });
Doctor.belongsToMany(Patient, { through: PatientDoctorMapping, foreignKey: 'doctorId', otherKey: 'patientId', as: 'patients' });
PatientDoctorMapping.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
PatientDoctorMapping.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

module.exports = { sequelize, User, Patient, Doctor, PatientDoctorMapping };
