"use client";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="panel max-w-md space-y-3 p-6 text-center">
        <p className="text-lg font-semibold text-[var(--text-primary)]">Application Error</p>
        <p className="text-sm text-[var(--text-secondary)]">{error.message || "Something failed."}</p>
        <button
          onClick={reset}
          className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
