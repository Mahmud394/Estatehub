// Answers to "how does EstateHub work?" and "what does this word mean?" questions.
// Every answer describes something the app really does (nothing here is invented), so EstateAI can answer without a
// language model. Keywords with a space are phrases and count double. Banglish spellings are included on purpose.
const { hasWord } = require('./nlp');

const ENTRIES = [
  {
    id: 'about',
    keywords: ['what is estatehub', 'about estatehub', 'about this site', 'about this website', 'about this platform', 'what is this site', 'what is this website', 'what is this platform', 'what does estatehub do', 'tell me about estatehub', 'estatehub ki'],
    answer: 'EstateHub is a real estate marketplace for Bangladesh. You can search land, apartments, houses and commercial properties for sale or rent (all prices in BDT), message verified brokers, save favourites and read or write broker reviews. Brokers add listings and an admin approves each one before it goes public.',
    link: { label: 'Browse properties', to: '/properties' },
  },
  {
    id: 'features',
    keywords: ['what features', 'what can i do', 'features', 'what can you do on', 'what does it offer', 'services', 'facilities'],
    answer: 'On EstateHub you can: search and filter listings (sale or rent, type, city, area, price, bedrooms, size), save favourites, message verified brokers privately, comment publicly on a listing, rate and review brokers, get notifications, and report anything suspicious. Brokers can add and manage listings with photos. Admins approve listings, verify brokers and moderate content.',
  },
  {
    id: 'roles',
    keywords: ['difference between', 'roles', 'types of account', 'account types', 'client vs broker', 'client and broker', 'what is an admin', 'what does an admin', 'what is a client', 'what is a broker'],
    answer: 'There are three account types. Client: search, save favourites, message brokers, comment and review. Broker: everything a client can do, plus add listings and answer messages; a broker must be verified by an admin before clients can message or review them. Admin: approves listings, verifies brokers, handles reports and suspends accounts when needed.',
  },
  {
    id: 'contact',
    keywords: ['contact', 'message', 'talk to', 'reach', 'phone', 'call', 'chat with', 'speak', 'contact broker', 'contact a broker', 'yogayog', 'jogajog'],
    answer: 'To contact a broker, log in with a client account and use the "Message" box on the property page. Messages are private. Only verified brokers can be messaged. Phone numbers are not shown publicly.',
    link: { label: 'Browse properties', to: '/properties' },
  },
  {
    id: 'viewing',
    keywords: ['visit', 'viewing', 'book', 'appointment', 'schedule', 'see the property', 'tour', 'inspect', 'dekhte'],
    answer: 'EstateHub does not have online booking yet. To arrange a viewing, send the broker a message from the property page and agree on a time with them.',
  },
  {
    id: 'favorites',
    keywords: ['favorite', 'favourite', 'favorites', 'favourites', 'save', 'saved', 'wishlist', 'bookmark', 'heart', 'shortlist'],
    answer: 'Tap the heart on any property to save it. Saved properties are in your account menu under "Saved properties". Favourites are available to client accounts.',
  },
  {
    id: 'reviews',
    keywords: ['review', 'reviews', 'rating', 'rate a broker', 'rate', 'stars', 'feedback', 'testimonial'],
    answer: 'After you have sent a broker a message, you can give them a 1 to 5 star rating and a written review on their profile page. You can edit or delete your own review later. Each client can review a broker once. Reviews that break the rules can be hidden by an admin.',
    link: { label: 'Find a broker', to: '/brokers' },
  },
  {
    id: 'comments',
    keywords: ['comment', 'comments', 'public question', 'ask publicly'],
    answer: 'Every listing has a public comments section for questions. Client accounts and the listing\'s own broker can post. For private questions, use the message box instead.',
  },
  {
    id: 'list',
    keywords: ['list my', 'sell my', 'add property', 'add a property', 'post a property', 'post my', 'advertise', 'upload a property', 'listing my', 'rent out', 'become a broker', 'broker account', 'how to list', 'add listing', 'post listing', 'list a property'],
    answer: 'To list a property, register as a broker, open your dashboard and choose "Add property". Fill in the details and upload photos. New and edited listings are reviewed and approved by an admin before they appear publicly.',
    link: { label: 'Create an account', to: '/register' },
  },
  {
    id: 'photos',
    keywords: ['photo', 'photos', 'image', 'images', 'picture', 'pictures', 'upload photo', 'photo size', 'how many photos'],
    answer: 'A listing can have up to 12 photos. Use JPG, PNG or WebP files of 4 MB or less each. The first photo is the main one shown in search results, and you can change which photo is the main one.',
  },
  {
    id: 'approval',
    keywords: ['approval', 'approve', 'approved', 'pending', 'rejected', 'why is my listing', 'listing not showing', 'not visible', 'not showing', 'how long', 'review time', 'waiting'],
    answer: 'Every new listing is "Pending" until an admin approves it, and only approved, available listings are public. If an admin rejects a listing, the reason is shown on your listings page so you can fix it. Editing important details of an approved listing can send it for review again.',
  },
  {
    id: 'status',
    keywords: ['sold', 'rented', 'unavailable', 'mark as sold', 'availability', 'mark sold', 'mark rented', 'no longer available', 'stop showing'],
    answer: 'A broker can mark a listing as available, sold, rented or unavailable. Only available listings appear in search and in my answers, so sold or rented listings are hidden automatically.',
  },
  {
    id: 'edit_delete',
    keywords: ['edit listing', 'edit my listing', 'delete listing', 'delete my listing', 'remove listing', 'change price', 'update listing', 'edit property', 'delete property'],
    answer: 'Brokers can edit or delete their own listings from the broker dashboard. Other brokers and clients cannot change them. After you change important details of an approved listing, an admin may need to approve it again.',
  },
  {
    id: 'verified',
    keywords: ['verified', 'verification', 'trust', 'trusted', 'genuine', 'scam', 'fraud', 'fake', 'safe', 'safety', 'secure', 'cheat', 'is it safe'],
    answer: 'A "Verified broker" badge means an EstateHub admin approved that broker\'s profile. Listings are also approved by an admin before they are public. Still, always visit a property and check the papers yourself before paying anything, and never send money to someone you have not met. You can report a listing or broker that looks suspicious.',
  },
  {
    id: 'payments',
    keywords: ['is it free', 'free to use', 'payment', 'pay', 'fee', 'fees', 'commission', 'charge', 'charges', 'free', 'cost to use', 'subscription', 'how much does estatehub', 'advance', 'booking money', 'token money'],
    answer: 'EstateHub does not process payments and the website does not take any money from you. Any price, advance or deal is arranged directly with the broker or owner, so do not pay before you have visited the property and checked the details.',
  },
  {
    id: 'price',
    keywords: ['currency', 'bdt', 'taka', 'lakh', 'crore', 'per month', 'which currency', 'price format'],
    answer: 'All prices are in Bangladeshi Taka (BDT). Sale prices are shown in Lakh and Crore (1 Lakh = 100,000 and 1 Crore = 10,000,000). Rent is per month.',
  },
  {
    id: 'search_help',
    keywords: ['how to search', 'how do i search', 'how can i find', 'filter', 'filters', 'search page', 'find a property', 'find property', 'search property', 'how to find'],
    answer: 'Use the Search page to filter by sale or rent, property type, city, area, price range, bedrooms and size, and sort by newest or price. Or just tell me in plain words, for example "2 bedroom flat for rent in Mirpur under 25000", and I will search for you.',
    link: { label: 'Open search', to: '/properties' },
  },
  {
    id: 'account',
    keywords: ['register', 'sign up', 'signup', 'login', 'log in', 'account', 'join', 'create account', 'registration'],
    answer: 'Choose "Get Started" in the top bar to register as a client (to search, save, message and review) or as a broker (to list properties). You need an account to message brokers, save favourites and write reviews, but anyone can browse listings.',
    link: { label: 'Create an account', to: '/register' },
  },
  {
    id: 'password',
    keywords: ['forgot password', 'forget password', 'reset password', 'lost password', 'change password', 'password reset', 'cannot login', "can't login", 'password bhule', 'password vule'],
    answer: 'Password reset by email is not available yet. If you cannot log in, please contact the EstateHub administrator. If your account was suspended, the administrator can also reactivate it.',
  },
  {
    id: 'delete_account',
    keywords: ['delete my account', 'delete account', 'close my account', 'remove my account', 'deactivate'],
    answer: 'Self-service account deletion is not available yet. Please contact the EstateHub administrator if you want your account removed.',
  },
  {
    id: 'notifications',
    keywords: ['notification', 'notifications', 'email', 'emails', 'alert', 'alerts', 'bell'],
    answer: 'The bell in the top bar shows new comments, messages, reviews and listing decisions. If email is set up, you also get a short email with a link back to the site. Emails never contain the text of your messages.',
  },
  {
    id: 'report',
    keywords: ['report', 'complain', 'complaint', 'abuse', 'spam', 'inappropriate', 'report a listing', 'report a broker', 'report listing', 'suspicious'],
    answer: 'To report a listing, comment, review or broker, log in and click "Report" next to it, then explain the problem in 10 to 500 characters. Only administrators see your report, and the person you reported is not told who sent it. Admins review reports and can hide content or suspend accounts.',
  },
  {
    id: 'privacy',
    keywords: ['privacy', 'private', 'who can see', 'who can read', 'who reads', 'can anyone read', 'can admin read', 'my data', 'personal information', 'personal data', 'confidential', 'read my messages', 'see my messages'],
    answer: 'Your messages are private between you and the broker. Other users see your name only as a first name and last initial. An administrator can open a conversation only for moderation, in read-only mode, and every such access is recorded in an audit log. I do not save our chat.',
  },
  {
    id: 'ai_cost',
    keywords: ['estateai', 'assistant', 'what can you do', 'who are you', 'what are you', 'how do you work', 'chatbot', 'are you ai', 'are you real', 'are you a bot', 'help me', 'help'],
    answer: 'I am EstateAI, the assistant of EstateHub. I can search the real listings from your description, tell you which areas and price ranges are available, suggest verified brokers, convert katha/decimal to square feet, and explain how EstateHub works. I only use real data from the site, so I never invent a property, price or broker, and if something is not available I will say sorry. I cannot give legal or financial advice.',
  },
  {
    id: 'creator',
    keywords: ['who made you', 'who created you', 'who built you', 'who made estatehub', 'who built estatehub', 'who developed', 'developer', 'who owns'],
    answer: 'I am EstateAI, an assistant built into EstateHub. I am a computer program, not a person, and I only know what is on this website. For questions about the people behind the site, please contact the EstateHub administrator.',
  },
  {
    id: 'limits',
    keywords: ['mortgage', 'home loan', 'bank loan', 'emi', 'legal advice', 'lawyer', 'tax advice', 'registration cost', 'stamp duty', 'invest', 'investment advice'],
    answer: 'I cannot give legal, tax or financial advice, so please talk to a qualified lawyer or your bank about loans, registration costs, taxes and investment decisions. I can help you find properties and explain how EstateHub works.',
  },
];

