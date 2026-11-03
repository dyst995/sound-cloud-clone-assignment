# SoundCloud clone (learning project)

This repository is a small SoundCloud-style learning project. It includes the API, a Postgres database in Docker, sample tracks, a React + Vite + TypeScript starter, and a sequence of frontend tasks.

**The finished music UI is not included.** `frontend/` is only the Vite starter page. Build every screen yourself by following the tasks in [`tasks/`](tasks/README.md). There is no finished UI in this repo to copy.

You will end up with a small music app: a track feed, playback, search, a track page, accounts, artist profiles, likes, comments, and uploads. Waveforms, follows, playlists, and recommendations are left out on purpose.

The API is for learning on your own computer. Do not put it on the public internet as-is.

## Prerequisites

Install these, then open a terminal in this repository:

- [Node.js 20 or newer](https://nodejs.org/) (`node -v`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (the Docker engine must be running)

## 1. Start the database

From the repository root:

```bash
docker compose up -d
```

That starts Postgres 16 in the background. The database name, user, and password are all `soundcloud`. Data is kept in a Docker volume until you reset it (see below).

## 2. Start the API

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

On Windows PowerShell, create the env file with `Copy-Item .env.example .env` instead of `cp`.

`npm run db:setup` creates the tables and loads demo users, tracks, comments, and short audio files. You can run it again later. **Running it again deletes every account, track, like, comment, and uploaded file.**

When the API is up it prints:

```text
API listening on http://localhost:3000
```

Leave this terminal open. The process restarts when you change backend code.

## 3. Look at the tables in DBeaver

Download [DBeaver Community](https://dbeaver.io/download/) and install it. DBeaver is a desktop app that shows the rows in Postgres, so you can check what `npm run db:setup` and the API actually saved.

Connect it to the database from this project:

1. Start DBeaver. Choose **Database → New Database Connection**, pick **PostgreSQL**, then **Next**.
2. If DBeaver asks to download a PostgreSQL driver, let it.
3. Fill in the connection. These match `docker-compose.yml` and `backend/.env`:

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `soundcloud` |
| Username | `soundcloud` |
| Password | `soundcloud` |

4. Click **Test Connection**. It should say connected. Then click **Finish**.
5. In the left tree, open `soundcloud` → `Schemas` → `public` → `Tables`.
6. Right-click a table, such as `users` or `tracks`, and choose **View Data**.

You should see the demo users and tracks. `password_hash` is a hash, so it will not say `password123`. After you register, like, comment, or upload through the API, refresh the grid and the new row is there.

If you changed the host port in `docker-compose.yml` (for example to `5433`), use that port here too. The test suite uses a different database on port `5434`. Connect DBeaver to `5432` and the `soundcloud` database when you want to see the app data.

## 4. Try the API

You can test the API with curl or with [Postman](https://www.postman.com/downloads/). Both talk to the same server at `http://localhost:3000`.

In a second terminal, curl:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/tracks
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nova@example.com","password":"password123"}'
```

The same three checks in Postman:

1. New request, method **GET**, URL `http://localhost:3000/api/health`, then **Send**.
2. **GET** `http://localhost:3000/api/tracks`.
3. **POST** `http://localhost:3000/api/auth/login`. Open **Body**, choose **raw** and **JSON**, and send:

```json
{ "email": "nova@example.com", "password": "password123" }
```

`/api/health` returns `{"ok":true}`. `/api/tracks` returns the demo tracks. Login returns a token and Nova's profile.

For a route that requires login, copy `token` from the login response. In Postman open **Authorization**, choose **Bearer Token**, and paste it. In curl, send `-H "Authorization: Bearer TOKEN"`.

File uploads use form fields. In Postman open **Body**, choose **form-data**, add a **File** field named `audio`, and text fields for `title` and `genre`. The curl version of that request is in [`docs/API.md`](docs/API.md).

The demo tracks are **short generated tones**, not real songs. They exist so playback works without copyrighted audio. If you hear a beep, the API is working.

Swagger UI is at [http://localhost:3000/api/docs](http://localhost:3000/api/docs) while the API is running. It lists every endpoint. Open an endpoint, click **Try it out**, then **Execute**. To call a route that needs login, use **POST /api/auth/login** first, copy `token`, click **Authorize**, and paste the token.

Every endpoint, status code, and example body is also written in [`docs/API.md`](docs/API.md).

## Demo accounts

Every demo account uses the password `password123`.

| Email | Username | Display name |
| --- | --- | --- |
| nova@example.com | nova | Nova Lane |
| miles@example.com | miles | Miles Hart |
| aria@example.com | aria | Aria Chen |

## 5. Start the frontend

The React + TypeScript app is already in `frontend/`. It is the Vite starter, not the music app. Task 1 replaces that page.

From the **repository root** (not from inside `backend`):

```bash
cd frontend
npm install
npm run dev
```

Vite prints a local URL, usually `http://localhost:5173`. Open it. You should see the default Vite starter page.

TypeScript is strict on purpose. Unused variables, missing return values, a value that might be `undefined` (such as `tracks[0]`), the type `any`, `value!`, `// @ts-ignore`, `// @ts-expect-error`, and `// @ts-nocheck` are errors. A `useEffect` that reads a value it does not list is an error too. The dev server shows those errors on the page, and `npm run build` refuses to finish until they are fixed. Leave the checks in `frontend/tsconfig.app.json` and `frontend/.oxlintrc.json` turned on. Imports of your own files need the extension, as in `import App from './App.tsx'`.

`react-router-dom` is already installed. You use it in task 5.

Tailwind is already set up. Put utility classes on your elements, such as `className="text-xl font-semibold"`. The import lives at the top of `frontend/src/index.css`. You do not need to install Tailwind yourself.

Call the API at `http://localhost:3000`. You do not need a proxy. The API already allows browser requests from `http://localhost:5173`.

If Vite picks another port, set `CORS_ORIGIN` in `backend/.env` to that origin (for example `http://localhost:5174`) and restart `npm run dev` in `backend`.

## 6. Do the tasks

Start at [`tasks/README.md`](tasks/README.md) and do task 1 before task 2. Each task tells you what the screen should do, which API calls to make, and how you know it is finished. Hints are fuller at the beginning and thinner later.

Give the app your own name. It does not need to look like the real SoundCloud. A clear layout is enough.

## Project layout

```text
docker-compose.yml    Postgres
backend/              Express + TypeScript API
docs/API.md           Endpoint reference
tasks/                Frontend tasks, in order
frontend/             React + Vite starter. You build the UI here.
```

Useful backend files if you want to see how a request is stored:

- [`backend/db/schema.sql`](backend/db/schema.sql) — tables
- [`backend/.env.example`](backend/.env.example) — configuration
- [`backend/src`](backend/src) — routes and queries

## Reset the database

From `backend`, this wipes accounts, tracks, comments, likes, and files in `backend/uploads`, then loads the demo data again:

```bash
npm run db:setup
```

To recreate the Postgres volume as well, from the repository root:

```bash
docker compose down -v
docker compose up -d
cd backend && npm run db:setup
```

`docker compose down -v` deletes the database volume. Use it when setup says the password is wrong or port 5432 is already attached to an old container.

## Tests

From `backend`:

```bash
npm test
```

Docker has to be running. The suite starts its own Postgres on port 5434, creates a throwaway database, and does not connect to the database from `.env`.

## Troubleshooting

**`Could not connect to Postgres` or `docker compose` fails**

Docker Desktop is not running, or the engine is still starting. Start Docker, wait until it is ready, then run `docker compose up -d` again from the repository root.

**Password authentication failed**

The Postgres volume may have been created with different settings. Reset it with `docker compose down -v`, then `docker compose up -d`, then `npm run db:setup`.

**Port 5432 is already in use**

Something else is using Postgres. In `docker-compose.yml`, change the host port:

```yaml
ports:
  - "5433:5432"
```

In `backend/.env`, point `DATABASE_URL` at port `5433`. Then run `docker compose up -d` and `npm run db:setup` again.

**Port 3000 is already in use**

In `backend/.env`, set both `PORT` and `PUBLIC_BASE_URL` (for example port `3001` and `http://localhost:3001`). Restart the API. Audio URLs are built from `PUBLIC_BASE_URL`, so those two values need to match.

**The browser shows a CORS error**

The page origin must match `CORS_ORIGIN` in `backend/.env`. The default is `http://localhost:5173`. Restart the API after changing it.

**A track will not play**

Open the track's `audioUrl` in a new browser tab. It should download or play a short tone. If the address uses the wrong port, fix `PUBLIC_BASE_URL` and restart the API.

**`Database tables are missing`**

From `backend`, run `npm install` if you have not, then `npm run db:setup`.

## What you can ignore

You do not need to deploy this, add a migration tool, or use an ORM. SQL lives in `schema.sql` and in the route queries, with parameters (`$1`, `$2`) so values are never pasted into the query string.
