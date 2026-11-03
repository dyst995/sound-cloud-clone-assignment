# Start here

READMEs matter. Read them before you change code. They say what a folder is for, how to run it, and what you are supposed to build. Skipping them is how you edit the wrong file.

## Important files

| File | What it is |
| --- | --- |
| [README.md](README.md) | How to start the database, the API, and the frontend. |
| [docs/API.md](docs/API.md) | Every endpoint: paths, fields, and status codes. |
| [tasks/README.md](tasks/README.md) | The 10 frontend tasks, in order. |
| [tasks/01-connect-to-the-api.md](tasks/01-connect-to-the-api.md) through [tasks/10-upload-a-track.md](tasks/10-upload-a-track.md) | One task each. Read the file before you write the screen. |
| [docker-compose.yml](docker-compose.yml) | Postgres in Docker. Database, user, and password are `soundcloud`. |
| [backend/.env.example](backend/.env.example) | The settings the API needs. Copy it to `backend/.env`. |
| [backend/package.json](backend/package.json) | API scripts: `npm run dev`, `npm run db:setup`, `npm test`. |
| [backend/db/schema.sql](backend/db/schema.sql) | The tables: users, tracks, likes, comments. |
| [backend/src/app.ts](backend/src/app.ts) | Where the API routes are mounted. |
| [frontend/package.json](frontend/package.json) | Frontend scripts: `npm run dev` and `npm run build`. |
| [frontend/src/App.tsx](frontend/src/App.tsx) | The page you replace in task 1. |
| [frontend/src/index.css](frontend/src/index.css) | Global styles. The Tailwind import is the first line. |
| [frontend/tsconfig.app.json](frontend/tsconfig.app.json) | Strict TypeScript rules. Leave them on. |
| [frontend/.oxlintrc.json](frontend/.oxlintrc.json) | Bans `any`, `!`, and `@ts-ignore`. Effect dependencies are required. Leave those rules on. |
