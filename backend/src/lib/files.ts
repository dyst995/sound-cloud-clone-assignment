import fs from "fs";
import path from "path";
import { config } from "../config.js";

export function publicUploadUrl(filename: string | null): string | null {
  if (!filename) {
    return null;
  }
  return `${config.publicBaseUrl}/uploads/${filename}`;
}

export function removeUpload(filename: string | null): void {
  if (!filename) {
    return;
  }
  fs.rmSync(path.join(config.uploadDir, path.basename(filename)), { force: true });
}

export function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
