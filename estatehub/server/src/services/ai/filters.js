// Search filters used by EstateAI, and the ONE place that decides which values are acceptable.
// Everything that comes from outside (the rule parser, the LLM, the browser) goes through sanitizeFilters(),
// so a wrong or malicious value can never reach the database: it is simply dropped.

const PURPOSES = ['sale', 'rent'];
const CATEGORIES = ['land', 'apartment', 'house', 'commercial'];
const SORTS = ['newest', 'price_asc', 'price_desc'];
const FIELDS = ['purpose', 'category', 'city', 'area', 'minPrice', 'maxPrice', 'bedrooms', 'minSize', 'maxSize', 'sort', 'q'];

const MAX_PRICE = 1e11; // 10,000 crore BDT: anything above is certainly a mistake
const MAX_SIZE = 1e7;

const num = (v, max) => {
  const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : undefined;
};

// vocab = { cities: ['Dhaka', ...], areas: [{ city: 'Dhaka', area: 'Uttara' }, ...] } read from the database
function sanitizeFilters(raw, vocab) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;

  if (PURPOSES.includes(raw.purpose)) out.purpose = raw.purpose;
  if (CATEGORIES.includes(raw.category)) out.category = raw.category;
  if (SORTS.includes(raw.sort)) out.sort = raw.sort;

  // Places must exist in our listings (case-insensitive); the stored spelling is used.
  if (typeof raw.city === 'string') {
    const hit = vocab.cities.find((c) => c.toLowerCase() === raw.city.trim().toLowerCase());
    if (hit) out.city = hit;
  }
  if (typeof raw.area === 'string') {
    const hit = vocab.areas.find((a) => a.area.toLowerCase() === raw.area.trim().toLowerCase());
    if (hit) { out.area = hit.area; if (!out.city) out.city = hit.city; }
  }

  const minPrice = num(raw.minPrice, MAX_PRICE);
  const maxPrice = num(raw.maxPrice, MAX_PRICE);
  if (minPrice !== undefined) out.minPrice = minPrice;
  if (maxPrice !== undefined) out.maxPrice = maxPrice;
  if (out.minPrice !== undefined && out.maxPrice !== undefined && out.minPrice > out.maxPrice) {
    [out.minPrice, out.maxPrice] = [out.maxPrice, out.minPrice];
  }

  const minSize = num(raw.minSize, MAX_SIZE);
  const maxSize = num(raw.maxSize, MAX_SIZE);
  if (minSize !== undefined) out.minSize = minSize;
  if (maxSize !== undefined) out.maxSize = maxSize;

  const beds = num(raw.bedrooms, 20);
  if (beds !== undefined) out.bedrooms = Math.round(beds);

  if (typeof raw.q === 'string') {
    const q = raw.q.trim().replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 40);
    if (q.length >= 3) out.q = q;
  }

  // Land has no bedrooms
  if (out.category === 'land') delete out.bedrooms;
  return out;
}

// New filters override old ones field by field (this is how "make it cheaper" or "in Mirpur" refine a search).
function mergeFilters(previous, next) {
  const merged = { ...previous, ...next };
  // A new area from a different city replaces the old city/area pair, not just one half.
  if (next.city && !next.area && previous.area) delete merged.area;
  return merged;
}

const countActive = (f) => FIELDS.filter((k) => k !== 'sort' && f[k] !== undefined).length;

module.exports = { PURPOSES, CATEGORIES, SORTS, FIELDS, sanitizeFilters, mergeFilters, countActive };
