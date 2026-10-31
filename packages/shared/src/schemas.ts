import { z } from "zod";

export const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
export const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

/** X handle: accepts an optional leading "@", stored lowercased without it. */
export const handleSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/^@/, ""))
  .pipe(z.string().regex(HANDLE_RE, "invalid_handle"))
  .transform((s) => s.toLowerCase());

/** EVM public address, stored lowercased. */
export const walletSchema = z
  .string()
  .trim()
  .regex(WALLET_RE, "invalid_wallet")
  .transform((s) => s.toLowerCase());

export const TASKS = ["follow", "like", "comment", "repost"] as const;
export const taskSchema = z.enum(TASKS);
export type Task = z.infer<typeof taskSchema>;

export const taskRequestSchema = z.object({
  handle: handleSchema,
  task: taskSchema,
});
export type TaskRequest = z.input<typeof taskRequestSchema>;

export const joinRequestSchema = z.object({
  handle: handleSchema,
  wallet: walletSchema,
  turnstileToken: z.string().min(1).max(2048),
});
export type JoinRequest = z.input<typeof joinRequestSchema>;
