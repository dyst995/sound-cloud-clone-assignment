# 1. Connect to the API

**Difficulty:** Warm-up

**Goal:** Replace the Vite starter page with a screen that proves your app can reach the API.

## Before you start

- Postgres and the API are running. `curl http://localhost:3000/api/health` returns `{"ok":true}`. [Postman](https://www.postman.com/downloads/) can make that same request.
- The frontend starter is in `frontend/`. If Vite is not running yet, follow [Start the frontend](../README.md#5-start-the-frontend).
- Vite is running, usually at `http://localhost:5173`.

## What to build

Replace the contents of `src/App.tsx` (the template's main component). Show:

- A heading with the name you chose for the app.
- Whether the API is reachable. Call `GET /api/health`. If `ok` is true, show a short line such as "API is up". If the request fails, show "API is down".
- The title of every demo track, as a plain list. The data comes from `GET /api/tracks`.

You do not need cards or audio. Tailwind is already available if you want the text readable, for example `className="p-6"`.

## API

`GET http://localhost:3000/api/health`

```json
{ "ok": true }
```

`GET http://localhost:3000/api/tracks`

The JSON is an object. The array is `tracks`, not the top level. Each track has a `title`. The full shape is in [docs/API.md](../docs/API.md).

## Done when

- The Vite starter logos and counter are gone.
- With the API running, you see "API is up" and six titles, including "Morning Drift" and "Harbor Lights".
- If you stop the API and refresh, you see "API is down" instead of a blank page or an uncaught error.
- Reloading the page loads the list again.

## Hints

Load data when the component appears. `useState` holds the result. `useEffect` starts the request. `fetch` does not throw on a 404 or 500, but it does reject when the server cannot be reached.

```tsx
const [tracks, setTracks] = useState<Track[]>([]);
const [apiUp, setApiUp] = useState<boolean | null>(null);

useEffect(() => {
  fetch("http://localhost:3000/api/health")
    .then((response) => response.json())
    .then((data: { ok: boolean }) => setApiUp(data.ok))
    .catch(() => setApiUp(false));

  fetch("http://localhost:3000/api/tracks")
    .then((response) => response.json())
    .then((data: { tracks: Track[] }) => setTracks(data.tracks))
    .catch(() => setTracks([]));
}, []);
```

Give `Track` the fields you actually read. For this task, `title` is enough. Render the list with `tracks.map(...)`, and give each `<li>` a `key` (the track `id` is the right key once you add it to the type).

## Next

[2. Track feed](02-track-feed.md)
