export function Wordmark({ className = "wordmark" }: { className?: string }) {
  return (
    <span className={className}>
      STACK<span className="wordmark__z">Z</span>
    </span>
  );
}
