# EstateHub

Smart real estate marketplace (React + Express + MySQL). University Software Engineering capstone project.

**Status:** All 6 phases complete (admin dashboard, moderation and reports, on top of EstateAI, comments, messaging, favorites, reviews and notifications).

## Folder structure

```
estatehub/
├── client/                 React + Vite + Tailwind frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js      (proxies /api to the backend)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── hooks/          useApi.js, useMediaQuery.js, usePolling.js, usePagedAdmin.js
│       ├── services/api.js
│       ├── styles/index.css
│       ├── context/        AuthContext.jsx, FavoritesContext.jsx
│       ├── layouts/MainLayout.jsx
│       ├── utils/format.js
│       ├── components/     Navbar, Footer, PropertyCard, PropertyFilters, Pagination, FormField,
│       │                   ProtectedRoute, ConfirmationDialog, StateViews (Loading/Empty/Error),
│       │                   PropertyOrbit, PropertySearchBar, BrokerCard, ReviewCard, Stars, Avatar, Reveal,
│       │                   NotificationBell, FavoriteButton, CommentsSection, ContactBrokerForm,
│       │                   MessagesView, ReviewsSection, RatingSummary, StarRatingInput,
│       │                   ReportButton, AdminBits
│       ├── pages/admin/    AdminLayout, AdminDashboard, AdminListings, AdminBrokers, AdminUsers,
│       │                   AdminModeration, AdminReports, AdminAudit
│       └── pages/          Home, Login, Register, Properties, PropertyDetails, Brokers, Messages, Favorites, Account, Assistant,
│                           BrokerPublicProfile, StaticPage (About/Terms/Privacy), NotFound,
│                           broker/ (BrokerDashboard, PropertyForm, BrokerProfile, BrokerComments)
├── server/                 Express REST API
│   ├── package.json
│   ├── .env.example
│   ├── uploads/
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/         env.js, db.js
│       ├── routes/         index.js, health.js, auth.js, properties.js, brokers.js, public.js,
│       │                   comments.js, favorites.js, conversations.js, reviews.js, notifications.js, ai.js
│       ├── controllers/    authController, propertyController, brokerController, publicController,
│       │                   commentController, favoriteController, conversationController,
│       │                   reviewController, notificationController, aiController
│       ├── services/       propertyService.js, mailService.js (e-mail), notificationService.js,
│       │                   aiService.js, ai/ (nlp.js, filters.js, llmClient.js, knowledge.js)
│       ├── validators/     authSchemas.js, propertySchemas.js, interactionSchemas.js, aiSchemas.js (zod)
│       ├── middleware/     auth.js, validate.js, upload.js, rateLimit.js, errorHandler.js
│       └── utils/          response.js, initDb.js, seedDemo.js, names.js, testMail.js
│   └── tests/              permissions.test.js, public.test.js, interactions.test.js, unit.test.js, ai.test.js, ai.unit.test.js
├── database/schema.sql     All tables, keys, indexes
├── docs/                   api-documentation.md, er-diagram.md
├── .gitignore
└── README.md
```

## Requirements (install these first)

1. **Node.js 18 or newer** – https://nodejs.org (choose LTS). Check with `node -v`.
2. **MySQL 8** – https://dev.mysql.com/downloads/installer/ (or XAMPP / MySQL Workbench bundle). Remember the root password you set.
3. **VS Code** – https://code.visualstudio.com

## Run it in VS Code

