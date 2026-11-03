# 9. Comments

**Difficulty:** Hard

**Goal:** Let a logged-in listener post a comment, and let them delete only their own.

## Before you start

Task 5 already lists comments on the track page. Task 6 gives you the current user. Task 8's likes still work. Keep all of that.

"Morning Drift" already has two comments. Use it to check the list before you post a new one.

## What to build

On the track page, under the existing comments:

- Logged out: show the comments, and a line such as "Log in to comment" that links to `/login`. No form.
- Logged in: show a form with a text area and a submit button.

Submitting posts the comment. The new comment appears at the bottom of the list (the API returns oldest first, and a new one is the newest). Clear the text area after success.

Show `data.error` under the form when the API rejects the comment. You must be able to trigger "Comment cannot be empty" and "Comment must be at most 500 characters". Disable the button or ignore clicks while the request is in flight so a double-click does not post twice.

Each comment shows the author's display name and the text. If `comment.author.id` is the logged-in user's `id`, also show a delete button. Do not show delete on other people's comments.

Deleting removes that comment from the list. Deleting someone else's comment is not part of the UI. If you try it anyway, the API responds with 403.

Empty and failed states from task 5 still apply: a track with no comments needs a short "No comments yet", and a missing track still shows not-found.

## API

`GET /api/tracks/:id/comments` — you already call this. Response: `{ "comments": [ ... ] }`.

`POST /api/tracks/:id/comments` — auth required. JSON body `{ "body": "This one stays on repeat." }`. Success is `201` and `{ "comment": { ... } }`.

`DELETE /api/comments/:id` — auth required. This path is `/api/comments/:id`, not under `/api/tracks`. Success is `{ "ok": true }`.

The author's id is `comment.author.id`. The logged-in user's id is `user.id` from login or `/api/auth/me`.

Field limits and error strings: [docs/API.md](../docs/API.md).

## Done when

- Logged out, "Morning Drift" still shows the two demo comments and no form.
- Logged in, you can post "Hello from the track page" and see it under the older comments, with your display name.
- Refresh. The comment is still there.
- An empty submit shows "Comment cannot be empty" and does not add a blank comment.
- You see delete on your comment and not on Miles's or Aria's.
- Delete removes yours. Theirs remain.
- Likes, playback, and the feed still work.

## Hints

Append the returned `comment` to your comments array. You can refetch the list instead. Either one matches the "done when" list.

Check `response.ok` before you append. A 400 still returns JSON, and that JSON is an error, not a comment.

Send `Content-Type: application/json` on the POST. Send the bearer token on the POST and the DELETE. The GET works without a token.

Trim the text before you decide it is empty, or let the API be the judge and show `error`. Doing both is fine.

## Next

[10. Upload a track](10-upload-a-track.md)
