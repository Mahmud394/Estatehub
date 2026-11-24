# Deploying EstateHub on Vercel (real hosting, no demo data)

You will use three services: **GitHub** (code), **a cloud MySQL database**, and **Vercel** (website + API + photo storage).
Never paste passwords or keys into the code or into chat. They go only into Vercel's *Environment Variables* and your local `server/.env` (which is never uploaded).

## 0. What is different from running on your PC

| Topic | On your PC | On Vercel |
|---|---|---|
| Website | Vite dev server (5173) | Built once, served as static files |
| API | `npm run dev` (port 5000) | One serverless function: `api/index.js` (same Express app) |
| Database | Local MySQL | Cloud MySQL (needs `DB_SSL=true`) |
| Photos | `server/uploads/` folder | Vercel Blob (the serverless disk is read-only) |
| Demo accounts | `npm run db:init` | **Not used.** You create a real admin with `npm run create-admin` |

## 1. Cloud MySQL

Pick one provider with a free plan (plans change, so check the current offer):

- **Aiven for MySQL** (real MySQL 8, recommended because EstateHub uses foreign keys).
- **Railway** or **Clever Cloud** MySQL.
- TiDB Cloud also works as MySQL, but check that foreign keys are supported on your plan before choosing it.

Create a database named `estatehub` (or use the one the provider gives you) and note: **host, port, user, password, database name**. Most providers force SSL, so you will set `DB_SSL=true`.

## 2. Put the project on GitHub

1. Create a **private** repository on github.com.
2. In the project folder (the one that contains `client`, `server`, `api`, `vercel.json`):
   ```
   git init
   git add .
   git commit -m "EstateHub"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/estatehub.git
   git push -u origin main
   ```
3. Check on GitHub that **no `.env` file** was uploaded (`.gitignore` already blocks it).

## 3. Import in Vercel

1. vercel.com → **Add New → Project** → choose the repository.
2. **Root Directory:** the repository root (where `vercel.json` is). **Framework Preset:** *Other*. Leave the build settings alone, `vercel.json` already sets them.
3. Do **not** press Deploy yet. First open **Storage** in the Vercel dashboard (or after the first deploy), **Create → Blob**, and **connect it to this project**. This adds `BLOB_READ_WRITE_TOKEN` for you.

## 4. Environment variables (Project → Settings → Environment Variables)

| Name | Value |
|---|---|
| `CLIENT_URL` | `https://YOUR-PROJECT.vercel.app` (exact, no `/` at the end). You see the URL after the first deploy; add it then and redeploy |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | From your cloud MySQL |
| `DB_SSL` | `true` |
| `JWT_SECRET` | Long random text. Make one with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | A **real** mail service (Gmail App Password, Brevo, Resend SMTP). Ethereal is a fake inbox and delivers nothing |
| `LLM_API_KEY` | Optional. Without it EstateAI runs in basic mode |
| `BLOB_READ_WRITE_TOKEN` | Added automatically when you connect the Blob store |

`NODE_ENV` is set to `production` by Vercel (this also makes the login cookie HTTPS-only, which is what you want).

## 5. Create the tables and the real admin (from your PC, once)

1. Open `server/.env` and **temporarily** put the cloud values in `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and add `DB_SSL=true`.
2. In a terminal:
   ```
   cd server
   npm install
   npm run db:init:prod
   npm run create-admin
   ```
   `db:init:prod` creates the tables only (no data, nothing is dropped). `create-admin` asks for your name, email and password.
3. **Never run `npm run db:init` against the cloud database.** It drops all tables and inserts demo accounts with a public password.
4. Change `server/.env` back to your local database.

## 6. Deploy and test

Press **Deploy** (or push to GitHub, Vercel redeploys on every push). Then on `https://YOUR-PROJECT.vercel.app`:

- [ ] `/api/health` shows a success message.
- [ ] Register a broker and a client with real emails. Log in and out.
- [ ] Log in as your admin → **Admin → Brokers** → verify the broker.
- [ ] As the broker add a listing and upload a photo (max 4 MB each), as admin approve it, and check it appears on `/properties`.
- [ ] Client messages the broker; the broker gets a bell notification (and an email if SMTP is set).
- [ ] Report a comment, then resolve it in **Admin → Reports**.

## 7. If something fails

| Symptom | Likely cause and fix |
|---|---|
| `/api/...` returns a Vercel error page or 500 | Open the deployment → **Logs**. The first error line tells you. Usually a missing environment variable |
| `ECONNREFUSED` / `ETIMEDOUT` | Wrong `DB_HOST`/`DB_PORT`, or the database firewall blocks outside connections. Allow all IPs (Vercel IPs change) |
| SSL / certificate error | Make sure `DB_SSL=true`. If the provider uses its own CA, set `DB_SSL_REJECT_UNAUTHORIZED=false` only as a last resort |
| Login works but you are logged out on refresh | `CLIENT_URL` or the site URL does not match, or you are testing on a preview URL |
| Photo upload says "too large" or fails | Photo over 4 MB, or Blob store not connected (no `BLOB_READ_WRITE_TOKEN`) |
| No emails | `SMTP_*` wrong. Test locally with `npm run mail:test you@example.com` |
| First request after idle is slow | Normal cold start on the free plan |

## 8. Honest limits

- Vercel's free **Hobby** plan is for personal, non-commercial use. A real business needs a paid plan.
- A function can run at most 30 seconds here, and each request body is limited to about 4.5 MB (that is why photos upload one at a time).
- Free database plans can pause or limit storage. Back up before important demos.
- Forgot-password and email verification are not built yet. Users who forget a password need an admin to reset it in the database.
