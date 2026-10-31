import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CardCache, Entry, Store, TaskRow } from "./store";

const ENTRY_COLUMNS = "x_handle, x_avatar_url, wallet, status, created_at";
const UNIQUE_VIOLATION = "23505";

export function createSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseStore(db: SupabaseClient): Store {
  async function getTaskRow(handle: string, task: string): Promise<TaskRow> {
    const { data, error } = await db
      .from("task_progress")
      .select("task, go_at, done_at")
      .eq("handle", handle)
      .eq("task", task)
      .single();
    if (error) throw error;
    return data as TaskRow;
  }

  return {
    async getTaskRows(handle) {
      const { data, error } = await db.from("task_progress").select("task, go_at, done_at").eq("handle", handle);
      if (error) throw error;
      return data as TaskRow[];
    },

    async startTask(handle, task, at) {
      const { error } = await db
        .from("task_progress")
        .upsert({ handle, task, go_at: at.toISOString() }, { onConflict: "handle,task", ignoreDuplicates: true });
      if (error) throw error;
      return getTaskRow(handle, task);
    },

    async completeTask(handle, task, at) {
      const { error } = await db
        .from("task_progress")
        .update({ done_at: at.toISOString() })
        .eq("handle", handle)
        .eq("task", task)
        .is("done_at", null);
      if (error) throw error;
      return getTaskRow(handle, task);
    },

    async getEntry(handle) {
      const { data, error } = await db
        .from("waitlist_entries")
        .select(ENTRY_COLUMNS)
        .eq("x_handle", handle)
        .maybeSingle();
      if (error) throw error;
      return (data as Entry | null) ?? null;
    },

    async createEntry(input) {
      const { data, error } = await db.from("waitlist_entries").insert(input).select(ENTRY_COLUMNS).single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) {
          const text = `${error.message} ${error.details ?? ""}`;
          return { ok: false, conflict: text.includes("wallet") ? "wallet" : "handle" };
        }
        throw error;
      }
      return { ok: true, entry: data as Entry };
    },
  };
}

export function createSupabaseCardCache(db: SupabaseClient, bucket: string): CardCache {
  const path = (handle: string) => `${handle}.png`;
  return {
    async get(handle) {
      const { data, error } = await db.storage.from(bucket).download(path(handle));
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
    async put(handle, png) {
      const { error } = await db.storage
        .from(bucket)
        .upload(path(handle), png, { contentType: "image/png", cacheControl: "86400", upsert: true });
      if (error) throw error;
    },
  };
}
