const jwt = require('jsonwebtoken');
const { User } = require('./models');
const config = require('./config');

async function authenticate(req, res, next) {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    const user = await User.findByPk(payload.sub, { attributes: ['id', 'name', 'email'] });
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'A record with the same unique value already exists' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { authenticate, notFound, errorHandler };
