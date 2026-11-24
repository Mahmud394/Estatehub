// EstateAI: understands a chat message, looks at the REAL data on EstateHub, and writes a reply.
//
// What is AI and what is not:
//   - understanding the sentence: rule parser (always, with typo tolerance and Banglish) + optional LLM (LLM_API_KEY)
//   - finding properties, prices, areas and brokers: normal SQL queries on approved + available listings
//   - the reply text: written by our own templates from those real results
// So the assistant can never make up a property, a price, an area or a broker. When something does not exist
// it says sorry and shows what does exist.
const env = require('../config/env');
const { query } = require('../config/db');
const { searchPublic } = require('./propertyService');
const realInsights = require('./ai/insights');
const { parseSearch, clean, hasAny } = require('./ai/nlp');
const { sanitizeFilters, mergeFilters, countActive } = require('./ai/filters');
const { extractWithLlm } = require('./ai/llmClient');
const { bestEntry, glossaryEntry, isQuestion } = require('./ai/knowledge');
const { findUnknownPlaces } = require('./ai/places');
const { convertUnits } = require('./ai/units');

const RESULT_LIMIT = 6;

// ---- vocabulary: the cities and areas that really exist in our listings (cached for a minute) ----
let vocabCache = { at: 0, value: null };
async function loadVocab() {
  if (vocabCache.value && Date.now() - vocabCache.at < 60000) return vocabCache.value;
  const rows = await query(
    `SELECT DISTINCT city, area FROM properties
     WHERE approval_status = 'approved' AND availability_status = 'available' AND city <> '' AND area <> ''`
  );
  const value = { cities: [...new Set(rows.map((r) => r.city))], areas: rows.map((r) => ({ city: r.city, area: r.area })) };
  vocabCache = { at: Date.now(), value };
  return value;
}

// ---- wording helpers ----
function formatBdt(n, purpose) {
  const x = Number(n);
  const t = (v) => Number(v.toFixed(2)).toString();
  let text;
  if (x >= 10000000) text = `৳${t(x / 10000000)} Crore`;
  else if (x >= 100000) text = `৳${t(x / 100000)} Lakh`;
  else text = `৳${x.toLocaleString('en-US')}`;
  return purpose === 'rent' ? `${text}/month` : text;
}

function describe(f) {
  const kind = { apartment: 'apartment', house: 'house', land: 'land', commercial: 'commercial property' }[f.category] || 'property';
  let s = '';
  if (f.bedrooms) s += `${f.bedrooms}+ bedroom `;
  s += kind;
  if (f.purpose) s += f.purpose === 'rent' ? ' for rent' : ' for sale';
  const place = [f.area, f.city].filter(Boolean).join(', ');
  if (place) s += ` in ${place}`;
  if (f.minPrice !== undefined && f.maxPrice !== undefined) s += `, ${formatBdt(f.minPrice)} to ${formatBdt(f.maxPrice, f.purpose)}`;
  else if (f.maxPrice !== undefined) s += `, up to ${formatBdt(f.maxPrice, f.purpose)}`;
  else if (f.minPrice !== undefined) s += `, from ${formatBdt(f.minPrice, f.purpose)}`;
  if (f.minSize !== undefined && f.maxSize !== undefined) s += `, ${f.minSize}-${f.maxSize} sqft`;
  else if (f.minSize !== undefined) s += `, at least ${f.minSize} sqft`;
  else if (f.maxSize !== undefined) s += `, up to ${f.maxSize} sqft`;
  if (f.q) s += `, mentioning "${f.q}"`;
  return s;
}

