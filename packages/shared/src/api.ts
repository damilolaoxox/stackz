import type { Task } from "./schemas";

export const TASK_MIN_SECONDS_DEFAULT = 8;

export type TaskState = "idle" | "charging" | "done";
export type WaitlistStatus = "pending" | "approved" | "rejected";

export interface TaskStatus {
  task: Task;
  state: TaskState;
  goAt: string | null;
  doneAt: string | null;
}

/** GET /tasks/:handle */
export interface ProgressResponse {
  handle: string;
  tasks: Record<Task, TaskStatus>;
  joined: boolean;
  status: WaitlistStatus | null;
  taskMinSeconds: number;
}

/** POST /tasks/go and POST /tasks/confirm */
export type TaskResponse = TaskStatus;

/** POST /waitlist. The spot number is never exposed publicly. */
export interface JoinResponse {
  handle: string;
  status: WaitlistStatus;
  cardUrl: string;
  shareUrl: string;
}

/** GET /x/avatar */
export interface AvatarResponse {
  url: string | null;
}

export type ApiErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "not_started"
  | "too_early"
  | "tasks_incomplete"
  | "turnstile_failed"
  | "handle_taken"
  | "wallet_taken"
  | "not_found"
  | "unauthorized"
  | "internal";

export interface ApiError {
  error: ApiErrorCode;
  /** too_early and rate_limited: seconds until the call can succeed. */
  retryAfterSeconds?: number;
  /** tasks_incomplete: tasks still missing. */
  missing?: Task[];
}
