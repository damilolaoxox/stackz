import type {
  ApiError,
  AvatarResponse,
  JoinRequest,
  JoinResponse,
  ProgressResponse,
  Task,
  TaskResponse,
} from "@stackz/shared";
import { API_URL } from "./config";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.error);
    this.status = status;
    this.body = body;
  }

  get code() {
    return this.body.error;
  }
}

async function request<T>(path: string, init?: { method: "POST"; body: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: init ? { "Content-Type": "application/json" } : {},
      body: init ? JSON.stringify(init.body) : null,
    });
  } catch {
    throw new ApiRequestError(0, { error: "internal" });
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body =
      data && typeof data === "object" && "error" in data ? (data as ApiError) : { error: "internal" as const };
    throw new ApiRequestError(res.status, body);
  }
  return data as T;
}

export const api = {
  avatar: (handle: string) => request<AvatarResponse>(`/x/avatar?handle=${encodeURIComponent(handle)}`),
  progress: (handle: string) => request<ProgressResponse>(`/tasks/${encodeURIComponent(handle)}`),
  go: (handle: string, task: Task) => request<TaskResponse>("/tasks/go", { method: "POST", body: { handle, task } }),
  confirm: (handle: string, task: Task) =>
    request<TaskResponse>("/tasks/confirm", { method: "POST", body: { handle, task } }),
  join: (body: JoinRequest) => request<JoinResponse>("/waitlist", { method: "POST", body }),
};
