import { pool } from "../db.js";
import { iso } from "../lib/files.js";
import type { AuthUser, PublicUser } from "../types.js";

export type UserRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  bio: string;
  created_at: Date;
};

const userColumns = "id, username, email, password_hash, display_name, bio, created_at";

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    createdAt: iso(row.created_at),
  };
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    ...toPublicUser(row),
    email: row.email,
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT ${userColumns} FROM users WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT ${userColumns} FROM users WHERE username = $1`,
    [username],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT ${userColumns} FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function insertUser(input: {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio: string;
}): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (username, email, password_hash, display_name, bio)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${userColumns}`,
    [input.username, input.email, input.passwordHash, input.displayName, input.bio],
  );
  return result.rows[0];
}
