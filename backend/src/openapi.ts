import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "./config.js";

function errorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
      },
    },
  };
}

function jsonResponse(description: string, schema: object) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

const bearer = [{ bearerAuth: [] }];
const bearerOptional = [{}, { bearerAuth: [] }];

export function openApiDocument(baseUrl: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "SoundCloud clone API",
      version: "1.0.0",
      description:
        "Learning API. Demo password for every sample account is password123. Tokens last 7 days. Send Authorization: Bearer <token> when you are logged in, and omit that header when you are logged out.",
    },
    servers: [{ url: baseUrl }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Tracks" },
      { name: "Comments" },
      { name: "Users" },
      { name: "Genres" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string", example: "Track not found" } },
        },
        Ok: {
          type: "object",
          required: ["ok"],
          properties: { ok: { type: "boolean", example: true } },
        },
        Artist: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string", example: "nova" },
            displayName: { type: "string", example: "Nova Lane" },
          },
        },
        Track: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "Morning Drift" },
            description: { type: "string" },
            genre: { type: "string", example: "electronic" },
            audioUrl: { type: "string" },
            coverUrl: { type: "string", nullable: true },
            durationSeconds: { type: "integer" },
            playCount: { type: "integer" },
            likeCount: { type: "integer" },
            likedByMe: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            artist: { $ref: "#/components/schemas/Artist" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            body: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            author: { $ref: "#/components/schemas/Artist" },
          },
        },
        AuthUser: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            email: { type: "string", format: "email" },
            displayName: { type: "string" },
            bio: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PublicUser: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            displayName: { type: "string" },
            bio: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "Check that the API is running",
          responses: {
            "200": jsonResponse("API is up", { $ref: "#/components/schemas/Ok" }),
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Create an account",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["username", "email", "password", "displayName"],
                  properties: {
                    username: { type: "string", minLength: 3, maxLength: 20, example: "sam_ok" },
                    email: { type: "string", format: "email", example: "sam@example.com" },
                    password: { type: "string", minLength: 8, maxLength: 72, example: "password123" },
                    displayName: { type: "string", minLength: 1, maxLength: 40, example: "Sam Okonkwo" },
                    bio: { type: "string", maxLength: 280 },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonResponse("Account created", {
              type: "object",
              properties: {
                token: { type: "string" },
                user: { $ref: "#/components/schemas/AuthUser" },
              },
            }),
            "400": errorResponse("Invalid registration fields"),
            "409": errorResponse("Email is already registered, or username is already taken"),
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Log in",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "nova@example.com" },
                    password: { type: "string", example: "password123" },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonResponse("Logged in", {
              type: "object",
              properties: {
                token: { type: "string" },
                user: { $ref: "#/components/schemas/AuthUser" },
              },
            }),
            "400": errorResponse("Invalid login fields"),
            "401": errorResponse("Email or password is wrong"),
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current user",
          security: bearer,
          responses: {
            "200": jsonResponse("The logged-in user", {
              type: "object",
              properties: { user: { $ref: "#/components/schemas/AuthUser" } },
            }),
            "401": errorResponse("Login required, or the token is invalid or expired"),
          },
        },
      },
      "/api/tracks": {
        get: {
          tags: ["Tracks"],
          summary: "List tracks, newest first",
          security: bearerOptional,
          parameters: [
            { name: "q", in: "query", schema: { type: "string", maxLength: 100 }, description: "Match title, display name, or username" },
            { name: "genre", in: "query", schema: { type: "string", maxLength: 40 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
          ],
          responses: {
            "200": jsonResponse("A page of tracks", {
              type: "object",
              properties: {
                tracks: { type: "array", items: { $ref: "#/components/schemas/Track" } },
                total: { type: "integer" },
                limit: { type: "integer" },
                offset: { type: "integer" },
              },
            }),
            "400": errorResponse("Invalid query"),
          },
        },
        post: {
          tags: ["Tracks"],
          summary: "Upload a track",
          security: bearer,
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["audio", "title", "genre"],
                  properties: {
                    audio: { type: "string", format: "binary", description: "mp3, wav, ogg, m4a, aac, flac, or webm. Max 15 MB." },
                    cover: { type: "string", format: "binary", description: "Optional jpg, png, webp, or gif." },
                    title: { type: "string", maxLength: 120 },
                    description: { type: "string", maxLength: 1000 },
                    genre: { type: "string", maxLength: 40 },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonResponse("Track created", {
              type: "object",
              properties: { track: { $ref: "#/components/schemas/Track" } },
            }),
            "400": errorResponse("Missing or invalid file or fields"),
            "401": errorResponse("Login required"),
          },
        },
      },
      "/api/tracks/{id}": {
        get: {
          tags: ["Tracks"],
          summary: "One track",
          security: bearerOptional,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": jsonResponse("The track", {
              type: "object",
              properties: { track: { $ref: "#/components/schemas/Track" } },
            }),
            "400": errorResponse("Invalid id"),
            "404": errorResponse("Track not found"),
          },
        },
        delete: {
          tags: ["Tracks"],
          summary: "Delete your track",
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": jsonResponse("Deleted", { type: "object", properties: { ok: { type: "boolean", example: true } } }),
            "401": errorResponse("Login required"),
            "403": errorResponse("You can only delete your own track"),
            "404": errorResponse("Track not found"),
          },
        },
      },
      "/api/tracks/{id}/play": {
        post: {
          tags: ["Tracks"],
          summary: "Count one play",
          security: bearerOptional,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": jsonResponse("Track with playCount increased by 1", {
              type: "object",
              properties: { track: { $ref: "#/components/schemas/Track" } },
            }),
            "400": errorResponse("Invalid id"),
            "404": errorResponse("Track not found"),
          },
        },
      },
      "/api/tracks/{id}/like": {
        post: {
          tags: ["Tracks"],
          summary: "Like a track",
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": jsonResponse("Track after the like", {
              type: "object",
              properties: { track: { $ref: "#/components/schemas/Track" } },
            }),
            "401": errorResponse("Login required"),
            "404": errorResponse("Track not found"),
          },
        },
        delete: {
          tags: ["Tracks"],
          summary: "Remove your like",
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": jsonResponse("Track after the unlike", {
              type: "object",
              properties: { track: { $ref: "#/components/schemas/Track" } },
            }),
            "401": errorResponse("Login required"),
            "404": errorResponse("Track not found"),
          },
        },
      },
      "/api/tracks/{trackId}/comments": {
        get: {
          tags: ["Comments"],
          summary: "Comments on a track, oldest first",
          parameters: [{ name: "trackId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": jsonResponse("Comments", {
              type: "object",
              properties: { comments: { type: "array", items: { $ref: "#/components/schemas/Comment" } } },
            }),
            "400": errorResponse("Invalid id"),
            "404": errorResponse("Track not found"),
          },
        },
        post: {
          tags: ["Comments"],
          summary: "Add a comment",
          security: bearer,
          parameters: [{ name: "trackId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["body"],
                  properties: { body: { type: "string", minLength: 1, maxLength: 500 } },
                },
              },
            },
          },
          responses: {
            "201": jsonResponse("Comment created", {
              type: "object",
              properties: { comment: { $ref: "#/components/schemas/Comment" } },
            }),
            "400": errorResponse("Comment cannot be empty"),
            "401": errorResponse("Login required"),
            "404": errorResponse("Track not found"),
          },
        },
      },
      "/api/comments/{id}": {
        delete: {
          tags: ["Comments"],
          summary: "Delete your comment",
          security: bearer,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": jsonResponse("Deleted", { type: "object", properties: { ok: { type: "boolean", example: true } } }),
            "401": errorResponse("Login required"),
            "403": errorResponse("You can only delete your own comment"),
            "404": errorResponse("Comment not found"),
          },
        },
      },
      "/api/users/{username}": {
        get: {
          tags: ["Users"],
          summary: "Artist profile and their tracks",
          security: bearerOptional,
          parameters: [{ name: "username", in: "path", required: true, schema: { type: "string", example: "nova" } }],
          responses: {
            "200": jsonResponse("Public profile", {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/PublicUser" },
                tracks: { type: "array", items: { $ref: "#/components/schemas/Track" } },
              },
            }),
            "404": errorResponse("User not found"),
          },
        },
      },
      "/api/genres": {
        get: {
          tags: ["Genres"],
          summary: "Genres currently used by tracks",
          responses: {
            "200": jsonResponse("Sorted genre names", {
              type: "object",
              properties: { genres: { type: "array", items: { type: "string" } } },
            }),
          },
        },
      },
    },
  };
}

export function mountSwagger(app: Express): void {
  const document = openApiDocument(config.publicBaseUrl);
  app.get("/api/openapi.json", (_req, res) => {
    res.json(document);
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: "SoundCloud clone API", customCss: "" }),
  );
}
