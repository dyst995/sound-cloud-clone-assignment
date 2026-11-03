import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupDatabase } from "../db/setup";
import { createApp } from "../src/app";
import { config } from "../src/config";
import { pool } from "../src/db";

const app = createApp();
const password = "password123";

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  await setupDatabase();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await pool.end();
});

function wavHeader(options: {
  channels?: number;
  sampleRate?: number;
  bits?: number;
  dataSize?: number;
  riff?: boolean;
  wave?: boolean;
}): Buffer {
  const channels = options.channels ?? 1;
  const sampleRate = options.sampleRate ?? 22050;
  const bits = options.bits ?? 16;
  const dataSize = options.dataSize ?? sampleRate * 2;
  const buffer = Buffer.alloc(44);
  buffer.write(options.riff === false ? "XXXX" : "RIFF", 0);
  buffer.writeUInt32LE(36, 4);
  buffer.write(options.wave === false ? "XXXX" : "WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * Math.max(bits / 8, 1), 28);
  buffer.writeUInt16LE(Math.max(channels * (bits / 8), 1), 32);
  buffer.writeUInt16LE(bits, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function withQuery<T>(
  impl: (sql: string, params: unknown[] | undefined, original: typeof pool.query) => unknown,
  run: () => Promise<T>,
): Promise<T> {
  const original = pool.query.bind(pool);
  const spy = vi.spyOn(pool, "query").mockImplementation(((sql: unknown, params?: unknown[]) => {
    return impl(String(sql), params, original);
  }) as typeof pool.query);
  try {
    return await run();
  } finally {
    spy.mockRestore();
  }
}

describe("API", () => {
  it("answers health, unknown routes, and audio files", async () => {
    const health = await request(app).get("/api/health").set("Origin", "http://localhost:5173");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ ok: true });
    expect(health.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    const spec = await request(app).get("/api/openapi.json");
    expect(spec.status).toBe(200);
    expect(spec.body.paths["/api/health"]).toBeTruthy();
    expect(spec.body.servers[0].url).toBe(config.publicBaseUrl);

    const docs = await request(app).get("/api/docs/");
    expect(docs.status).toBe(200);
    expect(docs.text).toContain("SoundCloud clone API");
    expect(docs.text).toContain('id="swagger-ui"');

    const missing = await request(app).get("/api/does-not-exist");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "Not found" });

    const audio = await request(app).get("/uploads/seed-harbor-lights.wav");
    expect(audio.status).toBe(200);
    expect(audio.body.subarray(0, 4).toString()).toBe("RIFF");

    const badJson = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{");
    expect(badJson.status).toBe(400);
    expect(badJson.body.error).toBe("Request body must be JSON");
  });

  it("lists, searches, and pages tracks", async () => {
    const all = await request(app).get("/api/tracks");
    expect(all.body.tracks).toHaveLength(6);
    expect(all.body.total).toBe(6);
    expect(all.body.tracks[0].title).toBe("Harbor Lights");
    expect(all.body.tracks[0].coverUrl).toBeNull();
    expect(all.body.tracks[0].audioUrl).toMatch(/^http:\/\/localhost:3000\/uploads\//);

    const defaults = await request(app).get("/api/tracks?limit=&offset=");
    expect(defaults.body.limit).toBe(20);
    expect(defaults.body.offset).toBe(0);

    const page = await request(app).get("/api/tracks?limit=1&offset=1");
    expect(page.body.tracks).toHaveLength(1);
    expect(page.body.total).toBe(6);

    expect((await request(app).get("/api/tracks?q=morning")).body.tracks.map((track: { title: string }) => track.title)).toEqual([
      "Morning Drift",
    ]);
    expect((await request(app).get("/api/tracks?q=Hart")).body.tracks).toHaveLength(2);
    expect((await request(app).get("/api/tracks?q=MILES")).body.tracks).toHaveLength(2);
    expect((await request(app).get("/api/tracks?genre=Jazz")).body.tracks[0].title).toBe("Blue Hour");
    expect((await request(app).get("/api/tracks?q=morning&genre=rock")).body.total).toBe(0);
    expect((await request(app).get("/api/tracks?q=%25")).body.total).toBe(0);

    expect((await request(app).get("/api/tracks?limit=0")).status).toBe(400);
    expect((await request(app).get("/api/tracks?offset=-1")).status).toBe(400);
    expect((await request(app).get(`/api/tracks?q=${"a".repeat(101)}`)).status).toBe(400);
    expect((await request(app).get(`/api/tracks?genre=${"a".repeat(41)}`)).status).toBe(400);

    const genres = await request(app).get("/api/genres");
    expect(genres.body.genres).toEqual(["ambient", "electronic", "hip-hop", "jazz", "rock"]);
  });

  it("loads a track, counts a play, and hides missing tracks", async () => {
    const list = await request(app).get("/api/tracks?q=morning");
    const id = list.body.tracks[0].id as string;
    const before = list.body.tracks[0].playCount as number;

    const found = await request(app).get(`/api/tracks/${id}`);
    expect(found.body.track.description).toMatch(/first hour/);

    const played = await request(app).post(`/api/tracks/${id}/play`);
    expect(played.body.track.playCount).toBe(before + 1);

    expect((await request(app).get("/api/tracks/not-an-id")).status).toBe(400);
    const missingId = "11111111-1111-4111-8111-111111111111";
    expect((await request(app).get(`/api/tracks/${missingId}`)).status).toBe(404);
    expect((await request(app).post(`/api/tracks/${missingId}/play`)).status).toBe(404);
    expect((await request(app).get(`/api/tracks/${missingId}/comments`)).status).toBe(404);
  });

  it("registers, logs in, and restores the current user", async () => {
    const created = await request(app).post("/api/auth/register").send({
      username: "Sam_OK",
      email: "Sam@Example.com",
      password,
      displayName: "Sam Okonkwo",
      bio: "Hello",
    });
    expect(created.status).toBe(201);
    expect(created.body.user.username).toBe("sam_ok");
    expect(created.body.user.password_hash).toBeUndefined();

    const noBio = await request(app).post("/api/auth/register").send({
      username: "robin",
      email: "robin@example.com",
      password,
      displayName: "Robin",
    });
    expect(noBio.status).toBe(201);
    expect(noBio.body.user.bio).toBe("");

    expect((await request(app).post("/api/auth/register").send({
      username: "ab",
      email: "ab@example.com",
      password,
      displayName: "Ab",
    })).status).toBe(400);
    expect((await request(app).post("/api/auth/register").send({
      username: "bad-name",
      email: "bad@example.com",
      password,
      displayName: "Bad",
    })).body.error).toMatch(/letters/);
    expect((await request(app).post("/api/auth/register").send({
      username: "shortpw",
      email: "short@example.com",
      password: "short",
      displayName: "Short",
    })).body.error).toMatch(/8 characters/);

    const duplicateEmail = await request(app).post("/api/auth/register").send({
      username: "someone",
      email: "sam@example.com",
      password,
      displayName: "Someone",
    });
    expect(duplicateEmail.status).toBe(409);
    expect(duplicateEmail.body.error).toBe("Email is already registered");

    const duplicateUsername = await request(app).post("/api/auth/register").send({
      username: "sam_ok",
      email: "other@example.com",
      password,
      displayName: "Other",
    });
    expect(duplicateUsername.body.error).toBe("Username is already taken");

    const login = await request(app).post("/api/auth/login").send({
      email: "NOVA@example.com",
      password,
    });
    expect(login.status).toBe(200);
    expect(login.body.user.displayName).toBe("Nova Lane");

    expect((await request(app).post("/api/auth/login").send({
      email: "nova@example.com",
      password: "wrong-password",
    })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password,
    })).body.error).toBe("Email or password is wrong");
    expect((await request(app).post("/api/auth/login").send({ email: "not-an-email", password })).status).toBe(400);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.body.user.email).toBe("nova@example.com");
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/tracks").set("Authorization", "Bearer not-a-token")).status).toBe(401);
    expect((await request(app).get("/api/tracks").set("Authorization", "Bearer")).status).toBe(401);
    expect((await request(app).get("/api/tracks").set("Authorization", "Basic abc")).status).toBe(401);

    const stringToken = jwt.sign("hello", config.jwtSecret);
    const noSubject = jwt.sign({ name: "nova" }, config.jwtSecret);
    expect((await request(app).get("/api/tracks").set("Authorization", `Bearer ${stringToken}`)).status).toBe(401);
    expect((await request(app).get("/api/tracks").set("Authorization", `Bearer ${noSubject}`)).status).toBe(401);

    const gone = await request(app).post("/api/auth/register").send({
      username: "tempuser",
      email: "temp@example.com",
      password,
      displayName: "Temp",
    });
    await pool.query("DELETE FROM users WHERE id = $1", [gone.body.user.id]);
    const stale = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${gone.body.token}`);
    expect(stale.status).toBe(401);
  });

  it("shows artist profiles", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "miles@example.com", password });
    const profile = await request(app)
      .get("/api/users/NOVA")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(profile.body.user.displayName).toBe("Nova Lane");
    expect(profile.body.user.email).toBeUndefined();
    expect(profile.body.tracks).toHaveLength(2);
    expect(profile.body.tracks.some((track: { likedByMe: boolean }) => track.likedByMe)).toBe(true);

    expect((await request(app).get("/api/users/nobody")).status).toBe(404);
    expect((await request(app).get("/api/users/bad-name")).status).toBe(404);
  });

  it("likes, unlikes, comments, and enforces owners", async () => {
    const nova = await request(app).post("/api/auth/login").send({ email: "nova@example.com", password });
    const miles = await request(app).post("/api/auth/login").send({ email: "miles@example.com", password });
    const platform = (await request(app).get("/api/tracks?q=platform")).body.tracks[0];
    const morning = (await request(app).get("/api/tracks?q=morning")).body.tracks[0];

    expect((await request(app).post(`/api/tracks/${platform.id}/like`)).status).toBe(401);

    const liked = await request(app)
      .post(`/api/tracks/${platform.id}/like`)
      .set("Authorization", `Bearer ${nova.body.token}`);
    expect(liked.body.track.likedByMe).toBe(true);
    expect(liked.body.track.likeCount).toBe(1);

    const again = await request(app)
      .post(`/api/tracks/${platform.id}/like`)
      .set("Authorization", `Bearer ${nova.body.token}`);
    expect(again.body.track.likeCount).toBe(1);

    const unliked = await request(app)
      .delete(`/api/tracks/${platform.id}/like`)
      .set("Authorization", `Bearer ${nova.body.token}`);
    expect(unliked.body.track.likedByMe).toBe(false);

    const alreadyGone = await request(app)
      .delete(`/api/tracks/${platform.id}/like`)
      .set("Authorization", `Bearer ${nova.body.token}`);
    expect(alreadyGone.body.track.likeCount).toBe(0);

    const missingId = "11111111-1111-4111-8111-111111111111";
    expect((await request(app).post(`/api/tracks/${missingId}/like`).set("Authorization", `Bearer ${nova.body.token}`)).status).toBe(404);
    expect((await request(app).delete(`/api/tracks/${missingId}/like`).set("Authorization", `Bearer ${nova.body.token}`)).status).toBe(404);

    const comments = await request(app).get(`/api/tracks/${morning.id}/comments`);
    expect(comments.body.comments).toHaveLength(2);
    expect(comments.body.comments[0].author.username).toBe("miles");

    const created = await request(app)
      .post(`/api/tracks/${morning.id}/comments`)
      .set("Authorization", `Bearer ${nova.body.token}`)
      .send({ body: "  Hello from Nova  " });
    expect(created.status).toBe(201);
    expect(created.body.comment.body).toBe("Hello from Nova");

    expect((await request(app)
      .post(`/api/tracks/${morning.id}/comments`)
      .set("Authorization", `Bearer ${nova.body.token}`)
      .send({ body: "   " })).body.error).toBe("Comment cannot be empty");
    expect((await request(app)
      .post(`/api/tracks/${morning.id}/comments`)
      .set("Authorization", `Bearer ${nova.body.token}`)
      .send({ body: "a".repeat(501) })).status).toBe(400);
    expect((await request(app)
      .post(`/api/tracks/${missingId}/comments`)
      .set("Authorization", `Bearer ${nova.body.token}`)
      .send({ body: "Hi" })).status).toBe(404);

    const forbidden = await request(app)
      .delete(`/api/comments/${comments.body.comments[0].id}`)
      .set("Authorization", `Bearer ${nova.body.token}`);
    expect(forbidden.status).toBe(403);

    const removed = await request(app)
      .delete(`/api/comments/${created.body.comment.id}`)
      .set("Authorization", `Bearer ${nova.body.token}`);
    expect(removed.body).toEqual({ ok: true });
    expect((await request(app).delete(`/api/comments/${missingId}`).set("Authorization", `Bearer ${miles.body.token}`)).status).toBe(404);
  });

  it("uploads valid and invalid files, then deletes owned tracks", async () => {
    const sam = await request(app).post("/api/auth/login").send({ email: "sam@example.com", password });
    const token = sam.body.token as string;
    const auth = { Authorization: `Bearer ${token}` };

    expect((await request(app).post("/api/tracks")).status).toBe(401);

    const noFile = await request(app).post("/api/tracks").set(auth).field("title", "Nope").field("genre", "folk");
    expect(noFile.body.error).toBe("Choose an audio file");

    const textFile = await request(app)
      .post("/api/tracks")
      .set(auth)
      .attach("audio", Buffer.from("hello"), "notes.txt")
      .field("title", "Nope")
      .field("genre", "folk");
    expect(textFile.body.error).toMatch(/mp3, wav/);

    const badCover = await request(app)
      .post("/api/tracks")
      .set(auth)
      .attach("audio", wavHeader({}), "song.wav")
      .attach("cover", Buffer.from("not-an-image"), "cover.bmp")
      .field("title", "Nope")
      .field("genre", "folk");
    expect(badCover.body.error).toMatch(/jpg, png/);

    const mp3 = await request(app)
      .post("/api/tracks")
      .set(auth)
      .attach("audio", Buffer.from("not really mp3"), "song.mp3")
      .field("title", "Rough Mix")
      .field("genre", "Folk");
    expect(mp3.status).toBe(201);
    expect(mp3.body.track.genre).toBe("folk");
    expect(mp3.body.track.durationSeconds).toBe(0);
    expect(mp3.body.track.coverUrl).toBeNull();

    const cases = [
      Buffer.from("RIFF"),
      wavHeader({ riff: false }),
      wavHeader({ wave: false }),
      wavHeader({ channels: 0 }),
      wavHeader({ sampleRate: 0 }),
      wavHeader({ bits: 0 }),
      wavHeader({ dataSize: 0 }),
    ];
    for (const [index, body] of cases.entries()) {
      const response = await request(app)
        .post("/api/tracks")
        .set(auth)
        .attach("audio", body, `case-${index}.wav`)
        .field("title", `Case ${index}`)
        .field("genre", "ambient");
      expect(response.status).toBe(201);
      expect(response.body.track.durationSeconds).toBe(0);
    }

    const readable = wavHeader({ dataSize: 22050 * 2 });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const uploaded = await request(app)
      .post("/api/tracks")
      .set(auth)
      .attach("audio", readable, "Window.WAV")
      .attach("cover", png, "cover.png")
      .field("title", "Window Seat")
      .field("description", "Recorded on the train.")
      .field("genre", "Folk");
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.track.durationSeconds).toBe(1);
    expect(uploaded.body.track.coverUrl).toMatch(/\.png$/);
    expect((await request(app).get(new URL(uploaded.body.track.coverUrl).pathname)).status).toBe(200);

    const readError = vi.spyOn(fs, "readSync").mockImplementation(() => {
      throw new Error("unreadable");
    });
    const unreadable = await request(app)
      .post("/api/tracks")
      .set(auth)
      .attach("audio", readable, "broken.wav")
      .field("title", "Broken Wave")
      .field("genre", "ambient");
    readError.mockRestore();
    expect(unreadable.status).toBe(201);
    expect(unreadable.body.track.durationSeconds).toBe(0);

    expect((await request(app).post("/api/tracks").set(auth).attach("audio", readable, "x.wav").field("title", "   ").field("genre", "folk")).body.error).toBe("Title is required");
    expect((await request(app).post("/api/tracks").set(auth).attach("audio", readable, "x.wav").field("genre", "folk")).body.error).toBe("Title is required");
    expect((await request(app).post("/api/tracks").set(auth).attach("audio", readable, "x.wav").field("title", "Title")).body.error).toBe("Genre is required");

    const unexpected = await request(app)
      .post("/api/tracks")
      .set(auth)
      .attach("audio", readable, "x.wav")
      .attach("bonus", Buffer.from("x"), "extra.txt")
      .field("title", "Extra")
      .field("genre", "folk");
    expect(unexpected.status).toBe(400);

    const tooBig = await request(app)
      .post("/api/tracks")
      .set(auth)
      .attach("audio", Buffer.alloc(config.maxUploadBytes + 1), "big.wav")
      .field("title", "Big")
      .field("genre", "folk");
    expect(tooBig.body.error).toBe("File is larger than 15 MB");

    const top = await request(app).get("/api/tracks?limit=1");
    expect(top.body.tracks[0].title).not.toBe("Harbor Lights");
    expect((await request(app).get("/api/users/sam_ok")).body.tracks.length).toBeGreaterThan(0);
    expect((await request(app).get("/api/genres")).body.genres).toContain("folk");

    const nova = await request(app).post("/api/auth/login").send({ email: "nova@example.com", password });
    const forbidden = await request(app)
      .delete(`/api/tracks/${uploaded.body.track.id}`)
      .set("Authorization", `Bearer ${nova.body.token}`);
    expect(forbidden.status).toBe(403);

    const removed = await request(app).delete(`/api/tracks/${uploaded.body.track.id}`).set(auth);
    expect(removed.body).toEqual({ ok: true });
    const removedMp3 = await request(app).delete(`/api/tracks/${mp3.body.track.id}`).set(auth);
    expect(removedMp3.body).toEqual({ ok: true });
    expect((await request(app).delete(`/api/tracks/${"11111111-1111-4111-8111-111111111111"}`).set(auth)).status).toBe(404);

    for (const name of fs.readdirSync(config.uploadDir)) {
      if (!name.startsWith("seed-") && name !== ".gitkeep") {
        fs.rmSync(path.join(config.uploadDir, name), { force: true });
      }
    }
  });

  it("reports a database error that is not a duplicate account", async () => {
    await pool.query("CREATE UNIQUE INDEX users_display_name_test ON users (display_name)");
    try {
      const response = await request(app).post("/api/auth/register").send({
        username: "copied",
        email: "copied@example.com",
        password,
        displayName: "Nova Lane",
      });
      expect(response.status).toBe(500);
    } finally {
      await pool.query("DROP INDEX users_display_name_test");
    }
  });

  it("covers defensive database branches", async () => {
    const nova = await request(app).post("/api/auth/login").send({ email: "nova@example.com", password });
    const token = nova.body.token as string;
    const morning = (await request(app).get("/api/tracks?q=morning")).body.tracks[0];
    const owner = await pool.query<{ id: string }>("SELECT id FROM users WHERE username = 'nova'");
    const broken = await pool.query<{ id: string }>(
      `INSERT INTO tracks (user_id, title, description, genre, audio_path, duration_seconds)
       VALUES ($1, 'Broken', '', 'electronic', '', 0)
       RETURNING id`,
      [owner.rows[0].id],
    );
    const brokenResponse = await request(app).get(`/api/tracks/${broken.rows[0].id}`);
    expect(brokenResponse.status).toBe(500);
    await pool.query("DELETE FROM tracks WHERE id = $1", [broken.rows[0].id]);

    const emptyTotal = await withQuery(async (sql, params, original) => {
      if (sql.includes("AS total")) {
        return { rows: [], rowCount: 0 };
      }
      return original(sql, params);
    }, () => request(app).get("/api/tracks"));
    expect(emptyTotal.body.total).toBe(0);
    expect(emptyTotal.body.tracks.length).toBeGreaterThan(0);

    const disappeared = await withQuery(async (sql, params, original) => {
      if (sql.includes("FROM tracks t")) {
        return { rows: [], rowCount: 0 };
      }
      return original(sql, params);
    }, () => request(app).post(`/api/tracks/${morning.id}/play`));
    expect(disappeared.status).toBe(404);

    const nullCount = await withQuery((sql, params, original) => {
      if (sql.includes("play_count = play_count + 1")) {
        return { rows: [], rowCount: null };
      }
      return original(sql, params);
    }, () => request(app).post(`/api/tracks/${morning.id}/play`));
    expect(nullCount.status).toBe(404);

    let hideTrack = false;
    const missingAfterLike = await withQuery(async (sql, params, original) => {
      const result = await original(sql, params);
      if (sql.includes("INSERT INTO likes")) {
        hideTrack = true;
      }
      if (hideTrack && sql.includes("FROM tracks t")) {
        hideTrack = false;
        return { rows: [], rowCount: 0 };
      }
      return result;
    }, () => request(app).post(`/api/tracks/${morning.id}/like`).set("Authorization", `Bearer ${token}`));
    expect(missingAfterLike.status).toBe(404);

    let hideUnlike = false;
    const missingAfterUnlike = await withQuery(async (sql, params, original) => {
      const result = await original(sql, params);
      if (sql.includes("DELETE FROM likes")) {
        hideUnlike = true;
      }
      if (hideUnlike && sql.includes("FROM tracks t")) {
        hideUnlike = false;
        return { rows: [], rowCount: 0 };
      }
      return result;
    }, () => request(app).delete(`/api/tracks/${morning.id}/like`).set("Authorization", `Bearer ${token}`));
    expect(missingAfterUnlike.status).toBe(404);

    let hideInserted = false;
    const upload = await withQuery(async (sql, params, original) => {
      const result = await original(sql, params);
      if (sql.includes("INSERT INTO tracks")) {
        hideInserted = true;
      }
      if (hideInserted && sql.includes("FROM tracks t")) {
        hideInserted = false;
        return { rows: [], rowCount: 0 };
      }
      return result;
    }, () =>
      request(app)
        .post("/api/tracks")
        .set("Authorization", `Bearer ${token}`)
        .attach("audio", wavHeader({ dataSize: 22050 * 2 }), "ghost.wav")
        .field("title", "Ghost")
        .field("genre", "ambient"));
    expect(upload.status).toBe(500);
    await pool.query("DELETE FROM tracks WHERE title = 'Ghost'");

    const kept = await withQuery((sql, params, original) => {
      if (sql.startsWith("DELETE FROM tracks")) {
        return { rows: [], rowCount: 1 };
      }
      return original(sql, params);
    }, async () => {
      const created = await request(app)
        .post("/api/tracks")
        .set("Authorization", `Bearer ${token}`)
        .attach("audio", Buffer.from("id3"), "keep.mp3")
        .field("title", "Keep Me")
        .field("genre", "rock");
      const deleted = await request(app)
        .delete(`/api/tracks/${created.body.track.id}`)
        .set("Authorization", `Bearer ${token}`);
      return { created, deleted };
    });
    expect(kept.deleted.body).toEqual({ ok: true });
    const stillThere = await request(app).get(`/api/tracks/${kept.created.body.track.id}`);
    expect(stillThere.status).toBe(200);
    await request(app)
      .delete(`/api/tracks/${kept.created.body.track.id}`)
      .set("Authorization", `Bearer ${token}`);
  });
});
