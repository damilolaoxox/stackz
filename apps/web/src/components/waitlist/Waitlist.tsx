import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  HANDLE_RE,
  TASK_COLORS,
  TASKS,
  WALLET_RE,
  type JoinResponse,
  type Task,
  type TaskState,
} from "@stackz/shared";
import { sound } from "../../audio/sound";
import { api, ApiRequestError } from "../../lib/api";
import { cardUrl, shareUrl, taskIntentUrl } from "../../lib/config";
import { AvatarBox } from "./AvatarBox";
import { JoinedPanel } from "./JoinedPanel";
import { TaskRow, type TaskView } from "./TaskRow";
import { TicketStub } from "./TicketStub";
import { Turnstile } from "./Turnstile";

const HANDLE_KEY = "stackz.handle";

const TASK_LABELS: Record<Task, string> = {
  follow: "Follow Stackz on X",
  like: "Like the pinned post",
  comment: "Comment on the pinned post",
  repost: "Repost the pinned post",
};

const RANK: Record<TaskState, number> = { idle: 0, charging: 1, done: 2 };

const idleTask = (): TaskView => ({ state: "idle", waitUntil: null, busy: false, error: null });
const freshTasks = (): Record<Task, TaskView> => ({
  follow: idleTask(),
  like: idleTask(),
  comment: idleTask(),
  repost: idleTask(),
});

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

function readSaved(): string | null {
  try {
    return localStorage.getItem(HANDLE_KEY);
  } catch {
    return null;
  }
}

function writeSaved(handle: string | null) {
  try {
    if (handle) localStorage.setItem(HANDLE_KEY, handle);
    else localStorage.removeItem(HANDLE_KEY);
  } catch {
    /* private mode */
  }
}

function joinError(err: unknown): string {
  if (!(err instanceof ApiRequestError)) return "Something went wrong. Try again.";
  switch (err.code) {
    case "handle_taken":
      return "That X username is already on the list with a different wallet.";
    case "wallet_taken":
      return "That wallet is already on the list.";
    case "tasks_incomplete":
      return "The server hasn't seen all four tasks yet. Confirm each one, then try again.";
    case "turnstile_failed":
      return "The security check didn't pass. It has been reset, so try again.";
    case "rate_limited":
      return `Too many tries. Wait ${err.body.retryAfterSeconds ?? 60} seconds and try again.`;
    case "invalid_request":
      return "Check your username and wallet address.";
    default:
      return err.status === 0 ? "Couldn't reach Stackz. Check your connection." : "Something went wrong. Try again.";
  }
}

