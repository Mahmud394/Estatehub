const { z } = require('zod');

// Text fields: remove control characters, trim, then check length. (React escapes HTML on display,
// and emails never contain user text, so we do not need to strip angle brackets.)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const text = (max, label = 'Text', min = 1) =>
  z
    .string({ required_error: `${label} is required.` })
    .transform((s) => s.replace(CONTROL_CHARS, '').trim())
    .pipe(
      z
        .string()
        .min(min, min > 1 ? `${label} must be at least ${min} characters.` : `${label} cannot be empty.`)
        .max(max, `${label} must be ${max} characters or fewer.`)
    );

const id = z.coerce.number().int().positive();
const page = z.coerce.number().int().min(1).default(1);

const commentCreate = z.object({ propertyId: id, body: text(1000, 'Comment') });
const commentUpdate = z.object({ body: text(1000, 'Comment') }).strict();
const commentListQuery = z.object({ propertyId: id, page, limit: z.coerce.number().int().min(1).max(50).default(10) });
const pageQuery = z.object({ page, limit: z.coerce.number().int().min(1).max(50).default(10) });

const conversationCreate = z
  .object({ propertyId: id.optional(), brokerId: id.optional(), body: text(2000, 'Message') })
  .refine((d) => d.propertyId || d.brokerId, { message: 'Choose a property or a broker to contact.', path: ['propertyId'] });
const messageCreate = z.object({ body: text(2000, 'Message') }).strict();

const reviewCreate = z.object({
  brokerId: id,
  rating: z.coerce.number().int().min(1, 'Choose a rating from 1 to 5.').max(5, 'Choose a rating from 1 to 5.'),
  body: text(1000, 'Review', 10),
});
const reviewUpdate = z
  .object({ rating: z.coerce.number().int().min(1).max(5).optional(), body: text(1000, 'Review', 10).optional() })
  .strict();

const notificationQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });

module.exports = {
  commentCreate, commentUpdate, commentListQuery, pageQuery,
  conversationCreate, messageCreate,
  reviewCreate, reviewUpdate, notificationQuery,
};
