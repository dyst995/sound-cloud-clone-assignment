# 4. Search

**Difficulty:** Medium

**Goal:** Filter the feed by text and by genre without reloading the page.

## Before you start

Playback from task 3 still works. Keep the player bar. Changing the feed must not unmount it in a way that stops the current tone unless the user picks another track.

## What to build

Add a text box and a genre filter above the cards.

- The text box searches as the person types, but wait until they pause for a moment before calling the API. About 300 milliseconds is enough. This is called debouncing. Without it, every keystroke is a request.
- The genre control is a dropdown. Its options come from `GET /api/genres`, plus a first option like "All genres" that clears the filter.
- Both filters apply together. Searching `harbor` with genre `electronic` asks the API for that combination. Do not filter the six cards only in the browser. The API will matter more once uploads exist.
- While a search is loading, keep the old cards on screen or show the loading message. Either is fine. Do not flash "No tracks yet" in the gap between requests.
- When nothing matches, show "No tracks yet" (or "No matching tracks").
- Clearing the box and choosing "All genres" shows all six demo tracks again.

The player bar stays where it is.

## API

`GET /api/genres` returns `{ "genres": ["ambient", "electronic", ...] }`.

`GET /api/tracks?q=harbor&genre=electronic`

`q` matches title, display name, and username, ignoring case. `genre` is an exact match. Leave a parameter off, or send it empty, when that filter is unused. Full rules: [docs/API.md](../docs/API.md).

## Done when

- Typing `morning` leaves "Morning Drift" and hides the other titles.
- Typing `nova` shows Nova Lane's tracks ("Harbor Lights" and "Morning Drift"), because the search also checks the artist.
- Choosing `jazz` shows "Blue Hour" only.
- `morning` plus `rock` shows the empty state.
- The network tab (or the waiting behavior) shows that typing quickly does not fire a request per character.
- Play still works on whatever cards are visible.

## Hints

Keep `query` and `genre` in state. Fetch inside an effect that depends on both.

```tsx
useEffect(() => {
  const timeout = setTimeout(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (genre) params.set("genre", genre);
    fetch(`http://localhost:3000/api/tracks?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { tracks: Track[] }) => setTracks(data.tracks));
  }, 300);

  return () => clearTimeout(timeout);
}, [query, genre]);
```

The cleanup function cancels the previous timer when the person types again. That is the debounce.

Load genres once, in a separate effect with an empty dependency array.

If the current track is filtered out of the list, leave it playing. The bar does not have to be one of the visible cards.

## Next

[5. Track page](05-track-page.md)
