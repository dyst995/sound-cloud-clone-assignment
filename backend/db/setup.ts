import fs from "fs";
import path from "path";
import { pool } from "../src/db.js";
import { seed } from "./seed.js";

export async function waitForDatabase(): Promise<void> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < 20000) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  const message = lastError instanceof Error ? lastError.message : "unknown error";
  throw new Error(`Could not connect to Postgres (${message}). Is Docker running?`);
}

export async function setupDatabase(): Promise<void> {
  await waitForDatabase();
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await seed();
  console.log("Database schema is ready.");
  console.log("Seeded 3 users and 6 tracks.");
  console.log("Demo password for every sample account: password123");
}

export async function runCli(): Promise<void> {
  try {
    await setupDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

export async function launch(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (env.VITEST === "true") {
    return;
  }
  await runCli();
}

void launch();
