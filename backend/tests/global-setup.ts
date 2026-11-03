import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import pg from "pg";

const container = "soundcloud-clone-test-db";
const port = 5434;
const adminUrl = `postgres://soundcloud:soundcloud@127.0.0.1:${port}/postgres`;
const testUrl = `postgres://soundcloud:soundcloud@127.0.0.1:${port}/soundcloud_test`;

export const databaseUrlFile = path.join(os.tmpdir(), "soundcloud-clone-test-db-url");

async function canConnect(url: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      // The client never connected.
    }
    return false;
  }
}

function ensureContainer(): void {
  const inspect = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", container], {
    encoding: "utf8",
  });
  if (inspect.status === 0 && inspect.stdout.trim() === "true") {
    return;
  }
  if (inspect.status === 0) {
    execFileSync("docker", ["start", container], { stdio: "inherit" });
    return;
  }
  execFileSync(
    "docker",
    [
      "run",
      "-d",
      "--name",
      container,
      "-e",
      "POSTGRES_USER=soundcloud",
      "-e",
      "POSTGRES_PASSWORD=soundcloud",
      "-e",
      "POSTGRES_DB=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16",
    ],
    { stdio: "inherit" },
  );
}

async function waitForPostgres(): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    if (await canConnect(adminUrl)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Test Postgres did not start. Is Docker running?");
}

export default async function globalSetup(): Promise<void> {
  if (!(await canConnect(adminUrl))) {
    ensureContainer();
    await waitForPostgres();
  }

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'soundcloud_test' AND pid <> pg_backend_pid()
  `);
  const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'soundcloud_test'");
  if (existing.rowCount === 0) {
    await admin.query("CREATE DATABASE soundcloud_test");
  }
  await admin.end();
  fs.writeFileSync(databaseUrlFile, testUrl);
}
