// Land and area unit conversion (katha, bigha, decimal, acre, sq ft, sq m). Pure maths, no database.
const { AREA_UNITS, UNIT_RE, unitKey, UNIT_NOTE } = require('./nlp');

const SQFT_TO = { katha: 720, bigha: 14400, decimal: 435.6, acre: 43560, 'sq m': 10.7639 };
const norm = (k) => ({ kathas: 'katha', bighas: 'bigha', decimals: 'decimal', shotok: 'decimal', shatak: 'decimal', acres: 'acre', sqm: 'sq m' }[k] || k);
const fmt = (n) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : Number(n.toFixed(2)).toString());

/**
 * Looks for "5 katha to sqft", "convert 2 bigha", "how many sqft in 1 decimal".
 * @returns {string|null} a reply, or null if the text is not a conversion question
 */
function convertUnits(text) {
  const wantsConvert = /\b(convert|conversion|how many|equal|equals|in sq ?ft|to sq ?ft|in square|to square|how much is|kata|=)\b|\b(to|in|into)\s+(sqft|sq ft|sft|katha|decimal|bigha|acre|sqm|square)/.test(text);
  const m = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})(?![a-z])`));
  if (!m || !wantsConvert) return null;
  const raw = Number(m[1]);
  const key = norm(unitKey(m[2]));
  const factor = key === 'sqft' ? 1 : AREA_UNITS[key] ?? AREA_UNITS[`${key}s`];
  if (!factor) return null;
  const sqft = raw * factor;
  const lines = [`${fmt(raw)} ${key === 'sqft' ? 'sq ft' : key} is about:`];
  lines.push(`• ${fmt(sqft)} sq ft`);
  for (const [unit, per] of Object.entries(SQFT_TO)) {
    if (unit === key) continue;
    const v = sqft / per;
    if (v >= 0.01) lines.push(`• ${fmt(v)} ${unit}${unit !== 'sq m' && v !== 1 ? (unit === 'bigha' ? 's' : 's') : ''}`);
  }
  lines.push('', 'Note: a katha and a bigha differ by region. I used 1 katha = 720 sq ft (common in Dhaka) and 1 bigha = 20 katha, so please confirm the real size on the land papers.');
  return lines.join('\n');
}

module.exports = { convertUnits, UNIT_NOTE };
