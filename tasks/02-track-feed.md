# 2. Track feed

**Difficulty:** Easy

**Goal:** Turn the title list into a feed of tracks you could scan the way you scan a music app.

## Before you start

Task 1 works: the page shows the API status and the six demo titles.

## What to build

Keep the heading. Replace the plain list with one card per track. Each card shows:

- A cover area. Demo tracks have `coverUrl: null`. Draw a placeholder block when it is null, for example the first letter of the title. When `coverUrl` is a string, show that image.
- The title.
- The artist display name. It is nested: `track.artist.displayName`.
- The genre.
- The play count.

While the request is in flight, show "Loading tracks…" instead of an empty feed. If the request fails, keep the "API is down" message from task 1. If the request succeeds and `tracks` is an empty array, show "No tracks yet" rather than a blank region.

You still do not need play buttons. Those are the next task.

## API

Same call as task 1: `GET /api/tracks`. Read `data.tracks`. Fields you need now: `id`, `title`, `genre`, `playCount`, `coverUrl`, and `artist.displayName`.

## Done when

- Six cards are visible, each with title, artist, genre, play count, and a cover placeholder.
- Refreshing the page shows the loading message briefly, then the cards.
- You can point the request at a nonsense path (only as a temporary test) and see a failure message instead of a crash. Put the real URL back afterward.
- The layout is readable on a laptop-width window. A single column is fine.

## Hints

Make a `TrackCard` component that receives one track. `App` fetches and maps.

```tsx
<article>
  <div className="cover">{track.coverUrl ? <img src={track.coverUrl} alt="" /> : track.title[0]}</div>
  <h2>{track.title}</h2>
  <p>{track.artist.displayName}</p>
  <p>{track.genre}</p>
  <p>{track.playCount} plays</p>
</article>
```

Use a third state value, such as `"loading" | "ready" | "error"`, if a boolean is getting confusing. Do not use an empty array to mean both "still loading" and "nobody has uploaded anything".

## Next

[3. Play a track](03-play-a-track.md)
