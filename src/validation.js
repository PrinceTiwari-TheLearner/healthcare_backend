const { z } = require('zod');

const email = z.string().trim().email().max(255);
const requiredText = (max = 255) => z.string().trim().min(1).max(max);

const registerSchema = z.object({
  name: requiredText(120),
  email,
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({ email, password: z.string().min(1).max(72) });

const patientSchema = z.object({
  name: requiredText(120),
  email,
  phone: requiredText(30),
  dateOfBirth: z.string().date(),
  address: requiredText(255)
});

const doctorSchema = z.object({
  name: requiredText(120),
  specialization: requiredText(120),
  email,
  phone: requiredText(30),
  licenseNumber: requiredText(80)
});

const mappingSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid()
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { registerSchema, loginSchema, patientSchema, doctorSchema, mappingSchema, validate };
