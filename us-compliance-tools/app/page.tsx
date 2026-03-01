import Link from "next/link";
import HomeSearchSection from "./components/HomeSearchSection";
import RecentTools from "./components/RecentTools";
import { loadStates } from "../lib/loadStates";
import { loadTools } from "../lib/loadTools";

type ToolPageItem = {
  stateId: string;
  stateLabel: string;
  toolSlug: string;
  title: string;
  description: string;
  category: string;
  href: string;
};

function applyTemplate(template: string, stateLabel: string) {
  return template.replace(/\{State\}/g, stateLabel);
}

export default async function HomePage() {
  const [states, tools] = await Promise.all([loadStates(), loadTools()]);

  const toolPages: ToolPageItem[] = states.flatMap((state) =>
    tools
      .filter(
        (tool) => !tool.allowedStates || tool.allowedStates.includes(state.slug)
      )
      .map((tool) => ({
        stateId: state.slug,
        stateLabel: state.label,
        toolSlug: tool.toolSlug,
        title: applyTemplate(tool.titleTemplate, state.label),
        description: applyTemplate(tool.descriptionTemplate, state.label),
        category: tool.category,
        href: `/tools/${state.slug}/${tool.toolSlug}`,
      }))
  );

  const categories = Array.from(new Set(tools.map((tool) => tool.category)));

  const popularStates = ["california", "texas", "florida", "newyork"];
  const popularStateEntries = states
    .filter((state) => popularStates.includes(state.slug))
    .map((state) => ({
      ...state,
      tools: toolPages
        .filter((item) => item.stateId === state.slug)
        .slice(0, 5)
        .map((item) => ({
          slug: item.toolSlug,
          label: item.title,
        })),
    }));

  const popularCategories = [
    { label: "Deadlines", category: "Deadlines" },
    { label: "Penalties", category: "Penalties" },
    { label: "Fees", category: "Fees" },
    { label: "Setup Costs", category: "Formation" },
    { label: "Calendar", category: "Planning" },
  ];

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-6 rounded-2xl border border-stone-200 bg-white/80 p-8 shadow-card">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold text-ink-950">
            US Small Business Compliance Tools
          </h1>
          <p className="text-lg text-ink-600">
            Deadlines, fees, and penalty estimates — fast and simple.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tools"
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Browse tools
          </Link>
          <Link
            href="/tools/california/annual-report-deadline"
            className="rounded-lg border border-stone-200 px-5 py-3 text-sm font-semibold text-ink-700 transition hover:border-accent-500 hover:text-accent-600"
          >
            California tools
          </Link>
        </div>
      </section>

      <section className="grid gap-6">
        <h2 className="text-2xl font-semibold text-ink-950">Search tools</h2>
        <HomeSearchSection
          items={toolPages}
          categories={categories}
          popularCategories={popularCategories}
        />
      </section>

      <section className="grid gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink-950">Popular states</h2>
          <Link href="/tools" className="text-sm font-semibold text-accent-600">
            View all tools
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {popularStateEntries.map((state) => (
            <div
              key={state.slug}
              className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-card"
            >
              <h3 className="text-lg font-semibold text-ink-950">{state.label}</h3>
              <div className="mt-3 flex flex-col gap-2">
                {state.tools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${state.slug}/${tool.slug}`}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:border-accent-500 hover:text-accent-600"
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <RecentTools />

      <section className="rounded-2xl border border-stone-200 bg-white/70 p-6">
        <h2 className="text-xl font-semibold text-ink-950">Trust & disclaimer</h2>
        <p className="mt-3 text-sm text-ink-600">
          Estimates only. Always verify with official sources.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-accent-600">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </section>
    </div>
  );
}