1. Put the `estatehub` folder somewhere easy, e.g. `Documents`. In VS Code: **File → Open Folder → estatehub**.
2. Open the terminal: **Terminal → New Terminal** (`` Ctrl+` ``).

### Step 1 – Backend setup

```bash
cd server
npm install
```

Create your environment file:

- Windows: `copy .env.example .env`
- Mac/Linux: `cp .env.example .env`

Open `server/.env` and set `DB_PASSWORD` to your MySQL root password, and set `JWT_SECRET` to a long random string. Never share or commit this file.

### Step 2 – Create the database

Make sure MySQL is running, then (still inside `server`):

```bash
npm run db:init
```

This creates the `estatehub` database, all tables, and clearly labeled **demo data**. Demo accounts (password for all: `Demo@12345`):

| Role | Email |
|------|-------|
| Admin | admin@gmail.com |
| Broker | broker1@gmail.com, broker2@gmail.com |
| Client | client1@gmail.com, client2@gmail.com |

> Warning: `db:init` drops and recreates the tables. Run it only on a fresh/dev database.

### Step 3 – Start the backend

```bash
npm run dev
```

Open http://localhost:5000/api/health – you should see `"database": "up"`.

### Step 4 – Start the frontend (second terminal)

Click the **+** in the terminal panel to open a new terminal:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. The page should show **API: up · Database: up**.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ER_ACCESS_DENIED_ERROR` | Wrong `DB_USER`/`DB_PASSWORD` in `server/.env` |
| `ECONNREFUSED 3306` | MySQL isn't running – start the MySQL service |
| `bcrypt` fails to install on Windows | Install Node LTS again, or run `npm install` once more; if it persists, tell me and I'll switch to `bcryptjs` |
| Page says "Problem: Failed to fetch" | Backend isn't running on port 5000 |
| Port already in use | Change `PORT` in `server/.env` and the proxy target in `client/vite.config.js` |

## Try Phase 2

Database is unchanged since Phase 1, so you do **not** need to run `db:init` again (only if you have not run it yet).
Restart both servers, then:

1. Open http://localhost:5173/properties. You should see the 8 demo listings. Try the filters, sorting, pagination (page size 9) and **Clear**.
2. Click a listing: gallery, details, broker card and similar properties.
3. Log in as `broker1@gmail.com` / `Demo@12345`. The account menu now has **My dashboard**.
4. **Add property**: fill the form. The listing is created as *pending* and you are taken to the edit page to upload photos. It does **not** appear on `/properties` yet (only approved ones do).
5. Approve it as an admin: log in as `admin@gmail.com` and open **Admin → Listings** (Phase 6). It now shows on `/properties`.
6. Edit the approved listing's price: it goes back to *pending* (re-approval workflow).
7. Log in as `broker2@gmail.com` and open `/broker`. You cannot see or edit broker1's listings.
8. Register a new buyer account. Visiting `/broker` redirects away, and the API returns 403 for broker actions.

### Run the automated tests

With MySQL running and `db:init` done once:

```bash
cd server
npm test
```

The tests create temporary users, check registration rules, role permissions, ownership checks, re-approval, the hidden private address and search filters, then delete their own data.

## Try Phase 3

Restart both servers (no database changes, no new packages). Then:

1. Open http://localhost:5173. On a desktop-width window (1200px or wider) you should see the **circular orbit**: property cards travel around the headline and search form.
2. **Hover** a card: it grows, comes to the front, the orbit pauses and extra details (beds, baths, broker) appear. Move the mouse away and the orbit eases back up. Click the card to open its page.
3. **Keyboard:** press Tab. Focusing a card pauses the orbit too. Use the **Pause orbit** button (bottom right of the hero) to stop it completely.
4. Make the window narrower than 1200px, or open it on a phone: the orbit becomes a horizontally scrollable carousel.
5. Turn on *Reduce motion* in your operating system settings and reload: the carousel is shown and nothing moves.
6. Use the hero search (Buy/Rent, location, type, budget). It opens `/properties` with the matching filters.
7. Scroll the homepage: highlights (real counts), featured listings, property types, locations, brokers, EstateAI preview, reviews, how it works, call to action.
8. Open **Find a Broker** (`/brokers`), then **View Profile** on a broker. Footer links to About, Terms and Privacy work.

Run the tests again with `npm test` in `server` (new file: `public.test.js`).

## Try Phase 4

**No database changes.** You do not need to run `db:init` again. Restart both servers, then:

1. Log in as `client1@gmail.com` / `Demo@12345` (or register a client). The navbar now has the bell and the menu has **Messages**, **Saved properties**, **My account**.
2. Open a property: tap the heart, write a **comment**, and send a **private message** to the broker.
3. Open the broker's profile (`/brokers/<id>`). After you have messaged them you can give a **1-5 star rating and review**; edit or delete it later. The average and the 5-to-1 breakdown update at once.
4. Log in as the broker in another browser window: the bell shows the new comment/message, **Messages** shows the thread (updates every few seconds), and **Comments** lists comments on your listings.
5. Admin-hidden comments/reviews (Phase 6 moderation) cannot be edited by their authors.

Brokers must be **verified** before clients can message or review them. For a new broker:
`UPDATE estatehub.broker_profiles SET verification_status='approved' WHERE user_id=<ID>;`

### Email notifications (optional)

Leave `SMTP_HOST` empty in `server/.env` and emails are simply skipped (in-app notifications still work). To test emails use a free inbox such as Ethereal or Mailtrap, or Gmail with an *app password*, then fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` and run:

```bash
cd server
npm run mail:test
```

Emails only contain the property title and a link to your dashboard, never message or comment text.

### Tests

`npm test` (needs MySQL) now also covers comments, messaging privacy, favorites and reviews. `node --test tests/unit.test.js` runs the database-free checks.

## Try Phase 5 (EstateAI)

**No database changes** and **no new packages**. Restart both servers, then open **AI Assistant** in the top bar (`/assistant`; no login needed).

Try these messages:

1. `3 bedroom apartment for sale in Uttara under 1 crore` : you get real listings and a "What I searched for" row of filter chips.
2. `cheapest first`, then `only for rent` : follow-up messages refine the previous search.
3. `5 bedroom flat for rent in Mirpur` : if nothing matches, EstateAI says **sorry**, shows no wrong listings, and offers real alternatives with their count and lowest price (tap one to search it).
4. `How do I contact a broker?`, `How do reviews work?` : answered from a built-in list of facts about the site.
5. `Should I take a home loan?` : EstateAI refuses legal or financial advice.
6. `New search` (button) or `start over` : clears the filters.

**EstateAI v2 (smarter and honest).** More things to try:

7. `flat for rent in Sylhet` (a place with no listings): "Sorry, EstateHub does not have any listings in Sylhet" plus the places that do have listings. It never silently searches everywhere.
8. `average rent in Mirpur`, `how many flats are there`, `which areas do you have?` : answered with real numbers from the database (lowest, average, highest, counts). Small samples are flagged and it says the numbers are from EstateHub only.
9. `best brokers in Uttara` : verified brokers with listings there, best rated first, with profile links. If none, it says sorry and shows the top brokers overall.
10. `5 katha land in Savar`, `convert 5 katha to sqft`, `what is a decimal?` : katha, bigha, decimal and acre are converted (1 katha = 720 sq ft is assumed and stated).
11. Typos and Banglish work: `Uttora`, `Chittagong`, `mirpur e flat bhara 20k`, `ফ্ল্যাট ভাড়া`.
12. EstateHub questions: `what is EstateHub?`, `is it free?`, `how many photos can I upload?`, `why is my listing not showing?`, `who can read my messages?`, `how do I report a listing?`, `forgot password`, and more.
13. Anything unrelated (`tell me a joke`) gets an honest "Sorry, I did not understand that" with what it can help with.

### How EstateAI works (good for your defense)

1. **Understand** the sentence: `services/ai/nlp.js` (rules: words like *rent*, *flat*, *under*, amounts in *lakh/crore/k*, and place names that really exist in the database).
2. **Optional smart mode:** if `LLM_API_KEY` is set, a language model also reads the sentence and returns filters as JSON (`services/ai/llmClient.js`). Rules win where they found a value; the model only fills gaps.
3. **Check:** every filter, from the rules, the model or the browser, goes through `sanitizeFilters()` (`services/ai/filters.js`). Unknown places, impossible numbers and strange values are dropped.
4. **Check places:** `services/ai/places.js` forgives small typos and knows well-known Bangladeshi places, so a place that is not in our listings gets an honest "sorry" instead of a silent wide search.
5. **Search or look up real data:** the normal property search runs (parameterized SQL, **approved and available listings only**). Price statistics, area counts and broker ratings come from read-only queries in `services/ai/insights.js` that reuse the same rules.
6. **Answer:** the reply text is written by our own templates from the real result. Site questions are answered from `services/ai/knowledge.js`, unit questions by `services/ai/units.js`.

So EstateAI cannot invent a property, a price or a broker. The model never sees users, messages, phone numbers, emails or addresses, and it never writes the answer.

### Turning smart mode on (optional)

Without a key everything works in **basic mode** (free, offline). To use a language model, edit `server/.env`:

```
LLM_API_KEY=your-key-here
# optional: LLM_PROVIDER=anthropic (default) or openai (any OpenAI-compatible API)
# optional: LLM_MODEL=...   LLM_BASE_URL=...   LLM_TIMEOUT_MS=8000
```

Restart the server. The assistant page shows which mode is active. If the model is slow, offline or returns rubbish, EstateAI falls back to basic mode automatically. **Privacy:** in smart mode the text typed in the chat is sent to the AI provider, and the page says so. Chats are never stored. Never put the key in the client code or commit `.env`.

### Tests

`node --test tests/ai.unit.test.js` (no database, no internet) checks the parser, Banglish and typo handling, katha conversion, the sorry and alternatives logic, statistics, brokers, the knowledge base, the filter cleaning, both LLM request formats, every failure path and the follow-up logic. `npm test` (needs MySQL) also runs `tests/ai.test.js`, which proves that only approved, available listings are returned and nothing private leaks.

## Try Phase 6 (admin, moderation, reports)

**No database changes** and **no new packages**. Restart both servers.

1. Log in as `admin@gmail.com` / `Demo@12345`. The account menu shows **Admin dashboard**; `/admin` has counters and recent activity.
2. As `broker1@gmail.com` add a listing, then as admin open **Listings**, filter *pending* and **Approve** it (or **Reject** with a reason; the broker gets a bell notification and an email if SMTP is on).
3. **Brokers:** verify or reject a broker. Only verified brokers can be messaged or reviewed.
4. **Users:** suspend `client2@gmail.com`. Their open session stops working at once and login returns 403. Activate them again. You cannot suspend yourself or another admin.
5. As `client1@gmail.com` open a listing and click **Report this listing** (also available on comments, reviews and broker pages). Reports need 10-500 characters, you cannot report your own content, and a duplicate open report is refused.
6. As admin open **Reports**, click the link to the item, hide it in **Comments & reviews** if needed, then **Mark resolved** or **Dismiss**.
7. Hidden comments and reviews disappear from public pages, the author cannot edit them, and the author is told (without repeating their text).
8. **Audit log** lists every admin action, including each time an admin opens a private conversation (read-only).

### Security notes (Phase 6)

- Every `/api/admin/*` route is behind `requireAuth` + `requireRole('admin')` on the server. Hiding menu links is only cosmetic.
- Admin actions use fixed, validated values (zod), parameterized SQL, and write to `audit_logs` through `services/auditService.js`.
- The reporter's name is shown to admins only. Notifications and emails never contain comment, review or message text.

### Tests

`npm test` (needs MySQL) runs `tests/admin.test.js`: 401/403 for non-admins on every admin route, approve/reject with audit rows, broker verification, hide/unhide, suspension, and the full report flow. `node --test tests/admin.unit.test.js` runs the database-free validation checks.

### Optional: Docker

```
copy .env.docker.example .env        (then edit the two values)
docker compose up --build
docker compose exec server npm run db:init      (first time only: tables + demo data)
```

Open http://localhost:8080. Files: `docker-compose.yml`, `server/Dockerfile`, `client/Dockerfile`, `client/nginx.conf`, `.dockerignore`. This is for demos, not a hardened production setup.

## Design decisions (Phase 3)

- **Orbit math:** each card sits on an ellipse (`x = cos(a)·rx`, `y = sin(a)·ry`). One animation loop updates only `transform` and `opacity`, so the page never reflows. See the comment at the top of `PropertyOrbit.jsx`: it is written to be explained in a defense.
- **Readable text:** a circle around a block of text always crosses its corners, so cards pass *behind* the headline and search form and fade in proportion to how much of the card is covered.
- **Accessibility:** orbit cards are real links in a list, hover and focus behave the same, there is a visible pause button, and reduced-motion users get a static carousel.
- **Honest content:** counts, ratings and "popular locations" come from the database. Demo listings and sample reviews are labelled. The EstateAI section on the homepage shows an example conversation and links to the real assistant.
- **Initials avatars:** brokers without a photo show their initials, drawn locally (no third-party image service).
- **Footer:** contact email and social links are placeholders. Edit the `CONTACT` and `SOCIAL_LINKS` constants at the top of `client/src/components/Footer.jsx`.
- **Navbar:** "AI Assistant" links to the EstateAI page (Phase 5).

## Design decisions (Phase 2)

- **Auth:** JWT in an HTTP-only cookie. The user is re-loaded from MySQL on every request, so suspending a user takes effect immediately.
- **Admins** cannot be registered through the API. Promote a user in MySQL: `UPDATE users SET role='admin' WHERE email='...';`
- **Re-approval:** editing title, description, type, purpose, price, size, rooms, city or area of an approved listing sends it back to *pending*. Changing only availability or the private address does not.
- **Nav links:** "Find a Broker" and "AI Assistant" are added when those pages exist (Phases 3 and 5), so there are no dead links.
- **Keyword search** uses `LIKE` on title, description, area and city (simple and predictable for a student project).

## Phase checklist

- [x] Phase 1 – Setup, schema, skeleton
- [x] Phase 2 – Auth, roles, property CRUD, search, details
- [x] Phase 3 – Homepage + circular property orbit
- [x] Phase 4 – Comments, messaging, favorites, reviews, email
- [x] Phase 5 – EstateAI assistant
- [x] Phase 6 – Admin dashboard, moderation, reports, tests, docs, Docker
