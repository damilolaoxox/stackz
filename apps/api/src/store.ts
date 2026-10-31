import type { Task, WaitlistStatus } from "@stackz/shared";

export interface TaskRow {
  task: Task;
  go_at: string | null;
  done_at: string | null;
}

export interface Entry {
  x_handle: string;
  x_avatar_url: string | null;
  wallet: string;
  status: WaitlistStatus;
  created_at: string;
}

export interface NewEntry {
  x_handle: string;
  x_avatar_url: string | null;
  wallet: string;
  tasks: Partial<Record<Task, { go_at: string | null; done_at: string | null }>>;
}

export type CreateResult = { ok: true; entry: Entry } | { ok: false; conflict: "handle" | "wallet" };

/** All persistence goes through this, so tests and local dev can swap Supabase out. */
export interface Store {
  getTaskRows(handle: string): Promise<TaskRow[]>;
  /** Records go_at if the task has no row yet; never resets an existing timer. */
  startTask(handle: string, task: Task, at: Date): Promise<TaskRow>;
  /** Sets done_at if it is not set yet. */
  completeTask(handle: string, task: Task, at: Date): Promise<TaskRow>;
  getEntry(handle: string): Promise<Entry | null>;
  createEntry(entry: NewEntry): Promise<CreateResult>;
}

export interface CardCache {
  get(handle: string): Promise<Uint8Array | null>;
  put(handle: string, png: Uint8Array): Promise<void>;
}

export function createMemoryStore(): Store {
  const tasks = new Map<string, TaskRow>();
  const entries = new Map<string, Entry>();
  const key = (handle: string, task: Task) => `${handle}:${task}`;

  return {
    async getTaskRows(handle) {
      return [...tasks.entries()].filter(([k]) => k.startsWith(`${handle}:`)).map(([, row]) => ({ ...row }));
    },
    async startTask(handle, task, at) {
      const k = key(handle, task);
      if (!tasks.has(k)) tasks.set(k, { task, go_at: at.toISOString(), done_at: null });
      return { ...tasks.get(k)! };
    },
    async completeTask(handle, task, at) {
      const row = tasks.get(key(handle, task));
      if (!row) throw new Error("task not started");
      row.done_at ??= at.toISOString();
      return { ...row };
    },
    async getEntry(handle) {
      const e = entries.get(handle);
      return e ? { ...e } : null;
    },
    async createEntry(input) {
      if (entries.has(input.x_handle)) return { ok: false, conflict: "handle" };
      for (const e of entries.values()) if (e.wallet === input.wallet) return { ok: false, conflict: "wallet" };
      const entry: Entry = {
        x_handle: input.x_handle,
        x_avatar_url: input.x_avatar_url,
        wallet: input.wallet,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      entries.set(input.x_handle, entry);
      return { ok: true, entry: { ...entry } };
    },
  };
}

export function createMemoryCardCache(): CardCache {
  const cards = new Map<string, Uint8Array>();
  return {
    async get(handle) {
      return cards.get(handle) ?? null;
    },
    async put(handle, png) {
      cards.set(handle, png);
    },
  };
}
