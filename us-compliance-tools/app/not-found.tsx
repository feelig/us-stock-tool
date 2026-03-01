import Link from "next/link";

const popularTools = [
  {
    label: "California Annual Report Deadline",
    href: "/tools/california/annual-report-deadline",
  },
  {
    label: "Texas Late Filing Penalty",
    href: "/tools/texas/late-filing-penalty",
  },
  {
    label: "Florida Annual Fee Calculator",
    href: "/tools/florida/annual-fee-calculator",
  },
  {
    label: "New York Annual Report Deadline",
    href: "/tools/newyork/annual-report-deadline",
  },
];

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-600">Notice</p>
        <h1 className="text-3xl font-semibold text-ink-950">This page moved.</h1>
        <p className="text-sm text-ink-600">
          Try the tools hub or jump straight to a popular calculator.
        </p>
      </header>

      <div>
        <Link
          href="/tools"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to Tools Hub
        </Link>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-card">
        <h2 className="text-lg font-semibold text-ink-950">Popular tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {popularTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition hover:border-accent-500 hover:text-accent-600"
            >
              {tool.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
