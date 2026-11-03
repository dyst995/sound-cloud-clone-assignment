# API reference

Base URL: `http://localhost:3000`

The server must be running (`npm run dev` inside `backend`) and the database must be set up (`npm run db:setup`). Demo audio files are short generated tones.

You can test these endpoints with curl, [Postman](https://www.postman.com/downloads/), or Swagger UI at [http://localhost:3000/api/docs](http://localhost:3000/api/docs). Setup is in the README section [Try the API](../README.md#4-try-the-api).

Send JSON requests with the header `Content-Type: application/json`. Uploads are the exception: they use multipart form data, described below.

## Errors

Failed requests return JSON:

```json
{ "error": "Track not found" }
```

| Status | When |
| --- | --- |
| 400 | The body, query, or upload is invalid |
| 401 | Login is required, or the token is invalid or expired |
| 403 | You are logged in, but this item belongs to someone else |
| 404 | The track, user, or comment does not exist |
| 409 | That email or username is already registered |
| 500 | Unexpected server error |

## Authentication

Register and login return a token. Keep it and send it on later requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens last 7 days. If you send an `Authorization` header, it must be a valid bearer token, including on public routes. Omit the header when you are logged out.

Passwords are stored hashed. The API never returns a password hash.

Usernames and emails are stored in lowercase.

### Auth user

Register, login, and `/api/auth/me` return the logged-in user, including email:

```json
{
  "id": "5b0b0a2e-1c4d-4f0a-9a1e-0d5a6e7f8a9b",
  "username": "nova",
  "email": "nova@example.com",
  "displayName": "Nova Lane",
  "bio": "Late-night electronic sketches and soft synth loops.",
  "createdAt": "2026-11-03T12:00:00.000Z"
}
```

### Public user

Profile responses omit email:

```json
{
  "id": "5b0b0a2e-1c4d-4f0a-9a1e-0d5a6e7f8a9b",
  "username": "nova",
  "displayName": "Nova Lane",
  "bio": "Late-night electronic sketches and soft synth loops.",
  "createdAt": "2026-11-03T12:00:00.000Z"
}
```

## Track object

`audioUrl` and `coverUrl` are absolute. An `<audio>` element on the Vite app can use `audioUrl` directly. `coverUrl` is `null` when the track has no cover image. `durationSeconds` is `0` when the server cannot read the length (typical for uploads that are not wav files). `likedByMe` is `false` when you are logged out.

```json
{
  "id": "8d6f2c1a-9b34-4e77-8c21-1a2b3c4d5e6f",
  "title": "Morning Drift",
  "description": "A slow synth loop for the first hour of the day.",
  "genre": "electronic",
  "audioUrl": "http://localhost:3000/uploads/seed-morning-drift.wav",
  "coverUrl": null,
  "durationSeconds": 8,
  "playCount": 18,
  "likeCount": 2,
  "likedByMe": false,
  "createdAt": "2026-10-29T12:00:00.000Z",
  "artist": {
    "id": "5b0b0a2e-1c4d-4f0a-9a1e-0d5a6e7f8a9b",
    "username": "nova",
    "displayName": "Nova Lane"
  }
}
```

Ids in this document are examples. Copy real ids from `GET /api/tracks`.

## Comment object

```json
{
  "id": "c1e2d3f4-a5b6-47c8-9d0e-1f2a3b4c5d6e",
  "body": "This loop is stuck in my head.",
  "createdAt": "2026-10-30T12:00:00.000Z",
  "author": {
    "id": "11111111-2222-4333-8444-555555555555",
    "username": "miles",
    "displayName": "Miles Hart"
  }
}
```

---

## Health

### `GET /api/health`

No auth.

```json
{ "ok": true }
```

## Genres

### `GET /api/genres`

No auth. Returns the distinct genres currently stored on tracks, sorted A to Z. After setup this is `ambient`, `electronic`, `hip-hop`, `jazz`, and `rock`. A genre you upload is included after that.

```json
{ "genres": ["ambient", "electronic", "hip-hop", "jazz", "rock"] }
```

## Tracks

### `GET /api/tracks`

No auth. Optional query parameters:

| Param | Default | Meaning |
| --- | --- | --- |
| `q` | empty | Case-insensitive match against title, artist display name, or username. At most 100 characters. |
| `genre` | empty | Exact genre match, case-insensitive. |
| `limit` | 20 | Page size. Minimum 1, maximum 50. |
| `offset` | 0 | How many matching tracks to skip. |

Tracks are newest first.

`GET /api/tracks?q=morning&genre=electronic`

```json
{
  "tracks": [
    {
      "id": "8d6f2c1a-9b34-4e77-8c21-1a2b3c4d5e6f",
      "title": "Morning Drift",
      "genre": "electronic",
      "playCount": 18,
      "likeCount": 2,
      "likedByMe": false,
      "artist": { "username": "nova", "displayName": "Nova Lane" }
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

Each item in `tracks` is a full track object. The item above is shortened to show the shape of the list. `total` counts every match, not just this page.

### `GET /api/tracks/:id`

No auth. `200` and `{ "track": { ... } }`. Unknown id: `404` `{ "error": "Track not found" }`. A value that is not a UUID: `400` `{ "error": "Invalid id" }`.

### `POST /api/tracks/:id/play`

No auth. Adds 1 to `playCount` and returns the track.

```json
{ "track": { "playCount": 19 } }
```

The real response is the full track object. Call this once when playback starts, not on a timer.

### `POST /api/tracks`

Auth required. Multipart form data, maximum 15 MB per file.

| Field | Required | Notes |
| --- | --- | --- |
| `audio` | yes | File. Extensions: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.webm` |
| `cover` | no | Image. Extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` |
| `title` | yes | 1–120 characters |
| `description` | no | At most 1000 characters |
| `genre` | yes | 1–40 characters. Stored lowercase. |

Do not set the `Content-Type` header yourself. The browser must set the multipart boundary. If you set `Content-Type: application/json`, or set `Content-Type: multipart/form-data` without the boundary, the upload fails.

```js
const form = new FormData();
form.append("audio", audioFile);
form.append("cover", coverFile); // optional
form.append("title", "Window Seat");
form.append("description", "Recorded on the train.");
form.append("genre", "ambient");

const response = await fetch("http://localhost:3000/api/tracks", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
```

`201` returns `{ "track": { ... } }`. The new track is also returned by the feed and by that user's profile.

The same upload works in curl or in [Postman](https://www.postman.com/downloads/) (Body → form-data, file field `audio`).

curl:

```bash
curl -X POST http://localhost:3000/api/tracks \
  -H "Authorization: Bearer TOKEN" \
  -F "audio=@./my-track.wav" \
  -F "title=Window Seat" \
  -F "description=Recorded on the train." \
  -F "genre=ambient"
```

### `DELETE /api/tracks/:id`

Auth required. Only the owner can delete a track. Comments and likes on it are removed too, along with the audio file and cover.

`200`

```json
{ "ok": true }
```

Someone else's track: `403` `{ "error": "You can only delete your own track" }`.

### `POST /api/tracks/:id/like`

Auth required. Likes the track. Liking it again does not add a second like.

`200` returns the full track, with `likedByMe: true` and an updated `likeCount`.

Logged out: `401` `{ "error": "Login required" }`.

### `DELETE /api/tracks/:id/like`

Auth required. Removes your like. If you had not liked it, the response is still `200`.

`200` returns the full track.

## Comments

### `GET /api/tracks/:id/comments`

No auth. Comments are oldest first. Unknown track: `404`.

```json
{
  "comments": [
    {
      "id": "c1e2d3f4-a5b6-47c8-9d0e-1f2a3b4c5d6e",
      "body": "This loop is stuck in my head.",
      "createdAt": "2026-10-30T12:00:00.000Z",
      "author": {
        "id": "11111111-2222-4333-8444-555555555555",
        "username": "miles",
        "displayName": "Miles Hart"
      }
    }
  ]
}
```

### `POST /api/tracks/:id/comments`

Auth required.

```json
{ "body": "This one stays on repeat." }
```

`body` must be 1–500 characters after trimming. `201` returns `{ "comment": { ... } }`.

Empty body: `400` `{ "error": "Comment cannot be empty" }`.

### `DELETE /api/comments/:id`

Auth required. Only the comment's author can delete it.

`200`

```json
{ "ok": true }
```

Someone else's comment: `403` `{ "error": "You can only delete your own comment" }`.

Compare `comment.author.id` with the logged-in user's `id` to decide whether to show a delete button.

## Users

### `GET /api/users/:username`

No auth. Username lookup is case-insensitive. The response user has no email. `tracks` is that artist's tracks, newest first, using the same track object as the feed.

```json
{
  "user": {
    "id": "5b0b0a2e-1c4d-4f0a-9a1e-0d5a6e7f8a9b",
    "username": "nova",
    "displayName": "Nova Lane",
    "bio": "Late-night electronic sketches and soft synth loops.",
    "createdAt": "2026-11-03T12:00:00.000Z"
  },
  "tracks": []
}
```

Unknown username: `404` `{ "error": "User not found" }`.

## Auth routes

### `POST /api/auth/register`

No auth.

```json
{
  "username": "sam",
  "email": "sam@example.com",
  "password": "password123",
  "displayName": "Sam Okonkwo",
  "bio": "Optional. At most 280 characters."
}
```

| Field | Rules |
| --- | --- |
| `username` | 3–20 characters. Letters, numbers, and underscores. Stored lowercase. |
| `email` | Valid email. Stored lowercase. |
| `password` | 8–72 characters. |
| `displayName` | 1–40 characters. |
| `bio` | Optional. At most 280 characters. |

`201`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    "username": "sam",
    "email": "sam@example.com",
    "displayName": "Sam Okonkwo",
    "bio": "Optional. At most 280 characters.",
    "createdAt": "2026-11-03T12:00:00.000Z"
  }
}
```

Duplicate email: `409` `{ "error": "Email is already registered" }`.

Duplicate username: `409` `{ "error": "Username is already taken" }`.

### `POST /api/auth/login`

No auth.

```json
{
  "email": "nova@example.com",
  "password": "password123"
}
```

`200` returns the same `{ "token", "user" }` shape as register.

Wrong email or password: `401` `{ "error": "Email or password is wrong" }`. The message is the same in both cases.

### `GET /api/auth/me`

Auth required. Use this when the page loads and a token is already saved, to restore the current user.

`200`

```json
{
  "user": {
    "id": "5b0b0a2e-1c4d-4f0a-9a1e-0d5a6e7f8a9b",
    "username": "nova",
    "email": "nova@example.com",
    "displayName": "Nova Lane",
    "bio": "Late-night electronic sketches and soft synth loops.",
    "createdAt": "2026-11-03T12:00:00.000Z"
  }
}
```

Missing token: `401` `{ "error": "Login required" }`.

Bad or expired token: `401` `{ "error": "Invalid or expired token" }`.
