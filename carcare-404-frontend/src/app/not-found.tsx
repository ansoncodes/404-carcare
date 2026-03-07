import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="panel max-w-md space-y-3 p-6 text-center">
        <p className="text-2xl font-semibold text-[var(--text-primary)]">404</p>
        <p className="text-sm text-[var(--text-secondary)]">The page does not exist.</p>
        <Link href="/" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Go back
        </Link>
      </div>
    </main>
  );
}