// Short explanations of common property words in Bangladesh. These explain a word; they are not legal advice.
const GLOSSARY = [
  { words: ['katha'], answer: 'Katha is a land measure. It varies by region; in Dhaka 1 katha is commonly about 720 sq ft. 20 katha make 1 bigha. Always confirm the exact size on the land papers.' },
  { words: ['bigha'], answer: 'Bigha is a land measure, commonly 20 katha (about 14,400 sq ft). The exact size varies by region, so confirm it on the land papers.' },
  { words: ['decimal', 'shotok', 'shatak', 'shatangsho'], answer: '1 decimal (shatak) is 1/100 of an acre, which is about 435.6 sq ft. 100 decimals make 1 acre (43,560 sq ft).' },
  { words: ['lakh', 'lac'], answer: '1 lakh = 100,000 and 1 crore = 10,000,000 (100 lakh). Prices on EstateHub are in BDT, sale prices are shown in lakh and crore.' },
  { words: ['crore'], answer: '1 crore = 10,000,000 BDT, which is 100 lakh.' },
  { words: ['khatian', 'khotian'], answer: 'Khatian is the official record of land ownership kept by the land office. Buyers usually ask to see the latest khatian. I cannot give legal advice, so please have a lawyer check the papers.' },
  { words: ['mutation', 'namjari'], answer: 'Mutation (namjari) means updating the government land record to the new owner after a purchase or inheritance. I cannot give legal advice, so please ask a lawyer or the land office about the exact steps.' },
  { words: ['dolil', 'deed'], answer: 'A deed (dolil) is the legal document that records a transfer of property. I cannot give legal advice, so please have a lawyer check any deed before you pay.' },
  { words: ['duplex'], answer: 'A duplex is a home with two floors connected by an internal staircase. On EstateHub, search it as a house or apartment and add "duplex" as a keyword.' },
  { words: ['tolet', 'to-let', 'to let'], answer: '"To-let" means a property that is available for rent. On EstateHub it appears as "For rent".' },
  { words: ['flat', 'apartment'], answer: '"Flat" and "apartment" mean the same thing: a home in a building, on one floor. On EstateHub both are listed as Apartment.' },
  { words: ['sqft', 'sq ft', 'square feet'], answer: 'Sq ft means square feet, the unit of size used on EstateHub. 1 sq m is about 10.76 sq ft and 1 katha is about 720 sq ft.' },
];

const QUESTION_START = /^(how|what|where|when|why|can|could|do|does|is|are|will|should|who|which|tell me|explain|ki|kivabe|kemon|koto|kothay|কি|কিভাবে|কেন)\b/;
const isQuestion = (text) => QUESTION_START.test(text) || text.includes('?');

function bestEntry(text) {
  let best = null;
  for (const e of ENTRIES) {
    let score = 0;
    for (const k of e.keywords) {
      if (k.includes(' ') ? text.includes(k) : hasWord(text, k)) score += k.includes(' ') ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { entry: e, score };
  }
  return best;
}

// "what is a katha?", "katha mane ki", "meaning of khatian"
const DEFINE = /\b(what is|what's|what are|meaning of|define|explain|mane|mane ki|ki|kake bole|means?)\b/;
function glossaryEntry(text) {
  if (!DEFINE.test(text) && !text.includes('?')) return null;
  for (const g of GLOSSARY) {
    if (g.words.some((w) => (w.includes(' ') ? text.includes(w) : hasWord(text, w)))) return g;
  }
  return null;
}

module.exports = { ENTRIES, GLOSSARY, bestEntry, glossaryEntry, isQuestion };
