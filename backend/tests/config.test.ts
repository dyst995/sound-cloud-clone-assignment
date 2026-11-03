import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => {
  const config = () => ({});
  return { default: { config }, config };
});

const envKeys = ["PORT", "DATABASE_URL", "JWT_SECRET", "PUBLIC_BASE_URL", "CORS_ORIGIN"] as const;
const saved = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of envKeys) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
  vi.resetModules();
});

async function loadConfig(env: Record<string, string | undefined>): Promise<typeof import("../src/config")> {
  vi.resetModules();
  for (const key of envKeys) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
  return import("../src/config");
}

function exitOnCall(): void {
  vi.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new Error(`exit ${code ?? 0}`);
  });
}

describe("config", () => {
  it("rejects a missing database URL, a missing secret, and a bad port", async () => {
    exitOnCall();
    await expect(loadConfig({ JWT_SECRET: "secret" })).rejects.toThrow("exit 1");

    exitOnCall();
    await expect(loadConfig({ DATABASE_URL: "postgres://localhost/soundcloud_test" })).rejects.toThrow("exit 1");

    for (const port of ["0", "-2", "1.5", "nope"]) {
      exitOnCall();
      await expect(
        loadConfig({
          PORT: port,
          DATABASE_URL: "postgres://localhost/soundcloud_test",
          JWT_SECRET: "secret",
        }),
      ).rejects.toThrow("exit 1");
    }
  });

  it("fills defaults and strips a trailing slash", async () => {
    const withDefaults = await loadConfig({
      DATABASE_URL: "postgres://soundcloud:soundcloud@127.0.0.1/soundcloud_test",
      JWT_SECRET: "secret",
    });
    expect(withDefaults.config.port).toBe(3000);
    expect(withDefaults.config.publicBaseUrl).toBe("http://localhost:3000");
    expect(withDefaults.config.corsOrigin).toBe("http://localhost:5173");

    const explicit = await loadConfig({
      PORT: "3000",
      DATABASE_URL: "postgres://soundcloud:soundcloud@127.0.0.1:5434/soundcloud_test",
      JWT_SECRET: "secret",
      PUBLIC_BASE_URL: "http://localhost:3000/",
      CORS_ORIGIN: "http://localhost:5173",
    });
    expect(explicit.config.publicBaseUrl).toBe("http://localhost:3000");
    expect(explicit.config.corsOrigin).toBe("http://localhost:5173");
  });

  it("uses port 5432 when the database URL omits it", async () => {
    await loadConfig({
      DATABASE_URL: "postgres://soundcloud:soundcloud@127.0.0.1/soundcloud_test",
      JWT_SECRET: "secret",
    });
    const withoutPort = await import("../src/db");
    expect(withoutPort.pool.options.port).toBe(5432);
    await withoutPort.pool.end();

    vi.resetModules();
    process.env.DATABASE_URL = "postgres://soundcloud:soundcloud@127.0.0.1:5434/soundcloud_test";
    const withPort = await import("../src/db");
    expect(withPort.pool.options.port).toBe(5434);
    await withPort.pool.end();
  });
});
