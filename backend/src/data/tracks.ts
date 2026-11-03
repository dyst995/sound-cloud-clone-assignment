import { pool } from "../db.js";
import { iso, publicUploadUrl } from "../lib/files.js";
import type { Track } from "../types.js";

type TrackRow = {
  id: string;
  title: string;
  description: string;
  genre: string;
  audio_path: string;
  cover_path: string | null;
  duration_seconds: number;
  play_count: number;
  created_at: Date;
  artist_id: string;
  artist_username: string;
  artist_display_name: string;
  like_count: number;
  liked_by_me: boolean;
};

const trackSelect = `
  SELECT
    t.id,
    t.title,
    t.description,
    t.genre,
    t.audio_path,
    t.cover_path,
    t.duration_seconds,
    t.play_count,
    t.created_at,
    u.id AS artist_id,
    u.username AS artist_username,
    u.display_name AS artist_display_name,
    (SELECT COUNT(*)::int FROM likes l WHERE l.track_id = t.id) AS like_count,
    EXISTS (
      SELECT 1 FROM likes l
      WHERE l.track_id = t.id AND l.user_id = $1::uuid
    ) AS liked_by_me
  FROM tracks t
  JOIN users u ON u.id = t.user_id
`;

function mapTrack(row: TrackRow): Track {
  const audioUrl = publicUploadUrl(row.audio_path);
  if (!audioUrl) {
    throw new Error("Track is missing an audio file");
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    audioUrl,
    coverUrl: publicUploadUrl(row.cover_path),
    durationSeconds: row.duration_seconds,
    playCount: row.play_count,
    likeCount: row.like_count,
    likedByMe: row.liked_by_me,
    createdAt: iso(row.created_at),
    artist: {
      id: row.artist_id,
      username: row.artist_username,
      displayName: row.artist_display_name,
    },
  };
}

export async function getTrack(id: string, viewerId: string | null): Promise<Track | null> {
  const result = await pool.query<TrackRow>(`${trackSelect} WHERE t.id = $2`, [viewerId, id]);
  const row = result.rows[0];
  return row ? mapTrack(row) : null;
}

export async function listTracks(options: {
  viewerId: string | null;
  q: string;
  genre: string;
  limit: number;
  offset: number;
}): Promise<{ tracks: Track[]; total: number; limit: number; offset: number }> {
  const totalResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM tracks t
     JOIN users u ON u.id = t.user_id
     WHERE (
       $1 = ''
       OR position($1 in lower(t.title)) > 0
       OR position($1 in lower(u.display_name)) > 0
       OR position($1 in lower(u.username)) > 0
     )
     AND ($2 = '' OR t.genre = $2)`,
    [options.q, options.genre],
  );
  const result = await pool.query<TrackRow>(
    `${trackSelect}
     WHERE (
       $2 = ''
       OR position($2 in lower(t.title)) > 0
       OR position($2 in lower(u.display_name)) > 0
       OR position($2 in lower(u.username)) > 0
     )
     AND ($3 = '' OR t.genre = $3)
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT $4 OFFSET $5`,
    [options.viewerId, options.q, options.genre, options.limit, options.offset],
  );
  return {
    tracks: result.rows.map(mapTrack),
    total: totalResult.rows[0]?.total ?? 0,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function listTracksByUser(
  userId: string,
  viewerId: string | null,
): Promise<Track[]> {
  const result = await pool.query<TrackRow>(
    `${trackSelect} WHERE t.user_id = $2 ORDER BY t.created_at DESC, t.id DESC`,
    [viewerId, userId],
  );
  return result.rows.map(mapTrack);
}

export async function insertTrack(input: {
  userId: string;
  title: string;
  description: string;
  genre: string;
  audioPath: string;
  coverPath: string | null;
  durationSeconds: number;
  viewerId: string | null;
}): Promise<Track> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO tracks (user_id, title, description, genre, audio_path, cover_path, duration_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.userId,
      input.title,
      input.description,
      input.genre,
      input.audioPath,
      input.coverPath,
      input.durationSeconds,
    ],
  );
  const track = await getTrack(result.rows[0].id, input.viewerId);
  if (!track) {
    throw new Error("Track disappeared after insert");
  }
  return track;
}

export async function deleteTrack(id: string): Promise<{ audio_path: string; cover_path: string | null } | null> {
  const result = await pool.query<{ audio_path: string; cover_path: string | null }>(
    "DELETE FROM tracks WHERE id = $1 RETURNING audio_path, cover_path",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findTrackOwner(id: string): Promise<{ user_id: string } | null> {
  const result = await pool.query<{ user_id: string }>("SELECT user_id FROM tracks WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function incrementPlayCount(id: string): Promise<boolean> {
  const result = await pool.query("UPDATE tracks SET play_count = play_count + 1 WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function likeTrack(userId: string, trackId: string): Promise<void> {
  await pool.query(
    `INSERT INTO likes (user_id, track_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, trackId],
  );
}

export async function unlikeTrack(userId: string, trackId: string): Promise<void> {
  await pool.query("DELETE FROM likes WHERE user_id = $1 AND track_id = $2", [userId, trackId]);
}

export async function listGenres(): Promise<string[]> {
  const result = await pool.query<{ genre: string }>(
    "SELECT DISTINCT genre FROM tracks ORDER BY genre ASC",
  );
  return result.rows.map((row) => row.genre);
}
