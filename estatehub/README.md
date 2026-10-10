# EstateHub

Smart real estate marketplace (React + Express + MySQL). University Software Engineering capstone project.

**Status:** Phase 1 of 6 complete (project setup, database schema, backend + frontend skeleton).

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
│       ├── components/  pages/  layouts/  hooks/  context/  utils/  assets/   (filled in later phases)
├── server/                 Express REST API
│   ├── package.json
│   ├── .env.example
│   ├── uploads/
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/         env.js, db.js
│       ├── routes/         index.js, health.js
│       ├── middleware/     errorHandler.js
│       ├── utils/          response.js, initDb.js, seedDemo.js
│       └── controllers/  services/  validators/   (filled in later phases)
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

## Phase checklist

- [x] Phase 1 – Setup, schema, skeleton
- [ ] Phase 2 – Auth, roles, property CRUD, search, details
- [ ] Phase 3 – Homepage + circular property orbit
- [ ] Phase 4 – Comments, messaging, favorites, reviews, email
- [ ] Phase 5 – EstateAI assistant
- [ ] Phase 6 – Admin dashboard, tests, docs, Docker
