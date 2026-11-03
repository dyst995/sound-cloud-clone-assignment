import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";
import { config } from "../src/config.js";
import { writeToneWav } from "./wav.js";

const demoPassword = "password123";

const users = [
  {
    username: "nova",
    email: "nova@example.com",
    displayName: "Nova Lane",
    bio: "Late-night electronic sketches and soft synth loops.",
  },
  {
    username: "miles",
    email: "miles@example.com",
    displayName: "Miles Hart",
    bio: "Drums, bass, and short loops recorded in a small room.",
  },
  {
    username: "aria",
    email: "aria@example.com",
    displayName: "Aria Chen",
    bio: "Quiet piano and ambient pieces.",
  },
];

const tracks = [
  {
    owner: "nova",
    title: "Harbor Lights",
    genre: "electronic",
    description: "Soft pulses, like buoys blinking across a bay.",
    seconds: 10,
    frequency: 330,
    wave: "sine" as const,
    playCount: 7,
    createdAgo: "1 hour",
    file: "seed-harbor-lights.wav",
  },
  {
    owner: "aria",
    title: "Blue Hour",
    genre: "jazz",
    description: "A mellow line that sits under conversation.",
    seconds: 9,
    frequency: 392,
    wave: "sine" as const,
    playCount: 9,
    createdAgo: "1 day",
    file: "seed-blue-hour.wav",
  },
  {
    owner: "miles",
    title: "Platform 4",
    genre: "rock",
    description: "A short riff with a harder edge than the other demos.",
    seconds: 7,
    frequency: 294,
    wave: "square" as const,
    playCount: 11,
    createdAgo: "2 days",
    file: "seed-platform-4.wav",
  },
  {
    owner: "aria",
    title: "Glass House",
    genre: "ambient",
    description: "Long tones with lots of space between them.",
    seconds: 12,
    frequency: 523,
    wave: "sine" as const,
    playCount: 14,
    createdAgo: "3 days",
    file: "seed-glass-house.wav",
  },
  {
    owner: "miles",
    title: "Neon Alley",
    genre: "hip-hop",
    description: "A low loop with room for a verse.",
    seconds: 8,
    frequency: 196,
    wave: "square" as const,
    playCount: 25,
    createdAgo: "4 days",
    file: "seed-neon-alley.wav",
  },
  {
    owner: "nova",
    title: "Morning Drift",
    genre: "electronic",
    description: "A slow synth loop for the first hour of the day.",
    seconds: 8,
    frequency: 440,
    wave: "sine" as const,
    playCount: 18,
    createdAgo: "5 days",
    file: "seed-morning-drift.wav",
  },
];

function emptyUploads(): void {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  for (const name of fs.readdirSync(config.uploadDir)) {
    if (name === ".gitkeep") {
      continue;
    }
    fs.rmSync(path.join(config.uploadDir, name), { force: true });
  }
}

export async function seed(): Promise<void> {
  emptyUploads();

  for (const track of tracks) {
    writeToneWav(path.join(config.uploadDir, track.file), {
      frequency: track.frequency,
      seconds: track.seconds,
      wave: track.wave,
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE comments, likes, tracks, users RESTART IDENTITY CASCADE");

    const userIds = new Map<string, string>();
    for (const user of users) {
      const passwordHash = await bcrypt.hash(demoPassword, 10);
      const result = await client.query<{ id: string }>(
        `INSERT INTO users (username, email, password_hash, display_name, bio)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.username, user.email, passwordHash, user.displayName, user.bio],
      );
      userIds.set(user.username, result.rows[0].id);
    }

    const trackIds = new Map<string, string>();
    for (const track of tracks) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO tracks (
           user_id, title, description, genre, audio_path, duration_seconds, play_count, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, now() - $8::interval)
         RETURNING id`,
        [
          userIds.get(track.owner),
          track.title,
          track.description,
          track.genre,
          track.file,
          track.seconds,
          track.playCount,
          track.createdAgo,
        ],
      );
      trackIds.set(track.title, result.rows[0].id);
    }

    const likes: Array<[string, string]> = [
      ["nova", "Neon Alley"],
      ["nova", "Glass House"],
      ["miles", "Morning Drift"],
      ["miles", "Blue Hour"],
      ["aria", "Morning Drift"],
      ["aria", "Neon Alley"],
    ];
    for (const [username, title] of likes) {
      await client.query("INSERT INTO likes (user_id, track_id) VALUES ($1, $2)", [
        userIds.get(username),
        trackIds.get(title),
      ]);
    }

    const comments: Array<[string, string, string, string]> = [
      ["miles", "Morning Drift", "This loop is stuck in my head.", "4 days"],
      ["aria", "Morning Drift", "The soft opening is my favorite part.", "3 days"],
      ["nova", "Glass House", "Played this while reading.", "2 days"],
      ["miles", "Blue Hour", "Would sit well under a late set.", "12 hours"],
    ];
    for (const [username, title, body, createdAgo] of comments) {
      await client.query(
        `INSERT INTO comments (user_id, track_id, body, created_at)
         VALUES ($1, $2, $3, now() - $4::interval)`,
        [userIds.get(username), trackIds.get(title), body, createdAgo],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
