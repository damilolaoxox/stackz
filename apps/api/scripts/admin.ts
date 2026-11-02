/**
 * Waitlist review from the terminal. Talks to the API's /admin routes.
 *
 *   pnpm admin list [pending|approved|rejected|all] [--limit 100] [--offset 0]
 *   pnpm admin approve <handle> [<handle> ...]
 *   pnpm admin reject <handle> [<handle> ...]
 *   pnpm admin reset <handle> [<handle> ...]      (back to pending)
 *
 * Needs ADMIN_TOKEN (the same value the API has) and, for production,
 * ADMIN_API_URL (e.g. https://api.stackz.xyz). Both can go in apps/api/.env.
 */
import type { AdminListResponse } from "../src/routes/admin";
import type { AdminEntry } from "../src/store";

const API = (process.env.ADMIN_API_URL || process.env.PUBLIC_API_URL || "http://localhost:8787").replace(/\/$/, "");
const TOKEN = process.env.ADMIN_TOKEN ?? "";
const STATUS_FOR = { approve: "approved", reject: "rejected", reset: "pending" } as const;

function usage(): never {
  console.error(
    [
      "Usage:",
      "  pnpm admin list [pending|approved|rejected|all] [--limit N] [--offset N]",
      "  pnpm admin approve <handle> [...]",
      "  pnpm admin reject <handle> [...]",
      "  pnpm admin reset <handle> [...]",
    ].join("\n"),
  );
  process.exit(1);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint =
      res.status === 401
        ? " (ADMIN_TOKEN doesn't match the API's)"
        : res.status === 404 && path.startsWith("/admin/entries?")
          ? " (the API has no ADMIN_TOKEN set, so /admin is off)"
          : "";
    throw new Error(`${res.status} ${JSON.stringify(body)}${hint}`);
  }
  return body as T;
}

/** Seconds between GO and CONFIRM per task, e.g. "f9 l12 c31 r8". Very fast, uniform times are a red flag. */
function taskTimes(e: AdminEntry): string {
  return (["follow", "like", "comment", "repost"] as const)
    .map((t) => {
      const row = e.tasks[t];
      if (!row?.go_at || !row.done_at) return `${t[0]}-`;
      return `${t[0]}${Math.round((Date.parse(row.done_at) - Date.parse(row.go_at)) / 1000)}`;
    })
    .join(" ");
}

function flag(args: string[], name: string): number | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const n = Number(args[i + 1]);
  if (!Number.isInteger(n) || n < 0) usage();
  args.splice(i, 2);
  return n;
}

async function list(args: string[]) {
  const limit = flag(args, "limit") ?? 100;
  const offset = flag(args, "offset") ?? 0;
  const which = args[0] ?? "pending";
  if (!["pending", "approved", "rejected", "all"].includes(which)) usage();

  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (which !== "all") params.set("status", which);
  const { entries } = await call<AdminListResponse>(`/admin/entries?${params}`);

  if (!entries.length) {
    console.log(`No ${which === "all" ? "" : `${which} `}entries.`);
    return;
  }
  console.table(
    entries.map((e) => ({
      handle: `@${e.x_handle}`,
      status: e.status,
      joined: e.created_at.slice(0, 16).replace("T", " "),
      wallet: e.wallet,
      "task secs": taskTimes(e),
      x: `https://x.com/${e.x_handle}`,
    })),
  );
  if (entries.length === limit) console.log(`More may exist: add --offset ${offset + limit}`);
}

async function setStatus(cmd: keyof typeof STATUS_FOR, handles: string[]) {
  if (!handles.length) usage();
  let failed = false;
  for (const raw of handles) {
    const handle = raw.replace(/^@/, "");
    try {
      const e = await call<AdminEntry>(`/admin/entries/${encodeURIComponent(handle)}/status`, {
        method: "POST",
        body: JSON.stringify({ status: STATUS_FOR[cmd] }),
      });
      console.log(`@${e.x_handle} → ${e.status}`);
    } catch (err) {
      failed = true;
      console.error(`@${handle}: ${(err as Error).message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!TOKEN) {
    console.error("Set ADMIN_TOKEN (in apps/api/.env or the environment) to the API's admin token.");
    process.exit(1);
  }
  if (cmd === "list") return list(args);
  if (cmd === "approve" || cmd === "reject" || cmd === "reset") return setStatus(cmd, args);
  usage();
}

main().catch((err) => {
  console.error((err as Error).message);
  // exitCode, not exit(): exiting while fetch's sockets close trips a libuv assert on Windows.
  process.exitCode = 1;
});
