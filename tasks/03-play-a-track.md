# 3. Play a track

**Difficulty:** Easy

**Goal:** Play a demo track from the feed, and make sure only one track plays at a time.

## Before you start

Task 2's cards still render title, artist, genre, play count, and a cover placeholder.

The demo files are short tones (a few seconds each). A beep means playback works.

## What to build

Add a play control on each card. Choosing it plays that track's `audioUrl`.

Use **one** `<audio>` element for the page, not one per card. Starting a different track stops the previous one. The browser will do that if there is only a single element and you change its `src`.

Show which track is current. A line such as "Playing: Harbor Lights" is enough. Put it in a bar that stays visible at the bottom of the page.

When playback starts, tell the API once:

`POST /api/tracks/:id/play`

Then show the `playCount` from the response on that card, so the number goes up without a full reload. Do not call the play endpoint again until the user starts that track again. Pausing must not increment the count.

The `<audio>` controls can stay visible (`controls`) so pause and the time scrubber come from the browser.

## API

`track.audioUrl` is already a full URL, for example `http://localhost:3000/uploads/seed-harbor-lights.wav`.

`POST /api/tracks/TRACK_ID/play` with no body. The response is `{ "track": { ... } }` and that track's `playCount` includes this play. Details: [docs/API.md](../docs/API.md).

## Done when

- Pressing play on a card starts audio you can hear.
- Starting a second card stops the first. You never hear two tones at once.
- The bar shows the current title.
- Each time you start a track, its play count increases by one. Pausing and scrubbing do not increase it.
- After a refresh, the higher play count is still there (it was saved by the API).

## Hints

Keep the current track in state that the feed and the bottom bar both read. The cards do not each own an audio element.

```tsx
const [current, setCurrent] = useState<Track | null>(null);

function play(track: Track) {
  setCurrent(track);
  // then POST /api/tracks/${track.id}/play and update that card's playCount
}
```

Put the `<audio>` next to the bar, with `src={current?.audioUrl}` and `autoPlay`. When `current` is null, do not render the element.

A ref on the audio element (`useRef<HTMLAudioElement>(null)`) lets you call `.play()` after a click. Calling `.play()` from a click is more reliable than `autoPlay` alone, because the browser treats it as a user gesture.

Update one card's count by mapping the tracks array and replacing the matching `id`, rather than refetching the whole feed.

## Next

[4. Search](04-search.md)
