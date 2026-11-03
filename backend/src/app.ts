import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errors, sendError } from "./errors.js";
import { errorHandler } from "./middleware/error.js";
import { optionalAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { commentsRouter } from "./routes/comments.js";
import { genresRouter } from "./routes/genres.js";
import { tracksRouter } from "./routes/tracks.js";
import { usersRouter } from "./routes/users.js";
import { mountSwagger } from "./openapi.js";
import "./types.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/uploads", express.static(config.uploadDir));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", optionalAuth);
  app.use("/api/auth", authRouter);
  app.use("/api/tracks", tracksRouter);
  app.use("/api", commentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/genres", genresRouter);
  mountSwagger(app);

  app.use("/api", (_req, res) => {
    sendError(res, errors.notFound);
  });

  app.use(errorHandler);
  return app;
}
