# 6. Sign up and log in

**Difficulty:** Medium

**Goal:** Let a visitor create an account, come back as that person, and log out.

## Before you start

The feed and the track page from task 5 both work, and the player survives navigation between them.

You can try the demo accounts before your form works. Password for each is `password123`. Emails: `nova@example.com`, `miles@example.com`, `aria@example.com`.

## What to build

Add routes `/login` and `/register`, plus links in the header.

The register form collects display name, username, email, and password. Bio is optional. If you skip the field, omit `bio` or send an empty string.

The login form collects email and password.

On success, both endpoints return `{ "token", "user" }`. Save the token in `localStorage`. Keep the user in React state so the header can show the display name. Hide the login and register links while someone is logged in, and show a logout button instead.

Logout removes the token and clears the user. It does not call the API. There is no logout endpoint.

When the page loads and a token is already saved, call `GET /api/auth/me` and restore the user. A refresh should not send them back to the login form.

Show the API's `error` string on the form when a request fails. Examples you should be able to trigger:

- Registering with a password shorter than 8 characters.
- Registering with the username `nova`.
- Logging in with the wrong password.

After a successful register or login, send them to `/`.

Playback, search, and the track page still work when logged out.

## API

Read the field rules before you build the form. They are in [docs/API.md](../docs/API.md) under Auth routes. Short version:

- Username: 3–20 characters, letters, numbers, underscores.
- Password: at least 8 characters.
- Display name: required, at most 40 characters.
- Email: must look like an email.

`POST /api/auth/register` and `POST /api/auth/login` take JSON. Send `Content-Type: application/json`.

`GET /api/auth/me` needs the header `Authorization: Bearer TOKEN`.

A `400`, `401`, or `409` still returns `{ "error": "message" }`. `fetch` will not throw. Read `response.ok`, then read the JSON either way.

## Done when

- You can register a new user and see that display name in the header.
- Refreshing the browser keeps you logged in.
- Logout brings the login and register links back. Refresh stays logged out.
- Logging in as `aria@example.com` / `password123` shows "Aria Chen".
- A wrong password shows "Email or password is wrong" on the form.
- Registering username `nova` shows "Username is already taken".
- The feed and a track page still load when you are logged out.

## Hints

One module can own the token so components do not each read `localStorage` differently.

```ts
const TOKEN_KEY = "token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

On login:

```ts
const response = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const data = await response.json();
if (!response.ok) {
  // data.error is the message to show
  return;
}
localStorage.setItem("token", data.token);
```

A React context is a good place for `{ user, login, logout }` once more than the header needs the user. You can pass props for this task if the tree is still small. Later tasks (likes, comments, upload) will want the token in more than one screen.

Check `response.ok` before you save a token. A failed login also returns JSON, and that JSON has no token.

## Next

[7. Artist profile](07-artist-profile.md)
