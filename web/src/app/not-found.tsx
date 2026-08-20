import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-6 py-24">
      <p className="text-brand-600 font-mono text-xs tracking-widest uppercase">Error 404</p>

      <h1 className="text-ink font-display mt-3 text-4xl font-bold tracking-tight">
        We could not find that page
      </h1>

      <p className="text-muted mt-4">
        It may have moved, or the link that brought you here may be out of date.
      </p>

      <Link
        href="/"
        className="bg-brand-600 hover:bg-brand-700 mt-8 rounded-sm px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        Back to the homepage
      </Link>
    </div>
  );
}
