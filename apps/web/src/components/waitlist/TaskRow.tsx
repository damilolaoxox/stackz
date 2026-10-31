import { useEffect, useState } from "react";
import type { Task, TaskState } from "@stackz/shared";
import { cssVars } from "../../lib/css";

export interface TaskView {
  state: TaskState;
  /** Set after a too_early answer: epoch ms when CONFIRM can count. */
  waitUntil: number | null;
  busy: boolean;
  error: string | null;
}

interface Props {
  task: Task;
  index: number;
  label: string;
  color: string;
  view: TaskView;
  onGo: (task: Task) => void;
  onConfirm: (task: Task) => void;
}

const BLOCKS = Array.from({ length: 10 }, (_, i) => i);

function useSecondsLeft(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null || until <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [until]);
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

/** One task: a 10-block power bar that charges after GO and powers up on CONFIRM. */
export function TaskRow({ task, index, label, color, view, onGo, onConfirm }: Props) {
  const wait = useSecondsLeft(view.waitUntil);
  const { state } = view;

  return (
    <div className={`task task--${state}`} style={cssVars({ "--task": color })}>
      <span className="task__n">TASK {index + 1}</span>
      <span className="task__label" id={`task-${task}`}>
        {label}
      </span>
      <span className="task__bar" aria-hidden="true">
        {BLOCKS.map((i) => (
          <span
            key={`${state}-${i}`}
            className="task__block"
            style={{
              animationDelay: state === "charging" ? `${i * 0.35}s` : state === "done" ? `${i * 0.04}s` : undefined,
            }}
          />
        ))}
      </span>
      <span className="task__action">
        {state === "idle" && (
          <button
            type="button"
            className="task__btn"
            onClick={() => onGo(task)}
            disabled={view.busy}
            aria-describedby={`task-${task}`}
          >
            GO
          </button>
        )}
        {state === "charging" &&
          (wait > 0 ? (
            <button type="button" className="task__btn task__btn--ghost" disabled aria-describedby={`task-${task}`}>
              WAIT {wait}s
            </button>
          ) : (
            <button
              type="button"
              className="task__btn task__btn--ghost"
              onClick={() => onConfirm(task)}
              disabled={view.busy}
              aria-describedby={`task-${task}`}
            >
              <span className="blink">CONFIRM</span>
            </button>
          ))}
        {state === "done" && <span className="task__done">DONE</span>}
      </span>
      {view.error && (
        <span className="task__error" role="alert">
          {view.error}
        </span>
      )}
    </div>
  );
}
