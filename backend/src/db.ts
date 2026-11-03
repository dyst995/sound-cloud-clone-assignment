import pg from "pg";
import { config } from "./config.js";

const databaseUrl = new URL(config.databaseUrl);

export const pool = new pg.Pool({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 5432),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.replace(/^\//, ""),
});

export function logPoolError(error: Error): void {
  console.error("Postgres connection error", error);
}

pool.on("error", logPoolError);
