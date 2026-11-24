// Place names. The cities and areas that really have listings come from the database (the "vocab").
// This file adds two things on top of that:
//   1. a list of well-known Bangladeshi places, so "flat in Sylhet" can be answered with an honest
//      "sorry, no listings there yet" instead of silently searching everywhere,
//   2. typo tolerance ("Uttora" -> Uttara, "Dhanmodi" -> Dhanmondi).
const { hasWord } = require('./nlp');

// spelling people use -> the spelling used on EstateHub
const ALIASES = {
  chittagong: 'chattogram', ctg: 'chattogram', comilla: 'cumilla', barisal: 'barishal', jessore: 'jashore',
  bogra: 'bogura', dacca: 'dhaka', narayangonj: 'narayanganj', nawabganj: 'nawabganj', sylet: 'sylhet',
  coxsbazar: "cox's bazar", 'coxs bazar': "cox's bazar", coxbazar: "cox's bazar", 'cox bazar': "cox's bazar",
  mirpur: 'mirpur', dhanmondi: 'dhanmondi', mymensing: 'mymensingh', rangpur: 'rangpur',
};

const KNOWN_CITIES = [
  'Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj',
  'Cumilla', "Cox's Bazar", 'Bogura', 'Jashore', 'Dinajpur', 'Tangail', 'Narsingdi', 'Savar', 'Faridpur', 'Pabna',
  'Noakhali', 'Feni', 'Kushtia', 'Jamalpur', 'Brahmanbaria', 'Manikganj', 'Munshiganj', 'Madaripur', 'Gopalganj',
  'Patuakhali', 'Bhola', 'Jhalakathi', 'Pirojpur', 'Bagerhat', 'Satkhira', 'Magura', 'Narail', 'Jhenaidah', 'Chuadanga',
  'Meherpur', 'Natore', 'Naogaon', 'Chapainawabganj', 'Joypurhat', 'Sirajganj', 'Gaibandha', 'Kurigram', 'Lalmonirhat',
  'Nilphamari', 'Panchagarh', 'Thakurgaon', 'Sherpur', 'Netrokona', 'Kishoreganj', 'Habiganj', 'Moulvibazar', 'Sunamganj',
  'Lakshmipur', 'Chandpur', 'Rangamati', 'Bandarban', 'Khagrachhari', 'Shariatpur', 'Rajbari', 'Barguna',
];

const KNOWN_AREAS = [
  // Dhaka
  'Gulshan', 'Banani', 'Baridhara', 'Dhanmondi', 'Mohammadpur', 'Mirpur', 'Uttara', 'Bashundhara', 'Badda', 'Rampura',
  'Motijheel', 'Khilgaon', 'Mogbazar', 'Malibagh', 'Tejgaon', 'Farmgate', 'Shyamoli', 'Lalmatia', 'Kalabagan', 'Wari',
  'Old Dhaka', 'Jatrabari', 'Demra', 'Keraniganj', 'Banasree', 'Aftabnagar', 'Niketan', 'Dhaka Cantonment', 'Bailey Road',
  'Elephant Road', 'Panthapath', 'Green Road', 'Shantinagar', 'Paltan', 'Kakrail', 'Gulistan', 'Pallabi', 'Kafrul',
  'Agargaon', 'Shewrapara', 'Tongi', 'Khilkhet', 'Nikunja', 'Mohakhali', 'Rajarbagh', 'Sayedabad', 'Shahbagh', 'Azimpur',
  'Lalbagh', 'Hazaribagh', 'Mugda', 'Basabo', 'Goran', 'Dakshinkhan', 'Turag', 'Adabor', 'Tejkunipara', 'Eskaton',
  'Moghbazar',
  // Chattogram
  'Khulshi', 'Agrabad', 'Nasirabad', 'Halishahar', 'Panchlaish', 'Chawkbazar', 'Patenga', 'Pahartali', 'Bayezid', 'Muradpur',
  'Kotwali', 'Bakalia', 'Chandgaon', 'Sholoshahar',
  // Sylhet
  'Zindabazar', 'Amberkhana', 'Upashahar', 'Subid Bazar', 'Shibganj', 'Mirabazar', 'Tilagor',
  // others
  'Boalia', 'Sonadanga', 'Khalishpur', 'Kaliganj',
];

const lc = (s) => s.toLowerCase();

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// How many typos we forgive: none for short words (too risky), 1 for 5-7 letters, 2 for longer ones.
const allowedTypos = (len) => (len >= 8 ? 2 : len >= 5 ? 1 : 0);

