# 5. Track page

**Difficulty:** Medium

**Goal:** Open one track on its own URL, and show its description and comments. Comments are read-only for now.

## Before you start

The feed, player, and search from tasks 2–4 still work. `react-router-dom` is already a dependency of `frontend/`. If the import fails, install it from the `frontend` folder:

```bash
npm install react-router-dom
```

## What to build

Add routes:

- `/` is the feed you already built, including search and the player bar.
- `/tracks/:id` is the track page.

The title on each card is a link to `/tracks/TRACK_ID`. The player bar stays available on both routes, so a track that is already playing keeps playing when you open its page.

The track page shows:

- Cover or the same placeholder as the feed.
- Title, artist display name, genre, and play count.
- The description.
- A way to play this track with the same single player from task 3. Starting it here also calls `POST /api/tracks/:id/play` once.
- A link back to the feed.
- The comments on this track, oldest first. Show the author's display name and the comment text. Do not add a comment form yet.

If the id is unknown, show "Track not found" and a link home. Unknown ids return `404` from the API.

Use the id from the URL. Do not pass the whole track only through in-memory state, or a refresh of `/tracks/some-id` will go blank.

## API

`GET /api/tracks/:id` returns `{ "track": { ... } }`. The description is `track.description`.

`GET /api/tracks/:id/comments` returns `{ "comments": [ ... ] }`. Each comment has `body` and `author.displayName`.

Both are public. No token yet. See [docs/API.md](../docs/API.md).

## Done when

- Clicking a title opens `/tracks/...` and a refresh of that URL still shows the same track.
- "Morning Drift" shows its description and two comments (from Miles Hart and Aria Chen).
- "Glass House" shows Nova Lane's comment.
- A made-up URL such as `/tracks/not-a-real-id` shows not-found, not a crash. A real UUID that does not exist does the same.
- Back to the feed, search and playback still work.
- The address bar is the source of which track page you are on.

## Hints

Wrap the app in a router once, near the top of the tree (`src/main.tsx` or `App`).

```tsx
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";

<BrowserRouter>
  <PlayerBar />
  <Routes>
    <Route path="/" element={<Feed />} />
    <Route path="/tracks/:id" element={<TrackPage />} />
  </Routes>
</BrowserRouter>
```

`useParams()` gives you `{ id: string }` inside `TrackPage`. Fetch when `id` changes.

`fetch` does not throw when the status is 404. Check `response.ok` (or `response.status`) before reading the track. If it is not ok, set an error state and skip `response.json()` only if you have already decided the body does not matter. This API still returns JSON on errors: `{ "error": "..." }`.

Link the card title with `<Link to={\`/tracks/${track.id}\`}>`.

Put the player state above both routes so it survives navigation. If it lives inside `Feed` only, opening a track page will throw it away.

## Next

[6. Sign up and log in](06-sign-up-and-log-in.md)
