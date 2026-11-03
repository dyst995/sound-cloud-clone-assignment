import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. From the backend folder, run: cp .env.example .env`);
    process.exit(1);
  }
  return value;
}

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port <= 0) {
  console.error("PORT must be a positive whole number");
  process.exit(1);
}

export const config = {
  port,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, ""),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  uploadDir: `${process.cwd()}/uploads`,
  maxUploadBytes: 15 * 1024 * 1024,
};
