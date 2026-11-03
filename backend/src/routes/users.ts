import { Router } from "express";
import { listTracksByUser } from "../data/tracks.js";
import { findUserByUsername, toPublicUser } from "../data/users.js";
import { errors } from "../errors.js";
import { asyncHandler, HttpError } from "../http.js";

export const usersRouter = Router();

usersRouter.get(
  "/:username",
  asyncHandler(async (req, res) => {
    const username = req.params.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{1,20}$/.test(username)) {
      throw new HttpError(errors.userNotFound);
    }
    const user = await findUserByUsername(username);
    if (!user) {
      throw new HttpError(errors.userNotFound);
    }
    const tracks = await listTracksByUser(user.id, req.userId ?? null);
    res.json({ user: toPublicUser(user), tracks });
  }),
);
