import fs from "fs";
import os from "os";
import path from "path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { afterAll, describe, expect, it, vi } from "vitest";
import { logPoolError, pool } from "../src/db";
import { errorHandler } from "../src/middleware/error";
import { errors } from "../src/errors";
import { HttpError, asyncHandler, isUniqueViolation, parse } from "../src/http";
import { iso, publicUploadUrl, removeUpload } from "../src/lib/files";
import { deleteComment } from "../src/data/comments";
import { readUploads } from "../src/routes/tracks";
import { writeToneWav } from "../db/wav";

describe("pure helpers", () => {
  it("parses valid and invalid values", () => {
    const schema = z.object({ name: z.string() });
    expect(parse(schema, { name: "Nova" })).toEqual({ name: "Nova" });
    expect(() => parse(schema, {})).toThrow(HttpError);

    const emptyIssues = {
      safeParse: () => ({ success: false, error: { issues: [] } }),
    };
    expect(() => parse(emptyIssues as never, {})).toThrow(/Invalid request/);
  });

  it("detects unique violations", () => {
    expect(isUniqueViolation(null, "email")).toBe(false);
    expect(isUniqueViolation("nope", "email")).toBe(false);
    expect(isUniqueViolation({ code: "23505" }, "email")).toBe(false);
    expect(isUniqueViolation({ code: "22P02", detail: "Key (email)" }, "email")).toBe(false);
    expect(isUniqueViolation({ code: "23505", detail: "Key (username)=(a) already exists." }, "email")).toBe(false);
    expect(isUniqueViolation({ code: "23505", detail: "Key (email)=(a) already exists." }, "email")).toBe(true);
  });

  it("forwards async handler success and failure", async () => {
    const response = { statusCode: 0, status(code: number) { this.statusCode = code; return this; } };
    const ok = asyncHandler(async (_req, res) => {
      res.status(204);
    });
    ok({} as Request, response as unknown as Response, (() => undefined) as NextFunction);
    await new Promise((resolve) => setImmediate(resolve));
    expect(response.statusCode).toBe(204);

    const next = vi.fn();
    const fail = asyncHandler(async () => {
      throw new Error("boom");
    });
    fail({} as Request, {} as Response, next);
    await new Promise((resolve) => setImmediate(resolve));
    expect(next).toHaveBeenCalledOnce();
    expect((next.mock.calls[0]?.[0] as Error).message).toBe("boom");
  });

  it("formats upload URLs and timestamps", () => {
    expect(publicUploadUrl(null)).toBeNull();
    expect(publicUploadUrl("song.wav")).toMatch(/\/uploads\/song\.wav$/);
    expect(iso(new Date("2020-01-02T03:04:05.000Z"))).toBe("2020-01-02T03:04:05.000Z");
    expect(iso("2020-01-02T03:04:05.000Z")).toBe("2020-01-02T03:04:05.000Z");
  });

  it("removes only the base file name", () => {
    removeUpload(null);
    const kept = path.join(os.tmpdir(), `keep-${Date.now()}.txt`);
    fs.writeFileSync(kept, "safe");
    removeUpload(path.join("nested", path.basename(kept)));
    expect(fs.existsSync(kept)).toBe(true);
    fs.rmSync(kept, { force: true });

    const target = path.join(process.cwd(), "uploads", "gone.txt");
    fs.writeFileSync(target, "temp");
    removeUpload("nested/gone.txt");
    expect(fs.existsSync(target)).toBe(false);
    removeUpload("missing.txt");
  });

  it("writes sine and square tones", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tones-"));
    const sine = path.join(directory, "sine.wav");
    const square = path.join(directory, "square.wav");
    expect(writeToneWav(sine, { frequency: 440, seconds: 1 })).toBe(1);
    expect(writeToneWav(square, { frequency: 220, seconds: 1, wave: "square" })).toBe(1);
    expect(fs.readFileSync(sine).subarray(0, 4).toString()).toBe("RIFF");
    expect(fs.readFileSync(square).subarray(0, 4).toString()).toBe("RIFF");
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("reads multipart files from the request", () => {
    const audio = { filename: "a.wav" } as Express.Multer.File;
    const cover = { filename: "c.png" } as Express.Multer.File;
    expect(readUploads({} as Express.Request)).toEqual({ audio: undefined, cover: undefined });
    expect(readUploads({ files: {} } as Express.Request)).toEqual({ audio: undefined, cover: undefined });
    expect(readUploads({ files: { audio: [audio] } } as Express.Request).audio).toBe(audio);
    expect(readUploads({ files: { audio: [audio], cover: [cover] } } as Express.Request).cover).toBe(cover);
  });

  it("logs idle database errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logPoolError(new Error("idle"));
    expect(spy).toHaveBeenCalledWith("Postgres connection error", expect.any(Error));
    spy.mockRestore();
  });

  it("treats a null comment delete count as not deleted", async () => {
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({ rows: [], rowCount: null } as never);
    await expect(deleteComment("00000000-0000-4000-8000-000000000001")).resolves.toBe(false);
    spy.mockRestore();
  });
});

describe("error handler", () => {
  function response() {
    return {
      statusCode: 0,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };
  }

  it("maps known failures and hides unexpected ones", () => {
    const http = response();
    errorHandler(new HttpError(errors.emailRegistered), {} as Request, http as never, (() => undefined) as NextFunction);
    expect(http.statusCode).toBe(errors.emailRegistered.status);
    expect(http.body).toEqual({ error: errors.emailRegistered.message });

    const parsed = response();
    errorHandler({ type: "entity.parse.failed" }, {} as Request, parsed as never, (() => undefined) as NextFunction);
    expect(parsed.body).toEqual({ error: "Request body must be JSON" });

    const otherType = response();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    errorHandler({ type: "other" }, {} as Request, otherType as never, (() => undefined) as NextFunction);
    expect(otherType.statusCode).toBe(500);

    const tooBig = response();
    errorHandler(new multer.MulterError("LIMIT_FILE_SIZE"), {} as Request, tooBig as never, (() => undefined) as NextFunction);
    expect(tooBig.body).toEqual({ error: "File is larger than 15 MB" });

    const unexpected = response();
    errorHandler(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), {} as Request, unexpected as never, (() => undefined) as NextFunction);
    expect(unexpected.body).toEqual({ error: "Could not read the uploaded file" });

    const missing = response();
    errorHandler(null, {} as Request, missing as never, (() => undefined) as NextFunction);
    expect(missing.statusCode).toBe(500);

    const text = response();
    errorHandler("down", {} as Request, text as never, (() => undefined) as NextFunction);
    expect(text.body).toEqual({ error: "Something went wrong" });
    spy.mockRestore();
  });
});

afterAll(async () => {
  await pool.end();
});
