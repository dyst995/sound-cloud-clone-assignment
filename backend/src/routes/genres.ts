import { Router } from "express";
import { listGenres } from "../data/tracks.js";
import { asyncHandler } from "../http.js";

export const genresRouter = Router();

genresRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ genres: await listGenres() });
  }),
);
