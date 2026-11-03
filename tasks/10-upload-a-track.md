# 10. Upload a track

**Difficulty:** Hardest

**Goal:** Publish an audio file from the app and find it in the feed and on your profile.

## Before you start

Comments, likes, auth, profiles, search, and playback all work. Log in with a user you created, or with a demo account.

You need a small audio file on your computer. mp3, wav, ogg, m4a, aac, flac, and webm are accepted. The demo tones in `backend/uploads` are wav files if you do not have one of your own. Do not upload anything you do not have the rights to share, even on your own machine, if you would not want it in a demo.

`npm run db:setup` deletes uploads. Do not run it while you are checking this task unless you are ready to upload again.

## What to build

Add a route `/upload` and a header link that only shows when someone is logged in. Logged-out visitors who open `/upload` directly should be sent to `/login`.

The form collects:

- An audio file (required)
- A cover image (optional)
- Title (required)
- Description (optional)
- Genre (required). A text field is fine. You can offer the genres from `GET /api/genres` as suggestions, but a new genre such as `folk` must be allowed. The API stores whatever genre you send, in lowercase.

On submit, send multipart form data. Do not send JSON. Do not set the `Content-Type` header yourself. The browser has to add the multipart boundary. If you set the header by hand, the API will not see the file.

While the upload is in progress, disable the submit button and show that it is working. Files can take a moment. There is no progress-percentage endpoint. A pending state is enough.

On success, go to the new track's page (`/tracks/NEW_ID`). The response body's `track.id` is that id. Play the new track from that page.

The track also appears on `/` and on `/users/YOUR_USERNAME`. If you typed a new genre, it shows up in the genre dropdown after the feed refetches genres.

Show `error` from the API on the form. Cases to hit on purpose:

- Submit with no file: "Choose an audio file"
- Submit a non-audio file, such as a `.txt`: the audio-type error from the API
- Submit with an empty title: "Title is required"

A cover is optional. If you attach one, the track page and the feed card show that image instead of the letter placeholder.

`durationSeconds` may be `0` for mp3 and other non-wav files. Do not treat `0` as a failed upload. Wav files you upload should get a real duration.

## API

`POST /api/tracks` with `Authorization: Bearer TOKEN`.

Form fields are exactly `audio`, `cover`, `title`, `description`, and `genre`. The file field names matter.

Success is `201` and `{ "track": { ... } }`. `track.audioUrl` is a full URL on port 3000.

Limits, allowed extensions, and a request example are in [docs/API.md](../docs/API.md) under `POST /api/tracks`. Use that example. This task does not repeat it.

## Done when

- Logged out, `/upload` does not upload anything.
- Logged in, you can upload a short audio file and land on its track page.
- The new track plays through the same player as the demo tracks.
- It appears on the feed, at the top, because new tracks are listed first.
- It appears on your profile and not on Nova's profile (unless you are logged in as Nova).
- Search can find it by title.
- A failed submit shows the API error and leaves you on the form with the values still filled in, except you will need to pick the file again if the browser cleared the file input.
- Likes and comments work on the uploaded track.
- The older demo tracks still play.

## Optional

`DELETE /api/tracks/:id` removes a track you own. If you have time, add a delete button on the track page that only renders when `track.artist.id` is the logged-in user. After it succeeds, go back to the feed. The API returns `{ "ok": true }`. Deleting someone else's track returns 403, so do not show the button for those tracks.

## Hints

Build the body with `FormData` and `form.append(...)`. Append the file from an `<input type="file">` via `input.files?.[0]`, not the filename string.

The auth header is still required. The JSON content-type header is not.

After a success, genres you cached at startup are stale if you invented a new one. Refetch `GET /api/genres` when the feed loads, or after upload, so the dropdown learns the new name.

This is the last task. If the feed, the track page, profiles, likes, comments, and an upload all work in one session, you have the project.
