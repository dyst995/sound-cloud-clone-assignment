import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserByEmail, findUserById, insertUser, toAuthUser } from "../data/users.js";
import { errors } from "../errors.js";
import { asyncHandler, HttpError, isUniqueViolation, parse } from "../http.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  username: z
    .string({ required_error: errors.usernameRequired.message })
    .trim()
    .min(3, errors.usernameTooShort.message)
    .max(20, errors.usernameTooLong.message)
    .regex(/^[a-zA-Z0-9_]+$/, errors.usernameCharset.message)
    .transform((value) => value.toLowerCase()),
  email: z
    .string({ required_error: errors.emailRequired.message })
    .trim()
    .email(errors.emailInvalid.message)
    .max(254, errors.emailTooLong.message)
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ required_error: errors.passwordRequired.message })
    .min(8, errors.passwordTooShort.message)
    .max(72, errors.passwordTooLong.message),
  displayName: z
    .string({ required_error: errors.displayNameRequired.message })
    .trim()
    .min(1, errors.displayNameRequired.message)
    .max(40, errors.displayNameTooLong.message),
  bio: z.string().trim().max(280, errors.bioTooLong.message).optional(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: errors.emailRequired.message })
    .trim()
    .email(errors.emailInvalid.message)
    .transform((value) => value.toLowerCase()),
  password: z.string({ required_error: errors.passwordRequired.message }).min(1, errors.passwordRequired.message),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = parse(registerSchema, req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    try {
      const user = await insertUser({
        username: body.username,
        email: body.email,
        passwordHash,
        displayName: body.displayName,
        bio: body.bio ?? "",
      });
      res.status(201).json({ token: signToken(user.id), user: toAuthUser(user) });
    } catch (error) {
      if (isUniqueViolation(error, "email")) {
        throw new HttpError(errors.emailRegistered);
      }
      if (isUniqueViolation(error, "username")) {
        throw new HttpError(errors.usernameTaken);
      }
      throw error;
    }
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = parse(loginSchema, req.body);
    const user = await findUserByEmail(body.email);
    const matches = user ? await bcrypt.compare(body.password, user.password_hash) : false;
    if (!user || !matches) {
      throw new HttpError(errors.wrongPassword);
    }
    res.json({ token: signToken(user.id), user: toAuthUser(user) });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.userId!);
    if (!user) {
      throw new HttpError(errors.loginRequired);
    }
    res.json({ user: toAuthUser(user) });
  }),
);
