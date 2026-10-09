const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const config = require('./config');
const { sequelize, User, Patient, Doctor, PatientDoctorMapping } = require('./models');
const { authenticate, notFound, errorHandler } = require('./middleware');
const { registerSchema, loginSchema, patientSchema, doctorSchema, mappingSchema, validate } = require('./validation');

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });
const tokenFor = (user) => jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email is already registered' });
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ user: publicUser(user), token: tokenFor(user) });
  } catch (error) { return next(error); }
});

app.post('/api/auth/login', validate(loginSchema), async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.json({ user: publicUser(user), token: tokenFor(user) });
  } catch (error) { return next(error); }
});

app.use('/api', authenticate);

app.route('/api/patients')
  .post(validate(patientSchema), async (req, res, next) => {
    try { return res.status(201).json(await Patient.create({ ...req.body, createdById: req.user.id })); } catch (error) { return next(error); }
  })
  .get(async (req, res, next) => {
    try { return res.json(await Patient.findAll({ where: { createdById: req.user.id }, order: [['createdAt', 'DESC']] })); } catch (error) { return next(error); }
  });

app.route('/api/patients/:id')
  .get(async (req, res, next) => {
    try {
      const patient = await Patient.findOne({ where: { id: req.params.id, createdById: req.user.id } });
      return patient ? res.json(patient) : res.status(404).json({ error: 'Patient not found' });
    } catch (error) { return next(error); }
  })
  .put(validate(patientSchema), async (req, res, next) => {
    try {
      const patient = await Patient.findOne({ where: { id: req.params.id, createdById: req.user.id } });
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      await patient.update(req.body); return res.json(patient);
    } catch (error) { return next(error); }
  })
  .delete(async (req, res, next) => {
    try {
      const deleted = await Patient.destroy({ where: { id: req.params.id, createdById: req.user.id } });
      return deleted ? res.status(204).send() : res.status(404).json({ error: 'Patient not found' });
    } catch (error) { return next(error); }
  });

app.route('/api/doctors')
  .post(validate(doctorSchema), async (req, res, next) => {
    try { return res.status(201).json(await Doctor.create({ ...req.body, createdById: req.user.id })); } catch (error) { return next(error); }
  })
  .get(async (req, res, next) => {
    try { return res.json(await Doctor.findAll({ order: [['name', 'ASC']] })); } catch (error) { return next(error); }
  });

app.route('/api/doctors/:id')
  .get(async (req, res, next) => {
    try { const doctor = await Doctor.findByPk(req.params.id); return doctor ? res.json(doctor) : res.status(404).json({ error: 'Doctor not found' }); } catch (error) { return next(error); }
  })
  .put(validate(doctorSchema), async (req, res, next) => {
    try {
      const doctor = await Doctor.findOne({ where: { id: req.params.id, createdById: req.user.id } });
      if (!doctor) return res.status(404).json({ error: 'Doctor not found or not owned by you' });
      await doctor.update(req.body); return res.json(doctor);
    } catch (error) { return next(error); }
  })
  .delete(async (req, res, next) => {
    try {
      const deleted = await Doctor.destroy({ where: { id: req.params.id, createdById: req.user.id } });
      return deleted ? res.status(204).send() : res.status(404).json({ error: 'Doctor not found or not owned by you' });
    } catch (error) { return next(error); }
  });

app.post('/api/mappings', validate(mappingSchema), async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ where: { id: req.body.patientId, createdById: req.user.id } });
    const doctor = await Doctor.findByPk(req.body.doctorId);
    if (!patient) return res.status(404).json({ error: 'Patient not found or not owned by you' });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    const mapping = await PatientDoctorMapping.create(req.body);
    return res.status(201).json(await PatientDoctorMapping.findByPk(mapping.id, { include: [{ model: Patient, as: 'patient' }, { model: Doctor, as: 'doctor' }] }));
  } catch (error) { return next(error); }
});

app.get('/api/mappings', async (req, res, next) => {
  try {
    return res.json(await PatientDoctorMapping.findAll({
      include: [
        { model: Patient, as: 'patient', where: { createdById: req.user.id } },
        { model: Doctor, as: 'doctor' }
      ]
    }));
  } catch (error) { return next(error); }
});

app.get('/api/mappings/:patientId', async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ where: { id: req.params.patientId, createdById: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    return res.json(await PatientDoctorMapping.findAll({ where: { patientId: patient.id }, include: [{ model: Doctor, as: 'doctor' }] }));
  } catch (error) { return next(error); }
});

app.delete('/api/mappings/:id', async (req, res, next) => {
  try {
    const mapping = await PatientDoctorMapping.findOne({
      where: { id: req.params.id },
      include: [{ model: Patient, as: 'patient', where: { createdById: req.user.id } }]
    });
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });
    await mapping.destroy(); return res.status(204).send();
  } catch (error) { return next(error); }
});

app.use(notFound);
app.use(errorHandler);

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  app.listen(config.port, () => console.log(`Healthcare API listening on port ${config.port}`));
}

if (require.main === module) {
  start().catch((error) => { console.error('Unable to start server:', error); process.exit(1); });
}

module.exports = { app, start };