function searchPath(f) {
  const p = new URLSearchParams();
  for (const k of ['purpose', 'category', 'city', 'area', 'minPrice', 'maxPrice', 'minSize', 'maxSize', 'bedrooms', 'q', 'sort']) {
    if (f[k] !== undefined) p.set(k, String(f[k]));
  }
  const qs = p.toString();
  return qs ? `/properties?${qs}` : '/properties';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A tappable suggestion that runs a search with exact filters (no guessing from text).
const chip = (label, filters) => ({ label, filters });

const STARTERS = [
  '3 bedroom apartment for sale in Uttara',
  'Flat for rent under 30000',
  'Which areas do you have?',
  'Best brokers',
  'How do I contact a broker?',
];

const ADVICE = ['legal', 'lawyer', 'mortgage', 'loan', 'tax', 'invest', 'investment', 'registration', 'deed', 'stamp duty', 'financing'];
const GREETING = /^(hi|hello|hey|hola|salam|assalamu alaikum|assalamualaikum|good (morning|afternoon|evening)|kemon acho|kemon achen)\b/;
const THANKS = /^(thanks|thank you|thx|ty|dhonnobad|dhanyabad|ধন্যবাদ|thank u)\b/;
const BYE = /^(bye|goodbye|see you|allah hafez|khoda hafez|ok bye)\b/;
const SEARCHY = /\b(show|find|search|looking|look for|want|need|list|properties|property|listings|available|options|more)\b/;
const ADVICE_NOTE = ' I cannot give legal or financial advice, so please speak to a qualified lawyer or your bank about that part.';

// ---- what kind of question is it? ----
const PROPERTY_WORDS = /\b(flat|flats|apartment|apartments|house|houses|land|plot|plots|shop|shops|office|offices|property|properties|rent|sale|commercial|home|homes)\b/;
const AREAS_Q = /\b(which|what|list|show|tell|available|all)\b.*\b(areas?|cities|city|locations?|places?|neighbou?rhoods?)\b|\bwhere\b.*\b(listings?|properties|flats?|available)\b|\bareas? (do you|you)\b/;
const COUNT_Q = /\bhow many\b.*\b(propert|listing|broker|agent|flat|apartment|house|land|plot|shop|office)/;
const STATS_Q = /\b(average|avg|typical|price range|range of prices?|how much (is|are|does|do|would|will)|what (is|are) the (current )?(price|prices|rent|rents|rate|rates|cost)|market (price|rate)|price (of|for)|rent (of|for)|rate of|cost of|koto|koto taka)\b/;
const BROKER_Q = /\b(best|top|good|great|recommended?|trusted|verified|reliable|rated)\s+(?:\w+\s+){0,2}(brokers?|agents?|dealers?)\b|\b(brokers?|agents?)\s+(in|at|near|of|from|for)\b|\bwho (are|is)\b.*\b(brokers?|agents?)\b|\b(suggest|recommend|show|find|list)\b.*\b(brokers?|agents?)\b/;
const BROKER_ABOUT = /\b(mean|means|badge|how (do|to|can)|why|what does)\b/;

function detectInsight(text, hasPlaceOrType) {
  if (BROKER_Q.test(text) && !BROKER_ABOUT.test(text)) return 'brokers';
  if (COUNT_Q.test(text)) return 'count';
  if (AREAS_Q.test(text) && !/\bhow (do|can|to)\b/.test(text)) return 'areas';
  if (STATS_Q.test(text) && (hasPlaceOrType || PROPERTY_WORDS.test(text))) return 'stats';
  return null;
}

/**
 * @param {{message: string, context?: object, apply?: boolean}} input
 *   apply = true means "context holds exact filters from a suggestion the user tapped: just search with them".
 * @param {{loadVocab?, search?, extract?, insights?}} deps   replaced in tests so they need no database or network
 */
async function chat({ message, context, apply }, deps = {}) {
  const vocabLoader = deps.loadVocab || loadVocab;
  const search = deps.search || searchPublic;
  const insights = deps.insights || realInsights;
  const extract = deps.extract || ((msg, vocab) => extractWithLlm(msg, vocab, env.llm));

  const vocab = await vocabLoader();
  const text = clean(message);
  const tools = { search, insights, vocab };

  // 1) a suggestion button: exact filters, no text understanding needed
  if (apply) {
    const exact = sanitizeFilters(context, vocab);
    if (countActive(exact) > 0) {
      return { ...baseReply('rules', exact), ...(await runSearch(exact, tools, {})), intent: 'search', mode: 'rules' };
    }
  }

  const rules = parseSearch(message, vocab);
  const previous = rules.reset ? {} : sanitizeFilters(context, vocab);
  const base = (mode) => baseReply(mode, previous);
  const advice = hasAny(text, ADVICE);
  const active = countActive(rules.filters);

  // 2) unit conversion (katha, decimal, bigha, acre, sq ft)
  const converted = convertUnits(text);
  if (converted) return { ...base('rules'), intent: 'convert', reply: converted };

  // 3) questions about the data on the site: prices, areas, counts, brokers
  const hasPlaceOrType = !!(rules.filters.city || rules.filters.area || rules.filters.category || rules.filters.purpose);
  const insight = detectInsight(text, hasPlaceOrType);
  const unknown = findUnknownPlaces(text, vocab, rules.filters);
  if (insight) {
    const f = mergeFilters(previous, rules.filters);
    if (unknown.length) return { ...base('rules'), ...(await sorryPlace(unknown, f, tools)), intent: insight };
    return { ...base('rules'), ...(await answerInsight(insight, f, tools)), intent: insight };
  }

  // 4) questions about how EstateHub works, or what a word means
  const gloss = glossaryEntry(text);
  if (gloss && active <= 1) return { ...base('rules'), intent: 'faq', reply: gloss.answer };
  const faq = bestEntry(text);
  const faqOk = faq && ((isQuestion(text) && (faq.score >= 2 ? active <= 2 : active <= 1)) || (faq.score >= 2 && active === 0));
  if (faqOk) return { ...base('rules'), intent: 'faq', reply: faq.entry.answer, link: faq.entry.link || null };

  // 5) a property search. Optional smart mode (LLM) fills gaps the rules missed; the rules win where they found something.
  const llm = await extract(message, vocab); // null when smart mode is off or failed
  const mode = llm ? 'llm' : 'rules';
  const found = { ...(llm ? llm.filters : {}), ...rules.filters };
  const reset = rules.reset || (llm ? llm.reset : false);
  const prev = reset ? {} : previous;
  const wantsSearch =
    countActive(found) > 0 ||
    (found.sort && countActive(prev) > 0) ||
    (llm && llm.intent === 'search' && !bestEntry(text));

  if (wantsSearch || SEARCHY.test(text)) {
    const merged = mergeFilters(prev, found);
    if (unknown.length) return { ...baseReply(mode, prev), ...(await sorryPlace(unknown, merged, tools)), intent: 'search' };
    return { ...baseReply(mode, prev), ...(await runSearch(merged, tools, { advice, notes: rules.notes })), intent: 'search', mode };
  }

  if (reset) return { ...baseReply(mode, {}), intent: 'reset', reply: 'Okay, starting fresh. What are you looking for?' };
  if (THANKS.test(text)) return { ...base(mode), intent: 'thanks', reply: 'You are welcome! Ask me anything else about properties or EstateHub.' };
  if (BYE.test(text)) return { ...base(mode), intent: 'bye', reply: 'Goodbye! Come back any time you want to look at properties.' };
  if (GREETING.test(text)) {
    return { ...base(mode), intent: 'greeting', reply: 'Hello! I am EstateAI. Tell me what kind of property you want, where, and your budget, and I will search the listings on EstateHub. You can also ask about prices, areas, brokers or how the site works.' };
  }
  if (advice) {
    return { ...base(mode), intent: 'advice', reply: 'I cannot give legal or financial advice. Please speak to a qualified lawyer or your bank. I can help you find properties or explain how EstateHub works.' };
  }
  return {
    ...base(mode), intent: 'other',
    reply: 'Sorry, I did not understand that, or it is outside what I can help with. I can search EstateHub listings, tell you the available areas, average prices and verified brokers, convert katha or decimal to square feet, and explain how EstateHub works. For example: "2 bedroom flat for rent in Mirpur under 25000".',
  };
}

function baseReply(mode, filters) {
  return { mode, filters, listings: [], total: 0, relaxed: [], brokers: [], suggestions: STARTERS, searchPath: null, link: null };
}

// ---------- searching ----------
async function runSearch(filters, tools, { advice = false, notes = [] } = {}) {
  const { search, insights } = tools;
  const run = (f, limit = RESULT_LIMIT) => search({ ...f, sort: f.sort || 'newest', page: 1, limit });
  const result = await run(filters);
  const total = result.pagination.total;
  const wanted = describe(filters);
  const tail = (notes.length ? `\n(${notes.join('; ')}.)` : '') + (advice ? ADVICE_NOTE : '');

  if (total > 0) {
    const order = filters.sort === 'price_asc' ? ' (cheapest first)' : filters.sort === 'price_desc' ? ' (most expensive first)' : '';
    const more = total > result.items.length ? ` Here are the first ${result.items.length}.` : '';
    return {
      reply: `I found ${plural(total, 'listing')} for "${wanted}"${order}.${more}${tail}`,
      filters, listings: result.items, total, relaxed: [],
      suggestions: await followUps(filters, tools),
      searchPath: searchPath(filters),
    };
  }

  // Nothing matches. Say sorry, then show what DOES exist that is close, each with its real count.
  const alts = await findAlternatives(filters, search);
  let reply = `Sorry, I could not find any ${wanted} on EstateHub right now.`;
  if (alts.length) {
    reply += '\n\nThese are close and available. Tap one to see the listings:\n' + alts.map((a) => `• ${a.label}`).join('\n');
  } else {
    reply += '\n\nThere is nothing similar at the moment. You can ask "Which areas do you have?" to see where listings are available.';
  }
  return {
    reply: reply + tail, filters, listings: [], total: 0, relaxed: [],
    suggestions: [...alts.map((a) => chip(a.label, a.filters)), 'Which areas do you have?', 'Start over'].slice(0, 5),
    searchPath: null,
  };
}

// One relaxation at a time. Purpose, category and city are never changed (a "rent" search must not turn into "sale").
// Every alternative shows its real count and its lowest price, so nothing is promised that does not exist.
async function findAlternatives(filters, search) {
  const tries = [];
  for (const key of ['q', 'minSize', 'maxSize', 'bedrooms', 'area', 'maxPrice', 'minPrice']) {
    if (filters[key] === undefined) continue;
    if (key === 'maxPrice') {
      tries.push({ f: { ...filters, maxPrice: Math.round(filters.maxPrice * 1.3) } });
      const f = { ...filters }; delete f.maxPrice; tries.push({ f });
    } else {
      const f = { ...filters }; delete f[key]; tries.push({ f });
    }
  }
  if (filters.area) { // "any area in this city" is a useful last step
    const f = { ...filters }; delete f.area; delete f.bedrooms; delete f.q;
    tries.push({ f });
  }
  const results = await Promise.all(tries.map((t) => search({ ...t.f, sort: 'price_asc', page: 1, limit: 1 })));
  const seen = new Set();
  const out = [];
  results.forEach((r, i) => {
    const n = r.pagination.total;
    if (n === 0 || seen.has(n)) return; // the same number of listings means (almost always) the same listings
    seen.add(n);
    const from = r.items[0] ? `, from ${formatBdt(r.items[0].price, tries[i].f.purpose)}` : '';
    out.push({ n, filters: tries[i].f, label: `${plural(n, 'listing')}${from}: ${describe(tries[i].f)}` });
  });
  return out.slice(0, 3);
}

// Suggestions after a successful search: other areas with the same kind of listing, a budget, sorting.
async function followUps(filters, { insights }) {
  const out = [];
  if (!filters.purpose) out.push('Only for rent', 'Only for sale');
  try {
    const areas = await insights.areaCounts(filters);
    for (const a of areas.filter((x) => x.area !== filters.area).slice(0, 2)) {
      out.push(chip(`Same in ${a.area} (${a.n})`, { ...filters, area: a.area, city: a.city }));
    }
  } catch { /* suggestions are optional */ }
  if (filters.maxPrice === undefined) out.push(filters.purpose === 'rent' ? 'Under 30000' : 'Under 1 crore');
  if (filters.sort !== 'price_asc') out.push('Cheapest first');
  out.push('Start over');
  return out.slice(0, 5);
}

// ---------- places we do not have ----------
async function sorryPlace(unknown, filters, tools) {
  const { search, insights } = tools;
  const names = unknown.join(' or ');
  let reply = `Sorry, EstateHub does not have any listings in ${names} right now.`;
  const suggestions = [];

  // If a place we DO have was also mentioned, offer it with its real count.
  if (filters.city || filters.area) {
    const f = { ...filters }; delete f.area; delete f.bedrooms;
    const r = await search({ ...f, sort: 'newest', page: 1, limit: 1 });
    if (r.pagination.total > 0 && f.city) {
      reply += `\n\nI do have ${plural(r.pagination.total, 'listing')} in ${f.city}.`;
      suggestions.push(chip(`${plural(r.pagination.total, 'listing')}: ${describe(f)}`, f));
    }
  }
  try {
    const rows = await insights.areaOverview({ purpose: filters.purpose, category: filters.category });
    if (rows.length) {
      reply += '\n\nPlaces with available listings:\n' + overviewLines(rows);
      for (const r of rows.slice(0, 3)) suggestions.push(chip(`${r.area} (${r.n})`, { ...filters, city: r.city, area: r.area }));
    } else if (!suggestions.length) {
      reply += ' There are no available listings on the site at the moment.';
    }
  } catch { /* optional */ }
  suggestions.push('Start over');
  return { reply, filters: stripPlace(filters), listings: [], total: 0, relaxed: [], suggestions: suggestions.slice(0, 5), searchPath: null };
}
const stripPlace = (f) => { const o = { ...f }; return o; };

function overviewLines(rows) {
  const byCity = new Map();
  for (const r of rows) {
    if (!byCity.has(r.city)) byCity.set(r.city, []);
    byCity.get(r.city).push(r);
  }
  return [...byCity.entries()].slice(0, 6)
    .map(([city, list]) => `• ${city}: ${list.slice(0, 6).map((r) => `${r.area} (${r.n})`).join(', ')}`).join('\n');
}

// ---------- questions answered from real data ----------
async function answerInsight(kind, f, tools) {
  const { insights } = tools;

  if (kind === 'areas') {
    const rows = await insights.areaOverview({ purpose: f.purpose, category: f.category });
    if (!rows.length) {
      return { reply: `Sorry, there are no available ${f.category || 'property'} listings${f.purpose ? ` for ${f.purpose}` : ''} on EstateHub right now.`, suggestions: ['Start over'] };
    }
    return {
      reply: `EstateHub has available listings in these places (number of listings in brackets):\n${overviewLines(rows)}`,
      suggestions: [...rows.slice(0, 4).map((r) => chip(`${r.area} (${r.n})`, { ...f, city: r.city, area: r.area })), 'Start over'],
    };
  }

  if (kind === 'count') {
    if (countActive(f) === 0) {
      const c = await insights.siteCounts();
      return { reply: `EstateHub currently has ${plural(c.listings, 'available listing')} (${c.forSale} for sale and ${c.forRent} for rent) and ${plural(c.brokers, 'verified broker')}.`, searchPath: '/properties' };
    }
    const st = await insights.priceStats(f);
    if (st.count === 0) return { reply: `Sorry, there are no available ${describe(f)} on EstateHub right now.`, suggestions: ['Which areas do you have?', 'Start over'] };
    return { reply: `There ${st.count === 1 ? 'is' : 'are'} ${plural(st.count, 'available listing')} for "${describe(f)}".`, searchPath: searchPath(f), filters: f };
  }

  if (kind === 'stats') {
    const g = { ...f }; delete g.minPrice; delete g.maxPrice; delete g.sort;
    const parts = g.purpose ? [g.purpose] : ['rent', 'sale'];
    const blocks = [];
    for (const purpose of parts) {
      const h = { ...g, purpose };
      const st = await insights.priceStats(h);
      if (st.count === 0) continue;
      blocks.push(
        `For ${describe(h).replace(/^property/, 'all property types')} (${plural(st.count, 'listing')}):\n` +
        `• Lowest: ${formatBdt(st.min, purpose)}\n• Average: ${formatBdt(st.avg, purpose)}\n• Highest: ${formatBdt(st.max, purpose)}` +
        (st.count < 5 ? '\n(Only a few listings, so treat this as a rough guide.)' : ''));
    }
    if (!blocks.length) {
      return { reply: `Sorry, there are no available ${describe({ ...g, purpose: g.purpose })} on EstateHub right now, so I cannot give a price.`, suggestions: ['Which areas do you have?', 'Start over'] };
    }
    return { reply: `${blocks.join('\n\n')}\n\nThese numbers come only from the listings on EstateHub, not from the whole market.`, filters: f, searchPath: searchPath(g) };
  }

  if (kind === 'brokers') {
    const g = { ...f }; delete g.minPrice; delete g.maxPrice; delete g.sort; delete g.bedrooms; delete g.q;
    let list = await insights.topBrokers(g);
    let reply;
    const where = g.area ? ` in ${g.area}` : g.city ? ` in ${g.city}` : '';
    if (list.length) {
      reply = `Here ${list.length === 1 ? 'is a verified broker' : 'are verified brokers'}${where ? ` with listings${where}` : ''}, best rated first:`;
    } else if (g.area || g.city || g.category || g.purpose) {
      list = await insights.topBrokers({});
      reply = list.length
        ? `Sorry, no verified broker has matching listings${where} right now. These are the top verified brokers overall:`
        : 'Sorry, there are no verified brokers with available listings right now.';
    } else {
      reply = 'Sorry, there are no verified brokers with available listings right now.';
    }
    if (list.length) {
      reply += '\n' + list.map((b) => `• ${b.name}${b.companyName ? ` (${b.companyName})` : ''}: ${b.averageRating === null ? 'no reviews yet' : `★ ${b.averageRating} from ${plural(b.reviewCount, 'review')}`}, ${plural(b.listings, 'listing')}`).join('\n');
      reply += '\nOpen a profile below to read reviews and send a message.';
    }
    return { reply, brokers: list };
  }
  return { reply: 'Sorry, I could not work that out.' };
}

function status() {
  return { mode: env.llm.apiKey && typeof globalThis.fetch === 'function' ? 'llm' : 'rules' };
}

module.exports = { chat, status, formatBdt, describe, loadVocab, STARTERS };
