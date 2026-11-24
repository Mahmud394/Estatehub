// Rule-based understanding of a search sentence. This is the "fallback" of EstateAI and also its first step:
// it works with no internet, no API key and no cost, and it always gives the same answer for the same text.
//
// It is plain pattern matching, written to be explained:
//   1. clean the text,  2. cut out sizes and bedroom counts,  3. read prices (lakh / crore / k),
//   4. look for words like "rent", "flat", "under",  5. look for place names that exist in our database.

const LAKH = 100000;
const CRORE = 10000000;

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

// English, Banglish (Bangla written in English letters) and a few Bangla-script words.
const CATEGORY_WORDS = {
  apartment: ['apartment', 'apartments', 'flat', 'flats', 'ফ্ল্যাট', 'ফ্লাট', 'এপার্টমেন্ট'],
  house: ['house', 'houses', 'home', 'homes', 'villa', 'duplex', 'bungalow', 'bari', 'basa', 'basha', 'bashar', 'বাসা', 'বাড়ি', 'বাড়ী'],
  land: ['land', 'plot', 'plots', 'jomi', 'jami', 'জমি', 'প্লট'],
  commercial: ['commercial', 'shop', 'shops', 'office', 'offices', 'showroom', 'warehouse', 'store', 'dokan', 'দোকান', 'অফিস'],
};
const SALE_WORDS = ['buy', 'buying', 'purchase', 'sale', 'sell', 'selling', 'kinbo', 'kinte', 'kine', 'kena', 'bikri', 'becha', 'বিক্রি', 'কিনতে', 'কিনব'];
const RENT_WORDS = ['rent', 'rental', 'rentals', 'lease', 'tolet', 'bhara', 'vara', 'bhaara', 'ভাড়া', 'ভাড়ায়'];
const FEATURE_WORDS = {
  parking: 'parking', garden: 'garden', lift: 'lift', elevator: 'lift', balcony: 'balcony', generator: 'generator',
  pool: 'pool', swimming: 'pool', gym: 'gym', furnished: 'furnished', security: 'security', rooftop: 'rooftop', gas: 'gas',
  wifi: 'wifi', 'sea view': 'sea view', 'river view': 'river view', 'lake view': 'lake view', corner: 'corner', 'south facing': 'south',
};

// Land units used in Bangladesh, converted to square feet (the unit the listings use).
// A katha differs by region; 720 sq ft is the common Dhaka value, so replies always say what was assumed.
const AREA_UNITS = {
  sqft: 1, sft: 1,
  katha: 720, kathas: 720, bigha: 14400, bighas: 14400,
  decimal: 435.6, decimals: 435.6, shotok: 435.6, shatak: 435.6,
  acre: 43560, acres: 43560,
  sqm: 10.7639,
};
const UNIT_RE = '(?:sqft|sq\\.? ?ft|sft|square feet|square foot|sq feet|katha|kathas|bigha|bighas|decimals?|shotok|shatak|acres?|sqm|sq\\.? ?m|square met(?:er|re)s?)';
const unitKey = (u) => {
  const x = u.replace(/[. ]/g, '');
  if (/^(sqft|squarefeet|squarefoot|sqfeet|sft)$/.test(x)) return 'sqft';
  if (/^(sqm|squaremeters?|squaremetres?)$/.test(x)) return 'sqm';
  return x;
};
const UNIT_NOTE = { katha: '1 katha ≈ 720 sq ft', bigha: '1 bigha = 20 katha ≈ 14,400 sq ft', decimal: '1 decimal ≈ 435.6 sq ft', shotok: '1 decimal ≈ 435.6 sq ft', shatak: '1 decimal ≈ 435.6 sq ft', acre: '1 acre = 43,560 sq ft', sqm: '1 sq m ≈ 10.76 sq ft' };

const MAX_CUES = ['under', 'below', 'less than', 'within', 'up to', 'upto', 'max', 'maximum', 'at most', 'not more than', 'budget', 'cheaper than'];
const MIN_CUES = ['above', 'over', 'more than', 'at least', 'min', 'minimum', 'starting', 'atleast', 'not less than', 'bigger than', 'larger than'];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, w) => new RegExp(`(^|[^a-z0-9])${escapeRe(w)}([^a-z0-9]|$)`).test(text);
const hasAny = (text, list) => list.some((w) => hasWord(text, w));

