# EstateHub

Smart real estate marketplace (React + Express + MySQL). University Software Engineering capstone project.

**Status:** Phase 2 of 6 complete (authentication, roles, property CRUD, search/filters, image upload, broker dashboard).

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
│       ├── services/api.js
│       ├── styles/index.css
│       ├── context/AuthContext.jsx
│       ├── layouts/MainLayout.jsx
│       ├── utils/format.js
│       ├── components/     Navbar, Footer, PropertyCard, PropertyFilters, Pagination, FormField,
│       │                   ProtectedRoute, ConfirmationDialog, StateViews (Loading/Empty/Error)
│       └── pages/          Home, Login, Register, Properties, PropertyDetails, NotFound,
│                           broker/ (BrokerDashboard, PropertyForm, BrokerProfile)
├── server/                 Express REST API
│   ├── package.json
│   ├── .env.example
│   ├── uploads/
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/         env.js, db.js
│       ├── routes/         index.js, health.js, auth.js, properties.js
│       ├── controllers/    authController.js, propertyController.js
│       ├── services/       propertyService.js (SQL + response shaping)
│       ├── validators/     authSchemas.js, propertySchemas.js (zod)
│       ├── middleware/     auth.js, validate.js, upload.js, rateLimit.js, errorHandler.js
│       └── utils/          response.js, initDb.js, seedDemo.js
│   └── tests/              permissions.test.js (auth, roles, property rules)
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
| Admin | admin@estatehub.demo |
| Broker | broker1@estatehub.demo, broker2@estatehub.demo |
| Client | client1@estatehub.demo, client2@estatehub.demo |

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
3. Log in as `broker1@estatehub.demo` / `Demo@12345`. The account menu now has **My dashboard**.
4. **Add property**: fill the form. The listing is created as *pending* and you are taken to the edit page to upload photos. It does **not** appear on `/properties` yet (only approved ones do).
5. Approve it manually (the admin dashboard arrives in Phase 6). In MySQL:
   `UPDATE estatehub.properties SET approval_status='approved' WHERE title='YOUR TITLE';`
   It now shows on `/properties`.
6. Edit the approved listing's price: it goes back to *pending* (re-approval workflow).
7. Log in as `broker2@estatehub.demo` and open `/broker`. You cannot see or edit broker1's listings.
8. Register a new buyer account. Visiting `/broker` redirects away, and the API returns 403 for broker actions.

### Run the automated tests

With MySQL running and `db:init` done once:

```bash
cd server
npm test
```

The tests create temporary users, check registration rules, role permissions, ownership checks, re-approval, the hidden private address and search filters, then delete their own data.

## Design decisions (Phase 2)

- **Auth:** JWT in an HTTP-only cookie. The user is re-loaded from MySQL on every request, so suspending a user takes effect immediately.
- **Admins** cannot be registered through the API. Promote a user in MySQL: `UPDATE users SET role='admin' WHERE email='...';`
- **Re-approval:** editing title, description, type, purpose, price, size, rooms, city or area of an approved listing sends it back to *pending*. Changing only availability or the private address does not.
- **Nav links:** "Find a Broker" and "AI Assistant" are added when those pages exist (Phases 3 and 5), so there are no dead links.
- **Keyword search** uses `LIKE` on title, description, area and city (simple and predictable for a student project).

## Phase checklist

- [x] Phase 1 – Setup, schema, skeleton
- [x] Phase 2 – Auth, roles, property CRUD, search, details
- [ ] Phase 3 – Homepage + circular property orbit
- [ ] Phase 4 – Comments, messaging, favorites, reviews, email
- [ ] Phase 5 – EstateAI assistant
- [ ] Phase 6 – Admin dashboard, tests, docs, Docker
