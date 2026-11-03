import fs from "fs";
import type { Server } from "http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

export async function startServer(): Promise<Server> {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`Could not connect to Postgres (${message}).`);
    console.error("From the repository root, run: docker compose up -d");
    process.exit(1);
  }

  try {
    await pool.query("SELECT 1 FROM users LIMIT 1");
  } catch {
    console.error("Database tables are missing. From the backend folder, run: npm run db:setup");
    process.exit(1);
  }

  fs.mkdirSync(config.uploadDir, { recursive: true });

  const app = createApp();
  return app.listen(config.port, () => {
    console.log(`API listening on ${config.publicBaseUrl}`);
    console.log(`Swagger UI at ${config.publicBaseUrl}/api/docs`);
  });
}

export async function launch(env: NodeJS.ProcessEnv = process.env): Promise<Server | undefined> {
  if (env.VITEST === "true") {
    return;
  }
  return startServer();
}

void launch();