// Returns the best name for one typed word, or null. `names` are single words.
function fuzzyWord(word, names) {
  const max = allowedTypos(word.length);
  if (!max) return null;
  let best = null;
  for (const n of names) {
    const d = lev(word, n, max);
    if (d <= max && (!best || d < best.d)) best = { name: n, d };
  }
  return best ? best.name : null;
}

const tokens = (text) => text.split(/[^a-z']+/).filter((w) => w.length >= 5);

// Words that look like places after "in/at/near" but are not places.
const NOT_PLACES = new Set([
  'the', 'a', 'an', 'my', 'your', 'our', 'any', 'all', 'this', 'that', 'these', 'those', 'good', 'best', 'nice', 'new', 'old',
  'safe', 'quiet', 'cheap', 'budget', 'price', 'range', 'general', 'total', 'bangladesh', 'town', 'city', 'area', 'areas', 'place',
  'places', 'location', 'locations', 'country', 'market', 'markets', 'detail', 'details', 'short', 'long', 'case', 'order', 'time',
  'future', 'advance', 'person', 'stock', 'bulk', 'depth', 'fact', 'need', 'hand', 'mind', 'touch', 'brief', 'total', 'average',
  'lakh', 'crore', 'taka', 'rent', 'sale', 'flat', 'flats', 'apartment', 'apartments', 'house', 'houses', 'land', 'plot', 'shop',
  'office', 'commercial', 'home', 'bedroom', 'bedrooms', 'sqft', 'ground', 'floor', 'building', 'project', 'society', 'community',
  'residential', 'proper', 'prime', 'busy', 'peaceful', 'posh', 'affordable', 'luxury', 'family', 'bachelor', 'bachelors', 'student',
  'students', 'one', 'two', 'three', 'four', 'five', 'six', 'near', 'here', 'there', 'estatehub', 'estateai', 'which', 'what',
  'where', 'how', 'who', 'when', 'case', 'month', 'months', 'year', 'years', 'week', 'weeks', 'day', 'days', 'dhaka',
]);

/**
 * Finds places the user named that are NOT in our listings.
 * @returns {string[]} display names, e.g. ['Sylhet']
 */
function findUnknownPlaces(text, vocab, alreadyFound = {}) {
  const have = new Set([...vocab.cities, ...vocab.areas.map((a) => a.area)].map(lc));
  const out = [];
  const add = (name) => { if (!out.some((o) => lc(o) === lc(name))) out.push(name); };

  // 1) well-known places (exact or by alias)
  for (const [alias, real] of Object.entries(ALIASES)) {
    if (hasWord(text, alias) && !have.has(real)) {
      const display = [...KNOWN_CITIES, ...KNOWN_AREAS].find((p) => lc(p) === real);
      if (display) add(display);
    }
  }
  for (const name of [...KNOWN_AREAS, ...KNOWN_CITIES]) {
    const n = lc(name);
    if (have.has(n)) continue;
    // "Dhanmondi 27" must not also report plain "Dhanmondi" twice; longer names are tested first by being listed first
    if (hasWord(text, n)) add(name);
  }

  // 2) a typo of a well-known place that we do not have
  const single = [...KNOWN_AREAS, ...KNOWN_CITIES].filter((p) => !/[ ']/.test(p)).map(lc);
  const vocabSingle = [...have].filter((p) => !/[ ']/.test(p));
  for (const w of tokens(text)) {
    if (vocabSingle.includes(w) || single.includes(w)) continue;
    if (fuzzyWord(w, vocabSingle)) continue; // it is a typo of a place we DO have
    const near = fuzzyWord(w, single);
    if (near && !have.has(near)) add([...KNOWN_AREAS, ...KNOWN_CITIES].find((p) => lc(p) === near));
  }

  // 3) "in <word>" where the word is nothing we know at all (e.g. "flat in Narnia")
  if (!alreadyFound.area && !alreadyFound.city && out.length === 0) {
    const m = text.match(/\b(?:in|at|near|around|nearby)\s+([a-z][a-z-]{3,})\b/);
    if (m) {
      const w = m[1];
      const known = vocabSingle.includes(w) || single.includes(w) || NOT_PLACES.has(w) || ALIASES[w] || fuzzyWord(w, [...vocabSingle, ...single]);
      if (!known) add(w.charAt(0).toUpperCase() + w.slice(1));
    }
  }
  return out;
}

module.exports = { ALIASES, KNOWN_CITIES, KNOWN_AREAS, lev, fuzzyWord, allowedTypos, findUnknownPlaces };
