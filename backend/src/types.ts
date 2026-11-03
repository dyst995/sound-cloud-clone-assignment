export type Artist = {
  id: string;
  username: string;
  displayName: string;
};

export type Track = {
  id: string;
  title: string;
  description: string;
  genre: string;
  audioUrl: string;
  coverUrl: string | null;
  durationSeconds: number;
  playCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  artist: Artist;
};

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  createdAt: string;
};

export type AuthUser = PublicUser & {
  email: string;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: Artist;
};

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}
