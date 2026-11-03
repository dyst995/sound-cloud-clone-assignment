import { Router } from "express";
import { z } from "zod";
import { deleteComment, findCommentOwner, insertComment, listComments } from "../data/comments.js";
import { findTrackOwner } from "../data/tracks.js";
import { errors } from "../errors.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireAuth } from "../middleware/auth.js";

const idSchema = z.string().uuid(errors.invalidId.message);

const commentSchema = z.object({
  body: z
    .string({ required_error: errors.commentEmpty.message, invalid_type_error: errors.commentEmpty.message })
    .trim()
    .min(1, errors.commentEmpty.message)
    .max(500, errors.commentTooLong.message),
});

export const commentsRouter = Router();

commentsRouter.get(
  "/tracks/:trackId/comments",
  asyncHandler(async (req, res) => {
    const trackId = parse(idSchema, req.params.trackId);
    const track = await findTrackOwner(trackId);
    if (!track) {
      throw new HttpError(errors.trackNotFound);
    }
    res.json({ comments: await listComments(trackId) });
  }),
);

commentsRouter.post(
  "/tracks/:trackId/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const trackId = parse(idSchema, req.params.trackId);
    const track = await findTrackOwner(trackId);
    if (!track) {
      throw new HttpError(errors.trackNotFound);
    }
    const body = parse(commentSchema, req.body);
    const comment = await insertComment({ userId: req.userId!, trackId, body: body.body });
    res.status(201).json({ comment });
  }),
);

commentsRouter.delete(
  "/comments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const owner = await findCommentOwner(id);
    if (!owner) {
      throw new HttpError(errors.commentNotFound);
    }
    if (owner.user_id !== req.userId) {
      throw new HttpError(errors.deleteOwnComment);
    }
    await deleteComment(id);
    res.json({ ok: true });
  }),
);
