// Answers to "how does EstateHub work?" questions. Every answer describes something the app really does
// (nothing here is invented), so EstateAI can answer without a language model.
const { hasWord } = require('./nlp');

const ENTRIES = [
  {
    id: 'contact',
    keywords: ['contact', 'message', 'talk', 'reach', 'phone', 'call', 'chat', 'speak', 'broker'],
    answer: 'To contact a broker, log in with a client account and use the "Message" box on the property page. Messages are private: only you and the broker can read them. Only verified brokers can be messaged. Phone numbers are not shown publicly.',
    link: { label: 'Browse properties', to: '/properties' },
  },
  {
    id: 'viewing',
    keywords: ['visit', 'viewing', 'view', 'book', 'appointment', 'schedule', 'see the property', 'tour'],
    answer: 'EstateHub does not have online booking yet. To arrange a viewing, send the broker a message from the property page and agree on a time with them.',
  },
  {
    id: 'favorites',
    keywords: ['favorite', 'favourite', 'save', 'saved', 'wishlist', 'bookmark', 'heart'],
    answer: 'Tap the heart on any property to save it. Saved properties are in your account menu under "Saved properties". Favorites are available to client accounts.',
  },
  {
    id: 'reviews',
    keywords: ['review', 'rating', 'rate', 'stars', 'feedback'],
    answer: 'After you have sent a broker a message, you can give them a 1 to 5 star rating and a written review on their profile page. You can edit or delete your own review later. Each client can review a broker once.',
    link: { label: 'Find a broker', to: '/brokers' },
  },
  {
    id: 'comments',
    keywords: ['comment', 'question', 'public'],
    answer: 'Every listing has a public comments section for questions. Client accounts and the listing\'s own broker can post. For private questions, use the message box instead.',
  },
  {
    id: 'list',
    keywords: ['list my', 'sell my', 'post', 'add property', 'add a property', 'advertise', 'upload', 'listing my', 'rent out', 'become a broker', 'broker account'],
    answer: 'To list a property, register as a broker, open your dashboard and choose "Add property". New and edited listings are reviewed and approved by an admin before they appear publicly.',
    link: { label: 'Create an account', to: '/register' },
  },
  {
    id: 'verified',
    keywords: ['verified', 'verification', 'trust', 'trusted', 'genuine', 'scam', 'safe', 'safety'],
    answer: 'A "Verified broker" badge means an EstateHub admin approved that broker\'s profile. Listings are also approved by an admin before they are public. Always visit a property before paying anything, and never send money to someone you have not met.',
  },
  {
    id: 'price',
    keywords: ['price', 'currency', 'bdt', 'taka', 'lakh', 'crore', 'cost', 'per month'],
    answer: 'All prices are in Bangladeshi Taka (BDT). Sale prices are shown in Lakh and Crore (1 Lakh = 100,000 and 1 Crore = 10,000,000). Rent is per month.',
  },
  {
    id: 'account',
    keywords: ['register', 'sign up', 'signup', 'login', 'log in', 'account', 'password', 'join'],
    answer: 'Choose "Get Started" in the top bar to register as a client (to search, save, message and review) or as a broker (to list properties).',
    link: { label: 'Create an account', to: '/register' },
  },
  {
    id: 'notifications',
    keywords: ['notification', 'notifications', 'email', 'alert', 'bell'],
    answer: 'The bell in the top bar shows new comments, messages and reviews. If email is set up, you also get a short email with a link back to your dashboard. Emails never contain the text of your messages.',
  },
  {
    id: 'about_ai',
    keywords: ['estateai', 'assistant', 'what can you do', 'who are you', 'what are you', 'help me', 'how do you work', 'chatbot', 'ai'],
    answer: 'I am EstateAI. Tell me what you are looking for, for example "3 bedroom flat for rent in Mirpur under 30000", and I will search the real listings on EstateHub. I do not invent properties, prices or brokers, and I cannot give legal or financial advice.',
  },
];

const QUESTION_START = /^(how|what|where|when|why|can|could|do|does|is|are|will|should|who|which|tell me|explain)\b/;

function bestEntry(text) {
  let best = null;
  for (const e of ENTRIES) {
    const score = e.keywords.filter((k) => (k.includes(' ') ? text.includes(k) : hasWord(text, k))).length;
    if (score > 0 && (!best || score > best.score)) best = { entry: e, score };
  }
  return best;
}

const isQuestion = (text) => QUESTION_START.test(text) || text.includes('?');

module.exports = { ENTRIES, bestEntry, isQuestion };
