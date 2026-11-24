const { z } = require('zod');

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const text = (max, label, min = 1) =>
  z
    .string({ required_error: `${label} is required.` })
    .transform((s) => s.replace(CONTROL_CHARS, '').trim())
    .pipe(z.string().min(min, `${label} must be at least ${min} characters.`).max(max, `${label} must be ${max} characters or fewer.`));

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(15);

const listQuery = (statuses) => z.object({ page, limit, status: z.enum(statuses).optional() });

const adminPropertyQuery = listQuery(['pending', 'approved', 'rejected']);
const adminBrokerQuery = listQuery(['pending', 'approved', 'rejected']);
const adminCommentQuery = listQuery(['visible', 'hidden']);
const adminReviewQuery = listQuery(['visible', 'hidden']);
const adminReportQuery = z.object({
  page, limit,
  status: z.enum(['open', 'resolved', 'dismissed']).optional(),
  targetType: z.enum(['property', 'comment', 'user', 'review']).optional(),
});
const adminUserQuery = z.object({
  page, limit,
  role: z.enum(['client', 'broker', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  q: z.string().trim().max(80).optional(),
});
const auditQuery = z.object({ page, limit, action: z.string().trim().max(60).optional() });

const rejectBody = z.object({ reason: text(500, 'Reason', 5) }).strict();
const brokerRejectBody = z.object({ reason: text(500, 'Reason', 5).optional() }).strict();
const moderationBody = z.object({ status: z.enum(['visible', 'hidden']) }).strict();
const userStatusBody = z.object({ status: z.enum(['active', 'suspended']) }).strict();
const reportResolveBody = z.object({ status: z.enum(['resolved', 'dismissed']) }).strict();

// Submitted by any logged-in user
const reportCreate = z.object({
  targetType: z.enum(['property', 'comment', 'user', 'review']),
  targetId: z.coerce.number().int().positive(),
  reason: text(500, 'Reason', 10),
}).strict();

module.exports = {
  adminPropertyQuery, adminBrokerQuery, adminCommentQuery, adminReviewQuery, adminReportQuery,
  adminUserQuery, auditQuery, rejectBody, brokerRejectBody, moderationBody, userStatusBody,
  reportResolveBody, reportCreate,
};
