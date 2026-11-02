import { Hono } from "hono";
import {
  handleSchema,
  taskRequestSchema,
  TASKS,
  type ApiError,
  type ProgressResponse,
  type Task,
  type TaskResponse,
  type TaskStatus,
} from "@stackz/shared";
import type { AppEnv, Deps } from "../deps";
import { makeLimiter, rateLimit } from "../rate-limit";
import type { TaskRow } from "../store";

type TasksEnv = { Variables: AppEnv["Variables"] & { taskRequest: { handle: string; task: Task } } };

export function toStatus(task: Task, row: TaskRow | undefined): TaskStatus {
  if (!row?.go_at) return { task, state: "idle", goAt: null, doneAt: null };
  return { task, state: row.done_at ? "done" : "charging", goAt: row.go_at, doneAt: row.done_at };
}

/** Seconds left before CONFIRM may count; 0 means it can count now. */
export function secondsRemaining(goAt: string, now: Date, minSeconds: number): number {
  const elapsedMs = now.getTime() - new Date(goAt).getTime();
  return Math.max(0, Math.ceil(minSeconds - elapsedMs / 1000));
}

export function tasksRoutes(deps: Deps) {
  const { store, env, now } = deps;
  const perHandle = makeLimiter(deps.limiter, "tasks", 30, 60_000);
  const app = new Hono<TasksEnv>();

  app.get("/:handle", async (c) => {
    const handle = handleSchema.safeParse(c.req.param("handle"));
    if (!handle.success) return c.json<ApiError>({ error: "invalid_request" }, 400);
    const [rows, entry] = await Promise.all([store.getTaskRows(handle.data), store.getEntry(handle.data)]);
    const tasks = Object.fromEntries(
      TASKS.map((t) => [
        t,
        toStatus(
          t,
          rows.find((r) => r.task === t),
        ),
      ]),
    ) as Record<Task, TaskStatus>;
    return c.json<ProgressResponse>({
      handle: handle.data,
      tasks,
      joined: entry !== null,
      status: entry?.status ?? null,
      taskMinSeconds: env.TASK_MIN_SECONDS,
    });
  });

  // POST bodies are parsed once, then shared with the per-handle limiter.
  app.use("*", async (c, next) => {
    if (c.req.method !== "POST") return next();
    const parsed = taskRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json<ApiError>({ error: "invalid_request" }, 400);
    c.set("taskRequest", parsed.data);
    return rateLimit(perHandle, () => parsed.data.handle)(c, next);
  });

  app.post("/go", async (c) => {
    const { handle, task } = c.get("taskRequest");
    const row = await store.startTask(handle, task, now());
    return c.json<TaskResponse>(toStatus(task, row));
  });

  app.post("/confirm", async (c) => {
    const { handle, task } = c.get("taskRequest");
    const row = (await store.getTaskRows(handle)).find((r) => r.task === task);
    if (!row?.go_at) return c.json<ApiError>({ error: "not_started" }, 409);
    if (row.done_at) return c.json<TaskResponse>(toStatus(task, row));

    const t = now();
    const wait = secondsRemaining(row.go_at, t, env.TASK_MIN_SECONDS);
    if (wait > 0) return c.json<ApiError>({ error: "too_early", retryAfterSeconds: wait }, 409);

    const done = await store.completeTask(handle, task, t);
    return c.json<TaskResponse>(toStatus(task, done));
  });

  return app;
}
