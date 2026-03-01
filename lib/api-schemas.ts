import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const wordInputSchema = z
  .object({
    answer: z.string().trim().min(1).max(64),
    clue: z.string().trim().min(1).max(280),
  })
  .strict();

export const generateBodySchema = z
  .object({
    title: z.string().trim().max(120).optional().or(z.literal("")),
    words: z.array(wordInputSchema).min(1).max(100),
  })
  .strict();

export const previewBodySchema = z
  .object({
    words: z.array(wordInputSchema).min(1).max(100),
  })
  .strict();

export const shareCrosswordBodySchema = z
  .object({
    crossword_id: uuidSchema,
    shared_with_user_id: uuidSchema,
  })
  .strict();

export const createFriendRequestBodySchema = z
  .object({
    to_user_id: uuidSchema,
  })
  .strict();

export const updateFriendRequestBodySchema = z
  .object({
    status: z.enum(["accepted", "rejected"]),
  })
  .strict();

export const profileBodySchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[A-Za-z0-9._ -]+$/),
  })
  .strict();

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(64),
});
