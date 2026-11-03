import type { Response } from "express";

export type ApiError = {
  status: number;
  message: string;
};

export const errors = {
  notFound: { status: 404, message: "Not found" },
  trackNotFound: { status: 404, message: "Track not found" },
  commentNotFound: { status: 404, message: "Comment not found" },
  userNotFound: { status: 404, message: "User not found" },
  audioRequired: { status: 400, message: "Choose an audio file" },
  audioType: {
    status: 400,
    message: "Audio must be an mp3, wav, ogg, m4a, aac, flac, or webm file",
  },
  coverType: { status: 400, message: "Cover must be a jpg, png, webp, or gif" },
  deleteOwnTrack: { status: 403, message: "You can only delete your own track" },
  deleteOwnComment: { status: 403, message: "You can only delete your own comment" },
  emailRegistered: { status: 409, message: "Email is already registered" },
  usernameTaken: { status: 409, message: "Username is already taken" },
  wrongPassword: { status: 401, message: "Email or password is wrong" },
  loginRequired: { status: 401, message: "Login required" },
  invalidToken: { status: 401, message: "Invalid or expired token" },
  invalidJson: { status: 400, message: "Request body must be JSON" },
  fileTooLarge: { status: 400, message: "File is larger than 15 MB" },
  uploadUnreadable: { status: 400, message: "Could not read the uploaded file" },
  unexpected: { status: 500, message: "Something went wrong" },
  invalidRequest: { status: 400, message: "Invalid request" },
  invalidId: { status: 400, message: "Invalid id" },
  usernameRequired: { status: 400, message: "Username is required" },
  usernameTooShort: { status: 400, message: "Username must be at least 3 characters" },
  usernameTooLong: { status: 400, message: "Username must be at most 20 characters" },
  usernameCharset: { status: 400, message: "Username can only use letters, numbers, and underscores" },
  emailRequired: { status: 400, message: "Email is required" },
  emailInvalid: { status: 400, message: "Enter a valid email" },
  emailTooLong: { status: 400, message: "Email is too long" },
  passwordRequired: { status: 400, message: "Password is required" },
  passwordTooShort: { status: 400, message: "Password must be at least 8 characters" },
  passwordTooLong: { status: 400, message: "Password must be at most 72 characters" },
  displayNameRequired: { status: 400, message: "Display name is required" },
  displayNameTooLong: { status: 400, message: "Display name must be at most 40 characters" },
  bioTooLong: { status: 400, message: "Bio must be at most 280 characters" },
  commentEmpty: { status: 400, message: "Comment cannot be empty" },
  commentTooLong: { status: 400, message: "Comment must be at most 500 characters" },
  searchTooLong: { status: 400, message: "Search text must be at most 100 characters" },
  genreTooLong: { status: 400, message: "Genre must be at most 40 characters" },
  genreRequired: { status: 400, message: "Genre is required" },
  limitTooSmall: { status: 400, message: "limit must be at least 1" },
  limitTooLarge: { status: 400, message: "limit must be at most 50" },
  offsetNegative: { status: 400, message: "offset cannot be negative" },
  titleRequired: { status: 400, message: "Title is required" },
  titleTooLong: { status: 400, message: "Title must be at most 120 characters" },
  descriptionTooLong: { status: 400, message: "Description must be at most 1000 characters" },
} as const satisfies Record<string, ApiError>;

export function sendError(res: Response, error: ApiError): void {
  res.status(error.status).json({ error: error.message });
}