export function Waitlist() {
  const [handleInput, setHandleInput] = useState("");
  const [handle, setHandle] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined);
  const [tasks, setTasks] = useState(freshTasks);
  const [wallet, setWallet] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [joined, setJoined] = useState<JoinResponse | null>(null);
  const handleRef = useRef<HTMLInputElement>(null);
  const loadSeq = useRef(0);

  const patchTask = (task: Task, patch: Partial<TaskView>) =>
    setTasks((prev) => ({ ...prev, [task]: { ...prev[task], ...patch } }));

  /** Loads the avatar and saved progress for a handle, so a returning visitor picks up where they left off. */
  const loadHandle = useCallback(async (h: string) => {
    const seq = ++loadSeq.current;
    setHandle(h);
    setAvatarUrl(undefined);
    writeSaved(h);
    const [avatar, progress] = await Promise.allSettled([api.avatar(h), api.progress(h)]);
    if (seq !== loadSeq.current) return;
    setAvatarUrl(avatar.status === "fulfilled" ? avatar.value.url : null);
    if (progress.status !== "fulfilled") return;
    const p = progress.value;
    // Never move a task backwards: a GO may have landed while this request was in flight.
    setTasks((prev) => {
      const next = { ...prev };
      for (const t of TASKS) {
        const server = p.tasks[t].state;
        if (RANK[server] > RANK[prev[t].state]) next[t] = { ...prev[t], state: server };
      }
      return next;
    });
    if (p.joined && p.status) setJoined({ handle: h, status: p.status, cardUrl: cardUrl(h), shareUrl: shareUrl(h) });
  }, []);

  useEffect(() => {
    const saved = readSaved();
    if (saved && HANDLE_RE.test(saved)) {
      setHandleInput(saved);
      void loadHandle(saved);
    }
  }, [loadHandle]);

  /** Validates the typed handle and loads it. Returns the normalized handle or null. */
  const commitHandle = (): string | null => {
    const raw = normalizeHandle(handleInput);
    if (!raw) return null;
    if (!HANDLE_RE.test(raw)) {
      setHandleError("X usernames are 1 to 15 letters, numbers or underscores.");
      return null;
    }
    setHandleError(null);
    const h = raw.toLowerCase();
    if (h !== handle) void loadHandle(h);
    return h;
  };

  const onHandleChange = (value: string) => {
    setHandleInput(value);
    if (handle && normalizeHandle(value).toLowerCase() !== handle) {
      // A different person: forget the previous handle's progress.
      loadSeq.current++;
      setHandle(null);
      setAvatarUrl(undefined);
      setTasks(freshTasks());
    }
  };

  const requireHandle = (): string | null => {
    const h = handle ?? commitHandle();
    if (!h) {
      setHandleError((prev) => prev ?? "Enter your X username first.");
      handleRef.current?.focus();
    }
    return h;
  };

  const go = (task: Task) => {
    const h = requireHandle();
    if (!h) return;
    // Open the tab inside the click so popup blockers allow it.
    window.open(taskIntentUrl(task), "_blank", "noopener,noreferrer");
    patchTask(task, { state: "charging", busy: true, error: null, waitUntil: null });
    api
      .go(h, task)
      .then((r) => patchTask(task, { state: r.state, busy: false }))
      .catch(() => patchTask(task, { state: "idle", busy: false, error: "Couldn't reach Stackz. Press GO again." }));
  };

  const confirm = (task: Task) => {
    if (!handle) return;
    patchTask(task, { busy: true, error: null });
    api
      .confirm(handle, task)
      .then((r) => {
        patchTask(task, { state: r.state, busy: false, waitUntil: null });
        if (r.state === "done") sound.play("taskDone");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError && err.code === "too_early") {
          patchTask(task, { busy: false, waitUntil: Date.now() + (err.body.retryAfterSeconds ?? 1) * 1000 });
        } else if (err instanceof ApiRequestError && err.code === "not_started") {
          patchTask(task, { state: "idle", busy: false });
        } else {
          patchTask(task, { busy: false, error: "Couldn't confirm. Try again." });
        }
      });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const h = requireHandle();
    const w = wallet.trim();
    const walletOk = WALLET_RE.test(w);
    setWalletError(walletOk ? null : "Paste a public 0x address: 0x followed by 40 letters and numbers.");
    const done = TASKS.filter((t) => tasks[t].state === "done").length;
    if (!h || !walletOk) return;
    if (done < TASKS.length) {
      setFormError(`Finish all four tasks first. ${done}/4 done.`);
      return;
    }
    if (!token) {
      setFormError("Complete the security check above the button.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.join({ handle: h, wallet: w, turnstileToken: token });
      setJoined(res);
      sound.play("taskDone");
    } catch (err) {
      setFormError(joinError(err));
      // Turnstile tokens are single-use, so always start a fresh check after a failure.
      setToken(null);
      setTurnstileKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const notYou = () => {
    loadSeq.current++;
    writeSaved(null);
    setJoined(null);
    setHandle(null);
    setHandleInput("");
    setAvatarUrl(undefined);
    setTasks(freshTasks());
    setWallet("");
    setToken(null);
    setTurnstileKey((k) => k + 1);
    setFormError(null);
    requestAnimationFrame(() => handleRef.current?.focus());
  };

  const doneCount = TASKS.filter((t) => tasks[t].state === "done").length;

  return (
    <section className="waitlist" id="waitlist" aria-labelledby="waitlist-title">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">
            <span className="eyebrow__level">LEVEL 01</span> · WAITLIST
          </p>
          <h2 id="waitlist-title" className="section-title">
            Join the
            <br />
            waitlist.
          </h2>
        </div>

        {joined ? (
          <JoinedPanel joined={joined} onNotYou={notYou} />
        ) : (
          <form className="ticket" onSubmit={(e) => void submit(e)} noValidate>
            <div className="ticket__main">
              <div className="field">
                <label htmlFor="x-handle" className="field__label">
                  01 · YOUR X USERNAME
                </label>
                <div className="field__handle-row">
                  <div className="field__input-wrap">
                    <span className="field__at" aria-hidden="true">
                      @
                    </span>
                    <input
                      id="x-handle"
                      ref={handleRef}
                      className="field__input"
                      type="text"
                      placeholder="yourhandle"
                      value={handleInput}
                      onChange={(e) => onHandleChange(e.target.value)}
                      onBlur={() => void commitHandle()}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={16}
                      aria-invalid={handleError ? true : undefined}
                      aria-describedby={handleError ? "x-handle-help x-handle-error" : "x-handle-help"}
                    />
                  </div>
                  <AvatarBox handle={handle} url={avatarUrl} />
                </div>
                <p id="x-handle-help" className="field__help">
                  Your name on the list. We only use your public username and profile picture.
                </p>
                {handleError && (
                  <p id="x-handle-error" className="field__error" role="alert">
                    {handleError}
                  </p>
                )}
              </div>

              <fieldset className="tasks">
                <legend className="tasks__head">
                  <span>02 · COMPLETE ALL FOUR TASKS</span>
                  <span aria-live="polite">{doneCount}/4</span>
                </legend>
                {TASKS.map((t, i) => (
                  <TaskRow
                    key={t}
                    task={t}
                    index={i}
                    label={TASK_LABELS[t]}
                    color={TASK_COLORS[t]}
                    view={tasks[t]}
                    onGo={go}
                    onConfirm={confirm}
                  />
                ))}
              </fieldset>

              <div className="field">
                <label htmlFor="wallet" className="field__label">
                  03 · ADD YOUR WALLET
                </label>
                <input
                  id="wallet"
                  className="field__input field__input--line"
                  type="text"
                  placeholder="0x…"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={42}
                  aria-invalid={walletError ? true : undefined}
                  aria-describedby={walletError ? "wallet-help wallet-error" : "wallet-help"}
                />
                <p id="wallet-help" className="field__help">
                  Public address only. We never ask for a seed phrase or a signature.
                </p>
                {walletError && (
                  <p id="wallet-error" className="field__error" role="alert">
                    {walletError}
                  </p>
                )}
              </div>

              <Turnstile onToken={setToken} resetKey={turnstileKey} />

              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}

              <button type="submit" className="btn btn--ink" disabled={submitting}>
                {submitting ? "Joining…" : "Join the waitlist"}
              </button>
            </div>
            <TicketStub />
          </form>
        )}
      </div>
    </section>
  );
}
