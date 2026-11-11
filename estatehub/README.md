# EstateHub

Smart real estate marketplace (React + Express + MySQL). University Software Engineering capstone project.

<<<<<<< HEAD
**Status:** Phase 4 of 6 complete (comments, private messaging, favorites, broker reviews and ratings, notifications and e-mail).
=======
<<<<<<< HEAD
**Status:** Phase 4 of 6 complete (comments, private messaging, favorites, broker reviews and ratings, notifications and e-mail).
=======
**Status:** Phase 3 of 6 complete (premium homepage with the circular property orbit, broker directory and profiles, legal pages).
>>>>>>> origin/main
>>>>>>> origin/main

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
<<<<<<< HEAD
│       ├── hooks/          useApi.js, useMediaQuery.js, usePolling.js
=======
<<<<<<< HEAD
│       ├── hooks/          useApi.js, useMediaQuery.js, usePolling.js
=======
│       ├── hooks/          useApi.js, useMediaQuery.js
>>>>>>> origin/main
>>>>>>> origin/main
│       ├── services/api.js
│       ├── styles/index.css
│       ├── context/        AuthContext.jsx, FavoritesContext.jsx
│       ├── layouts/MainLayout.jsx
│       ├── utils/format.js
│       ├── components/     Navbar, Footer, PropertyCard, PropertyFilters, Pagination, FormField,
│       │                   ProtectedRoute, ConfirmationDialog, StateViews (Loading/Empty/Error),
│       │                   PropertyOrbit, PropertySearchBar, BrokerCard, ReviewCard, Stars, Avatar, Reveal,
│       │                   NotificationBell, FavoriteButton, CommentsSection, ContactBrokerForm,
│       │                   MessagesView, ReviewsSection, RatingSummary, StarRatingInput
│       └── pages/          Home, Login, Register, Properties, PropertyDetails, Brokers, Messages, Favorites, Account,
│                           BrokerPublicProfile, StaticPage (About/Terms/Privacy), NotFound,
<<<<<<< HEAD
│                           broker/ (BrokerDashboard, PropertyForm, BrokerProfile, BrokerComments)
=======
<<<<<<< HEAD
│                           broker/ (BrokerDashboard, PropertyForm, BrokerProfile, BrokerComments)
=======
│                           broker/ (BrokerDashboard, PropertyForm, BrokerProfile)
>>>>>>> origin/main
>>>>>>> origin/main
├── server/                 Express REST API
│   ├── package.json
│   ├── .env.example
│   ├── uploads/
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/         env.js, db.js
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> origin/main
│       ├── routes/         index.js, health.js, auth.js, properties.js, brokers.js, public.js,
│       │                   comments.js, favorites.js, conversations.js, reviews.js, notifications.js
│       ├── controllers/    authController, propertyController, brokerController, publicController,
│       │                   commentController, favoriteController, conversationController,
│       │                   reviewController, notificationController
│       ├── services/       propertyService.js, mailService.js (e-mail), notificationService.js
│       ├── validators/     authSchemas.js, propertySchemas.js, interactionSchemas.js (zod)
<<<<<<< HEAD
│       ├── middleware/     auth.js, validate.js, upload.js, rateLimit.js, errorHandler.js
│       └── utils/          response.js, initDb.js, seedDemo.js, names.js, testMail.js
│   └── tests/              permissions.test.js, public.test.js, interactions.test.js, unit.test.js
=======
│       ├── middleware/     auth.js, validate.js, upload.js, rateLimit.js, errorHandler.js
│       └── utils/          response.js, initDb.js, seedDemo.js, names.js, testMail.js
│   └── tests/              permissions.test.js, public.test.js, interactions.test.js, unit.test.js
=======
│       ├── routes/         index.js, health.js, auth.js, properties.js, brokers.js, public.js
│       ├── controllers/    authController, propertyController, brokerController, publicController
│       ├── services/       propertyService.js (SQL + response shaping)
│       ├── validators/     authSchemas.js, propertySchemas.js (zod)
│       ├── middleware/     auth.js, validate.js, upload.js, rateLimit.js, errorHandler.js
│       └── utils/          response.js, initDb.js, seedDemo.js
│   └── tests/              permissions.test.js (auth, roles, property rules), public.test.js
>>>>>>> origin/main
>>>>>>> origin/main
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
5. Approve it manually (the admin dashboard arrives in Phase 6). In MySQL:
   `UPDATE estatehub.properties SET approval_status='approved' WHERE title='YOUR TITLE';`
   It now shows on `/properties`.
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

<<<<<<< HEAD
1. Log in as `client1@gmail.com` / `Demo@12345` (or register a client). The navbar now has the bell and the menu has **Messages**, **Saved properties**, **My account**.
=======
<<<<<<< HEAD
1. Log in as `client1@gmail.com` / `Demo@12345` (or register a client). The navbar now has the bell and the menu has **Messages**, **Saved properties**, **My account**.
=======
1. Log in as `client1@estatehub.demo` / `Demo@12345` (or register a client). The navbar now has the bell and the menu has **Messages**, **Saved properties**, **My account**.
>>>>>>> origin/main
>>>>>>> origin/main
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

## Design decisions (Phase 3)

- **Orbit math:** each card sits on an ellipse (`x = cos(a)·rx`, `y = sin(a)·ry`). One animation loop updates only `transform` and `opacity`, so the page never reflows. See the comment at the top of `PropertyOrbit.jsx`: it is written to be explained in a defense.
- **Readable text:** a circle around a block of text always crosses its corners, so cards pass *behind* the headline and search form and fade in proportion to how much of the card is covered.
- **Accessibility:** orbit cards are real links in a list, hover and focus behave the same, there is a visible pause button, and reduced-motion users get a static carousel.
- **Honest content:** counts, ratings and "popular locations" come from the database. Demo listings and sample reviews are labelled. The EstateAI section is a clearly labelled illustration, not a working feature, and has no link until Phase 5.
- **Initials avatars:** brokers without a photo show their initials, drawn locally (no third-party image service).
- **Footer:** contact email and social links are placeholders. Edit the `CONTACT` and `SOCIAL_LINKS` constants at the top of `client/src/components/Footer.jsx`.
<<<<<<< HEAD
- **Navbar:** "AI Assistant" is added in Phase 5.
=======
<<<<<<< HEAD
- **Navbar:** "AI Assistant" is added in Phase 5.
=======
- **Navbar:** "AI Assistant" is added in Phase 5. 
>>>>>>> origin/main
>>>>>>> origin/main

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
- [ ] Phase 5 – EstateAI assistant
- [ ] Phase 6 – Admin dashboard, tests, docs, Docker
