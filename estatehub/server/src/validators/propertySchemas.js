const { z } = require('zod');

const CATEGORIES = ['land', 'apartment', 'house', 'commercial'];
const PURPOSES = ['sale', 'rent'];
const AVAILABILITY = ['available', 'sold', 'rented', 'unavailable'];

const optionalInt = (max) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().int().min(0).max(max).optional());

const propertyBase = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters.').max(200),
  description: z.string().trim().min(20, 'Description must be at least 20 characters.').max(5000),
  category: z.enum(CATEGORIES),
  purpose: z.enum(PURPOSES),
  price: z.coerce.number().positive('Price must be greater than 0.').max(100000000000),
  size: z.coerce.number().positive('Size must be greater than 0.').max(100000000),
  bedrooms: optionalInt(50),
  bathrooms: optionalInt(50),
  city: z.string().trim().min(2, 'City is required.').max(80),
  area: z.string().trim().min(2, 'Area is required.').max(80),
  addressLine: z.string().trim().max(255).optional(),
  availabilityStatus: z.enum(AVAILABILITY).optional(),
});

// Bedrooms/bathrooms only make sense for buildings
const createPropertySchema = propertyBase.refine(
  (d) => d.category !== 'land' || (d.bedrooms === undefined && d.bathrooms === undefined),
  { message: 'Land cannot have bedrooms or bathrooms.', path: ['bedrooms'] }
);

const updatePropertySchema = propertyBase.partial().strict();

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  category: z.enum(CATEGORIES).optional(),
  purpose: z.enum(PURPOSES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minSize: z.coerce.number().min(0).optional(),
  maxSize: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

module.exports = { createPropertySchema, updatePropertySchema, listQuerySchema, CATEGORIES };
