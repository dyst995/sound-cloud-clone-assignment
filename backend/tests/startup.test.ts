import fs from "fs";
import path from "path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "../src/config";
import { pool } from "../src/db";
import { launch as launchServer, startServer } from "../src/index";
import { launch as launchSetup, runCli, setupDatabase, waitForDatabase } from "../db/setup";
import { seed } from "../db/seed";

const originalPort = config.port;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  config.port = originalPort;
});

afterAll(async () => {
  await pool.end();
});

async function failQueries(error: unknown): Promise<void> {
  vi.useFakeTimers();
  vi.spyOn(pool, "query").mockRejectedValue(error);
  vi.spyOn(pool, "end").mockResolvedValue(undefined);
  vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new Error(`exit ${code ?? 0}`);
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
}

describe("startup", () => {
  beforeAll(async () => {
    fs.writeFileSync(path.join(config.uploadDir, "junk.txt"), "temp");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await setupDatabase();
    vi.restoreAllMocks();
    expect(fs.existsSync(path.join(config.uploadDir, "junk.txt"))).toBe(false);
    expect(fs.existsSync(path.join(config.uploadDir, ".gitkeep"))).toBe(true);
  });

  it("stops waiting when Postgres never answers", async () => {
    await failQueries(new Error("connection refused"));
    const pending = waitForDatabase();
    const assertion = expect(pending).rejects.toThrow("connection refused");
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("describes a non-error connection failure", async () => {
    await failQueries("down");
    const pending = waitForDatabase();
    const assertion = expect(pending).rejects.toThrow("unknown error");
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("exits the setup command when the database is down", async () => {
    await failQueries(new Error("connection refused"));
    const pending = runCli();
    const assertion = expect(pending).rejects.toThrow("exit 1");
    await vi.runAllTimersAsync();
    await assertion;

    await failQueries("down");
    const again = runCli();
    const againAssertion = expect(again).rejects.toThrow("exit 1");
    await vi.runAllTimersAsync();
    await againAssertion;
  });

  it("does not start automatically under the test runner", async () => {
    await expect(launchServer()).resolves.toBeUndefined();
    await expect(launchServer({ VITEST: "true" })).resolves.toBeUndefined();
    await expect(launchSetup()).resolves.toBeUndefined();
    await expect(launchSetup({ VITEST: "true" })).resolves.toBeUndefined();
  });

  it("rolls a failed seed back", async () => {
    await pool.query("DROP TABLE IF EXISTS comments, likes, tracks, users CASCADE");
    await expect(seed()).rejects.toThrow(/does not exist/);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await setupDatabase();
  });

  it("runs the setup command without closing the shared pool", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(pool, "end").mockResolvedValue(undefined);
    await launchSetup({});
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it("listens when the database is ready", async () => {
    config.port = 0;
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const server = await launchServer({});
    await new Promise((resolve) => setImmediate(resolve));
    expect(server?.listening).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("API listening"));
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("exits setup when a later step fails without an Error", async () => {
    vi.spyOn(pool, "query").mockImplementation(async (sql: unknown) => {
      if (sql === "SELECT 1") {
        return { rows: [], rowCount: 1 } as never;
      }
      throw "down";
    });
    vi.spyOn(pool, "end").mockResolvedValue(undefined);
    vi.spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runCli()).rejects.toThrow("exit 1");
    expect(errorLog).toHaveBeenCalledWith("unknown error");
  });

  it("exits when Postgres or the tables are missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    });

    vi.spyOn(pool, "query").mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(startServer()).rejects.toThrow("exit 1");

    vi.spyOn(pool, "query").mockRejectedValueOnce("nope");
    await expect(startServer()).rejects.toThrow("exit 1");

    vi.spyOn(pool, "query")
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockRejectedValueOnce(new Error("no users table"));
    await expect(startServer()).rejects.toThrow("exit 1");
  });
});
