# 7. Artist profile

**Difficulty:** Medium

**Goal:** Open an artist from a track and see their bio and their tracks.

## Before you start

Login from task 6 works, including a refresh that restores the current user. The feed and track page still work logged out.

## What to build

Add a route `/users/:username`.

Link the artist name on each feed card, and on the track page, to `/users/USERNAME`. Use `track.artist.username`, not the display name. Display names can contain spaces. Usernames cannot.

The profile page shows:

- Display name
- `@username`
- Bio, or a quiet "No bio yet" when `bio` is empty
- That artist's tracks, using the same card layout as the feed (cover placeholder, title, genre, play count, play button)

Playing a track from the profile uses the same single player and the same play-count request as the feed.

If the username does not exist, show "User not found" and a link home.

The header from task 6 stays on this page. You do not need an "edit profile" form. The API has no profile-update endpoint.

## API

`GET /api/users/:username`

The response is `{ "user": { ... }, "tracks": [ ... ] }`. This `user` object has no email. `tracks` uses the same track shape as the feed.

Lookup is case-insensitive. Unknown user: `404` and `{ "error": "User not found" }`.

Details: [docs/API.md](../docs/API.md).

## Done when

- From "Morning Drift", the artist link opens `/users/nova` and shows Nova Lane, a bio, "Harbor Lights", and "Morning Drift".
- `/users/miles` shows Miles Hart's tracks. `/users/aria` shows Aria Chen's.
- `/users/nobody-here` shows not-found, not a crash.
- Refreshing `/users/nova` still loads Nova. The page does not depend on clicking through the feed first.
- Play from a profile card still updates the play count and the bottom bar.
- Logging in and out does not break the profile page.

## Hints

This page is the track page pattern again: read `useParams()`, fetch when the param changes, branch on `response.ok`.

Reuse `TrackCard` if the play callback can be passed in. Copying the card markup into a second component will drift as soon as you add likes.

There is no code sample in this task. The request is a GET with no body and no token.

## Next

[8. Likes](08-likes.md)
