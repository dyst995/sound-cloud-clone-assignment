# Frontend tasks

Build the app yourself, in this order. `frontend/` is a Vite starter, not a finished UI. There is nothing there to copy.

Start Vite from the `frontend` folder. The commands are in the main README under [Start the frontend](../README.md#5-start-the-frontend). The API should already be running at `http://localhost:3000` before you start task 1.

TypeScript will reject code that is missing types, uses a value that might be `undefined`, uses `any`, uses `!`, or hides an error with `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`. A `useEffect` must list every value it reads. Fix those errors. Do not weaken `frontend/tsconfig.app.json` or `frontend/.oxlintrc.json` to make them go away.

## How to work

- Finish a task before you open the next file. Each one assumes the previous screen still works.
- Keep `npm run dev` running inside `backend`, and Vite running inside `frontend`.
- Use `http://localhost:3000` as the API base URL. A small constant at the top of your API helper is enough:

```ts
export const API_URL = "http://localhost:3000";
```

- Read [`docs/API.md`](../docs/API.md) when you need a field name, status code, or example body. The later tasks expect you to look it up.
- Give the app a name of your own. A clear layout is enough. It does not need to look like SoundCloud. Tailwind is already installed, so style with classes like `className="flex gap-4"`.
- The demo tracks are short beeps. That is intentional, so you can press play without real songs.

## The list

| Task | Difficulty | What you add |
| --- | --- | --- |
| [1. Connect to the API](01-connect-to-the-api.md) | Warm-up | Health check and a plain list of titles |
| [2. Track feed](02-track-feed.md) | Easy | Cards, loading, and an empty state |
| [3. Play a track](03-play-a-track.md) | Easy | One player for the whole page |
| [4. Search](04-search.md) | Medium | Text search and a genre filter |
| [5. Track page](05-track-page.md) | Medium | A route for one track, with comments shown read-only |
| [6. Sign up and log in](06-sign-up-and-log-in.md) | Medium | Accounts, a saved token, and the current user in the header |
| [7. Artist profile](07-artist-profile.md) | Medium | A page for each artist and their tracks |
| [8. Likes](08-likes.md) | Harder | Like and unlike while logged in |
| [9. Comments](09-comments.md) | Hard | Post a comment and delete your own |
| [10. Upload a track](10-upload-a-track.md) | Hardest | Send an audio file and see it in the feed |

When a task is done, the previous ones should still work. Search should not break playback. Login should not break the feed.