function clean(message) {
  return String(message)
    .toLowerCase()
    .replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)) // Bangla digits -> 0-9
    .replace(/৳|\btk\b|\btaka\b|\bbdt\b|টাকা/g, ' ')
    .replace(/লাখ|লক্ষ/g, ' lakh ')
    .replace(/কোটি/g, ' crore ')
    .replace(/(\d),(?=\d)/g, '$1') // 50,00,000 -> 5000000
    .replace(/\bto-let\b/g, 'tolet')
    .replace(/\bhome (loan|loans|financing|insurance)\b/g, '$1') // "home loan" is not a search for a home
    .replace(/[“”"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNIT = { lakh: LAKH, lakhs: LAKH, lac: LAKH, lacs: LAKH, crore: CRORE, crores: CRORE, cr: CRORE, k: 1000, thousand: 1000 };

// Finds money amounts. Returns [{ value, index, end, hadUnit }]
function findMoney(text) {
  const out = [];
  const re = /(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|k|thousand)?(?![a-z0-9])/g;
  let m;
  while ((m = re.exec(text))) {
    const unit = m[2];
    const raw = Number(m[1]);
    const value = unit ? raw * UNIT[unit] : raw;
    // a bare small number ("3") is not a price; a bare number from 1,000 up is (e.g. rent 25000)
    if (!unit && raw < 1000) continue;
    out.push({ value, index: m.index, end: m.index + m[0].length, hadUnit: !!unit });
  }
  return out;
}

function cueBefore(text, index, cues) {
  const before = text.slice(Math.max(0, index - 22), index);
  return cues.some((c) => new RegExp(`(^|[^a-z])${escapeRe(c)}\\s*(of|is|around|about)?\\s*$`).test(before));
}

function parseBedrooms(text) {
  // "2-3 bedroom" or "2 to 3 bedroom": the smaller number is the minimum
  let m = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*[- ]?\s*(?:bed|beds|bedroom|bedrooms|bhk|br|room|rooms)\b/);
  if (m) return { value: Math.min(Number(m[1]), Number(m[2])), span: m[0] };
  m = text.match(/(\d+)\s*[- ]?\s*(?:bed|beds|bedroom|bedrooms|bhk|br|room|rooms)\b/);
  if (m) return { value: Number(m[1]), span: m[0] };
  m = text.match(new RegExp(`\\b(${Object.keys(WORD_NUMBERS).join('|')})\\s*[- ]?\\s*(?:bed|beds|bedroom|bedrooms|room|rooms)\\b`));
  if (m) return { value: WORD_NUMBERS[m[1]], span: m[0] };
  return null;
}

function parseSizes(text) {
  const found = [];
  const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})(?![a-z])`, 'g');
  let m;
  while ((m = re.exec(text))) {
    const key = unitKey(m[2]);
    found.push({ value: Number(m[1]) * AREA_UNITS[key], index: m.index, span: m[0], unit: key, raw: Number(m[1]) });
  }
  return found;
}

// vocab: { cities: [...], areas: [{city, area}] }
function findPlaces(text, vocab) {
  const out = {};
  const { ALIASES, fuzzyWord } = require('./places'); // loaded here because places.js imports this file
  const areas = [...vocab.areas].sort((a, b) => b.area.length - a.area.length);
  for (const a of areas) {
    if (hasWord(text, a.area.toLowerCase())) { out.area = a.area; out.city = a.city; break; }
  }
  if (!out.city) {
    const cities = [...vocab.cities].sort((a, b) => b.length - a.length);
    for (const c of cities) if (hasWord(text, c.toLowerCase())) { out.city = c; break; }
  }
  // other spellings: "Chittagong" for Chattogram, "Comilla" for Cumilla ...
  if (!out.city && !out.area) {
    for (const [alias, real] of Object.entries(ALIASES)) {
      if (!hasWord(text, alias)) continue;
      const c = vocab.cities.find((x) => x.toLowerCase() === real);
      if (c) { out.city = c; break; }
      const a = vocab.areas.find((x) => x.area.toLowerCase() === real);
      if (a) { out.area = a.area; out.city = a.city; break; }
    }
  }
  // a small typo ("Uttora", "Dhanmodi") still finds the place if it is one we really have
  if (!out.city && !out.area) {
    const names = [...new Set([...vocab.areas.map((a) => a.area), ...vocab.cities])].filter((n) => !/[ ']/.test(n));
    const lower = names.map((n) => n.toLowerCase());
    for (const w of text.split(/[^a-z]+/).filter((x) => x.length >= 5)) {
      if (lower.includes(w)) continue;
      const near = fuzzyWord(w, lower);
      if (!near) continue;
      const area = vocab.areas.find((a) => a.area.toLowerCase() === near);
      if (area) { out.area = area.area; out.city = area.city; break; }
      const city = vocab.cities.find((c) => c.toLowerCase() === near);
      if (city) { out.city = city; break; }
    }
  }
  return out;
}

/**
 * Turns a sentence into raw filters + a few flags.
 * @returns {{ filters: object, reset: boolean }}
 */
function parseSearch(message, vocab) {
  let text = clean(message);
  const filters = {};
  const reset = /\b(start over|new search|reset|clear( all)?( filters)?|from scratch|forget (that|it|everything))\b/.test(text);

  // 1) sizes and bedrooms are cut out first so their numbers are not mistaken for prices
  const notes = [];
  for (const s of parseSizes(text)) {
    if (cueBefore(text, s.index, MIN_CUES)) filters.minSize = Math.round(s.value);
    else if (cueBefore(text, s.index, MAX_CUES)) filters.maxSize = Math.round(s.value);
    else { filters.minSize = Math.round(s.value * 0.85); filters.maxSize = Math.round(s.value * 1.15); }
    if (s.unit !== 'sqft') notes.push(`${UNIT_NOTE[s.unit]}, so ${s.raw} ${s.unit} ≈ ${Math.round(s.value).toLocaleString('en-US')} sq ft`);
  }
  text = text.replace(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${UNIT_RE}(?![a-z])`, 'g'), ' SIZE ');

  const beds = parseBedrooms(text);
  if (beds) { filters.bedrooms = beds.value; text = text.replace(beds.span, ' BEDS '); }
  text = text.replace(/\d+\s*(?:bath|baths|bathroom|bathrooms)\b/g, ' ');

  // 2) prices
  const money = findMoney(text);
  const between = text.match(/(?:between|from)\s+(\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|cr|k|thousand)?)\s*(?:and|to|-)\s*(\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|cr|k|thousand)?)/)
    || text.match(/(\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|cr|k|thousand)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?|cr|k|thousand)?)/);
  if (between) {
    const amount = (str) => {
      const m = str.match(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|k|thousand)?/);
      return { raw: Number(m[1]), unit: m[2] ? UNIT[m[2]] : null };
    };
    const a = amount(between[1]);
    const b = amount(between[2]);
    // "20 to 50 lakh": the first number inherits the unit of the second
    const lo = a.raw * (a.unit || b.unit || 1);
    const hi = b.raw * (b.unit || 1);
    if (lo >= 1000 || hi >= 1000) {
      filters.minPrice = Math.min(lo, hi);
      filters.maxPrice = Math.max(lo, hi);
    }
  } else if (money.length) {
    const m = money[0];
    if (cueBefore(text, m.index, MIN_CUES)) filters.minPrice = m.value;
    else if (cueBefore(text, m.index, MAX_CUES)) filters.maxPrice = m.value;
    else if (/(?:around|about|approximately|near)\s*$/.test(text.slice(Math.max(0, m.index - 14), m.index))) {
      filters.minPrice = Math.round(m.value * 0.8);
      filters.maxPrice = Math.round(m.value * 1.2);
    } else filters.maxPrice = m.value; // a lone amount is treated as the budget
  }

  // 3) purpose and category
  const sale = hasAny(text, SALE_WORDS);
  const rent = hasAny(text, RENT_WORDS);
  if (sale && !rent) filters.purpose = 'sale';
  if (rent && !sale) filters.purpose = 'rent';
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    if (hasAny(text, words)) { filters.category = cat; break; }
  }

  // 4) places that exist in our database
  Object.assign(filters, findPlaces(text, vocab));

  // 5) sorting and one feature keyword
  if (/\b(cheapest|lowest price|cheap|affordable|low cost|cheaper)\b/.test(text)) filters.sort = 'price_asc';
  else if (/\b(most expensive|luxury|luxurious|premium|high end|priciest)\b/.test(text)) filters.sort = 'price_desc';
  else if (/\b(newest|latest|recent|new listings)\b/.test(text)) filters.sort = 'newest';
  for (const [word, q] of Object.entries(FEATURE_WORDS)) {
    if (hasWord(text, word)) { filters.q = q; break; }
  }

  return { filters, reset, notes };
}

module.exports = { parseSearch, clean, hasAny, hasWord, findMoney, LAKH, CRORE, AREA_UNITS, UNIT_RE, UNIT_NOTE, unitKey };
