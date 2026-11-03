import { pool } from "../db.js";
import { iso } from "../lib/files.js";
import type { Comment } from "../types.js";

type CommentRow = {
  id: string;
  body: string;
  created_at: Date;
  author_id: string;
  author_username: string;
  author_display_name: string;
  user_id: string;
};

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    body: row.body,
    createdAt: iso(row.created_at),
    author: {
      id: row.author_id,
      username: row.author_username,
      displayName: row.author_display_name,
    },
  };
}

export async function listComments(trackId: string): Promise<Comment[]> {
  const result = await pool.query<CommentRow>(
    `SELECT
       c.id,
       c.body,
       c.created_at,
       c.user_id,
       u.id AS author_id,
       u.username AS author_username,
       u.display_name AS author_display_name
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.track_id = $1
     ORDER BY c.created_at ASC, c.id ASC`,
    [trackId],
  );
  return result.rows.map(mapComment);
}

export async function insertComment(input: {
  userId: string;
  trackId: string;
  body: string;
}): Promise<Comment> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO comments (user_id, track_id, body)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.userId, input.trackId, input.body],
  );
  const listed = await pool.query<CommentRow>(
    `SELECT
       c.id,
       c.body,
       c.created_at,
       c.user_id,
       u.id AS author_id,
       u.username AS author_username,
       u.display_name AS author_display_name
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1`,
    [result.rows[0].id],
  );
  return mapComment(listed.rows[0]);
}

export async function findCommentOwner(id: string): Promise<{ user_id: string } | null> {
  const result = await pool.query<{ user_id: string }>("SELECT user_id FROM comments WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function deleteComment(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM comments WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
