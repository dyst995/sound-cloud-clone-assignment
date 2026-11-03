import fs from "fs";
import os from "os";
import path from "path";

const databaseUrl = fs.readFileSync(path.join(os.tmpdir(), "soundcloud-clone-test-db-url"), "utf8").trim();

process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET ??= "test-secret";
process.env.PUBLIC_BASE_URL ??= "http://localhost:3000";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
process.env.PORT ??= "3000";
