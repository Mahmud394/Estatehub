const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(190);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password is too long.')
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/[0-9]/, 'Password must contain a number.');
const phone = z.string().trim().regex(/^[0-9+\-\s]{6,20}$/, 'Enter a valid phone number.');

// Note: "role" is limited to client/broker. Nobody can register as admin.
const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is too short.').max(120),
  email,
  password,
  role: z.enum(['client', 'broker']).default('client'),
  phone: phone.optional().or(z.literal('').transform(() => undefined)),
  companyName: z.string().trim().max(160).optional(),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
});

// Profile update deliberately has no role/status/email fields.
const profileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: phone.optional().or(z.literal('').transform(() => null)),
    companyName: z.string().trim().max(160).optional(),
    bio: z.string().trim().max(1000).optional(),
    serviceAreas: z.string().trim().max(300).optional(),
  })
  .strict(); // unknown keys (like "role") are rejected, not ignored

module.exports = { registerSchema, loginSchema, profileSchema };
