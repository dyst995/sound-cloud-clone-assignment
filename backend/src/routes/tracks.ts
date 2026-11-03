import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  deleteTrack,
  findTrackOwner,
  getTrack,
  incrementPlayCount,
  insertTrack,
  likeTrack,
  listTracks,
  unlikeTrack,
} from "../data/tracks.js";
import { config } from "../config.js";
import { errors } from "../errors.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { removeUpload } from "../lib/files.js";
import { requireAuth } from "../middleware/auth.js";

const audioExtensions = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm", ".flac"]);
const coverExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdirSync(config.uploadDir, { recursive: true });
      callback(null, config.uploadDir);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes, files: 2 },
});

const listQuerySchema = z.object({
  q: z.string().trim().max(100, errors.searchTooLong.message).optional().default(""),
  genre: z.string().trim().max(40, errors.genreTooLong.message).optional().default(""),
  limit: z.preprocess(
    (value) => (value === undefined || value === "" ? 20 : value),
    z.coerce.number().int().min(1, errors.limitTooSmall.message).max(50, errors.limitTooLarge.message),
  ),
  offset: z.preprocess(
    (value) => (value === undefined || value === "" ? 0 : value),
    z.coerce.number().int().min(0, errors.offsetNegative.message),
  ),
});

const idSchema = z.string().uuid(errors.invalidId.message);

const trackBodySchema = z.object({
  title: z
    .string({ required_error: errors.titleRequired.message, invalid_type_error: errors.titleRequired.message })
    .trim()
    .min(1, errors.titleRequired.message)
    .max(120, errors.titleTooLong.message),
  description: z.string().trim().max(1000, errors.descriptionTooLong.message).optional().default(""),
  genre: z
    .string({ required_error: errors.genreRequired.message, invalid_type_error: errors.genreRequired.message })
    .trim()
    .min(1, errors.genreRequired.message)
    .max(40, errors.genreTooLong.message)
    .transform((value) => value.toLowerCase()),
});

export function readUploads(req: Express.Request): { audio?: Express.Multer.File; cover?: Express.Multer.File } {
  const files = req.files as { audio?: Express.Multer.File[]; cover?: Express.Multer.File[] } | undefined;
  return { audio: files?.audio?.[0], cover: files?.cover?.[0] };
}

function wavDurationSeconds(filePath: string): number {
  const header = Buffer.alloc(44);
  const fd = fs.openSync(filePath, "r");
  let seconds = 0;
  try {
    const bytesRead = fs.readSync(fd, header, 0, 44, 0);
    if (bytesRead < 44 || header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE") {
      seconds = 0;
    } else {
      const channels = header.readUInt16LE(22);
      const sampleRate = header.readUInt32LE(24);
      const bitsPerSample = header.readUInt16LE(34);
      const dataSize = header.readUInt32LE(40);
      if (!channels || !sampleRate || !bitsPerSample || dataSize <= 0) {
        seconds = 0;
      } else {
        seconds = Math.round(dataSize / (sampleRate * channels * (bitsPerSample / 8)));
      }
    }
  } catch {
    seconds = 0;
  } finally {
    fs.closeSync(fd);
  }
  return seconds;
}

async function requireExistingTrack(id: string, viewerId: string | null) {
  const parsedId = parse(idSchema, id);
  const track = await getTrack(parsedId, viewerId);
  if (!track) {
    throw new HttpError(errors.trackNotFound);
  }
  return track;
}

export const tracksRouter = Router();

tracksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parse(listQuerySchema, req.query);
    const result = await listTracks({
      viewerId: req.userId ?? null,
      q: query.q.toLowerCase(),
      genre: query.genre.toLowerCase(),
      limit: query.limit,
      offset: query.offset,
    });
    res.json(result);
  }),
);

tracksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ track: await requireExistingTrack(req.params.id, req.userId ?? null) });
  }),
);

tracksRouter.post(
  "/:id/play",
  asyncHandler(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const updated = await incrementPlayCount(id);
    if (!updated) {
      throw new HttpError(errors.trackNotFound);
    }
    const track = await getTrack(id, req.userId ?? null);
    if (!track) {
      throw new HttpError(errors.trackNotFound);
    }
    res.json({ track });
  }),
);

tracksRouter.post(
  "/",
  requireAuth,
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const { audio, cover } = readUploads(req);
    try {
      if (!audio) {
        throw new HttpError(errors.audioRequired);
      }
      const audioExtension = path.extname(audio.originalname).toLowerCase();
      if (!audioExtensions.has(audioExtension)) {
        throw new HttpError(errors.audioType);
      }
      if (cover) {
        const coverExtension = path.extname(cover.originalname).toLowerCase();
        if (!coverExtensions.has(coverExtension)) {
          throw new HttpError(errors.coverType);
        }
      }

      const body = parse(trackBodySchema, req.body);
      const durationSeconds = audioExtension === ".wav" ? wavDurationSeconds(audio.path) : 0;
      const track = await insertTrack({
        userId: req.userId!,
        title: body.title,
        description: body.description,
        genre: body.genre,
        audioPath: audio.filename,
        coverPath: cover?.filename ?? null,
        durationSeconds,
        viewerId: req.userId!,
      });
      res.status(201).json({ track });
      return;
    } catch (error) {
      removeUpload(audio?.filename ?? null);
      removeUpload(cover?.filename ?? null);
      throw error;
    }
  }),
);

tracksRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const owner = await findTrackOwner(id);
    if (!owner) {
      throw new HttpError(errors.trackNotFound);
    }
    if (owner.user_id !== req.userId) {
      throw new HttpError(errors.deleteOwnTrack);
    }
    const removed = await deleteTrack(id);
    removeUpload(removed?.audio_path ?? null);
    removeUpload(removed?.cover_path ?? null);
    res.json({ ok: true });
  }),
);

tracksRouter.post(
  "/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const track = await requireExistingTrack(req.params.id, req.userId!);
    await likeTrack(req.userId!, track.id);
    const updated = await getTrack(track.id, req.userId!);
    if (!updated) {
      throw new HttpError(errors.trackNotFound);
    }
    res.json({ track: updated });
  }),
);

tracksRouter.delete(
  "/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const track = await requireExistingTrack(req.params.id, req.userId!);
    await unlikeTrack(req.userId!, track.id);
    const updated = await getTrack(track.id, req.userId!);
    if (!updated) {
      throw new HttpError(errors.trackNotFound);
    }
    res.json({ track: updated });
  }),
);
