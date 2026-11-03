# 8. Likes

**Difficulty:** Harder

**Goal:** Let a logged-in listener like and unlike a track, and show the right count to everyone.

## Before you start

Profiles, the track page, and login all work. You can refresh and still be logged in.

Demo data already has likes. "Morning Drift" starts with 2. "Neon Alley" starts with 2. "Platform 4" starts with 0. Those numbers change if you have already liked something, or if you ran `npm run db:setup` again.

## What to build

Add a like button on the track page. Also show the like count on feed cards and on profile cards.

The button label and count come from the track object:

- `likedByMe` is true when the logged-in user has liked this track.
- `likeCount` is the number of likes.

Behavior:

- Logged out: show the count. The button does not like the track. Send the person to `/login`, or show "Log in to like".
- Logged in, not liked yet: `POST /api/tracks/:id/like`.
- Logged in, already liked: `DELETE /api/tracks/:id/like`.
- After either request, replace your stored track with `data.track` from the response so the count and the button stay in sync. Do this on the track page and, if that track is also in the feed, on the card.

Liking the same track twice does not add two likes. The API treats a second like as "still liked".

A like should survive a refresh. It is stored in the database, not only in component state.

## API

Both routes need `Authorization: Bearer TOKEN`. They return `{ "track": { ... } }` with the new `likedByMe` and `likeCount`.

Missing token: `401` `{ "error": "Login required" }`.

The list and detail endpoints already set `likedByMe` for you when you send the same header. If you fetch the feed without the header, every card looks unliked even when you are logged in.

See [docs/API.md](../docs/API.md).

## Done when

- Logged out, you can see like counts and you cannot change them.
- Log in as Aria, open "Platform 4", like it. The count becomes 1 and the button shows that you liked it.
- Refresh. It is still liked.
- Unlike it. The count returns to 0 and a refresh agrees.
- Log in as Nova and open "Morning Drift". `likedByMe` is false (Nova did not like her own demo track). Log in as Miles and open the same track. `likedByMe` is true.
- The feed count for that track matches the track page.
- Search, playback, and profiles still work.

## Hints

Send the token on `GET /api/tracks` and `GET /api/tracks/:id` as well as on like and unlike. Otherwise the button is wrong until the first click.

`DELETE` is the method, not a body field. There is no JSON body on like or unlike.

If the response is 401, the token is missing or expired. Send them to login rather than showing a raw error on the card.

Update the feed with a map that replaces the track whose `id` matches `data.track.id`.

## Next

[9. Comments](09-comments.md)
