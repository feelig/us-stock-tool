import Link from "next/link";
import ToolSearch from "../components/ToolSearch";
import RecentTools from "../components/RecentTools";
import { loadStates } from "../../lib/loadStates";
import { loadTools } from "../../lib/loadTools";

type ToolPageItem = {
  stateSlug: string;
  stateName: string;
  toolSlug: string;
  title: string;
  description: string;
  category: string;
  href: string;
};

function applyTemplate(template: string, stateName: string) {
  return template.replace(/\{State\}/g, stateName);
}

export default async function ToolsHubPage() {
  const [states, tools] = await Promise.all([loadStates(), loadTools()]);

  const toolPages: ToolPageItem[] = states.flatMap((state) =>
    tools
      .filter(
        (tool) => !tool.allowedStates || tool.allowedStates.includes(state.stateSlug)
      )
      .map((tool) => ({
        stateSlug: state.stateSlug,
        stateName: state.stateName,
        toolSlug: tool.toolSlug,
        title: applyTemplate(tool.titleTemplate, state.stateName),
        description: applyTemplate(tool.descriptionTemplate, state.stateName),
        category: tool.category,
        href: `/tools/${state.stateSlug}/${tool.toolSlug}`,
      }))
  );

  const categories = Array.from(new Set(tools.map((tool) => tool.category)));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-ink-950">
          US Small Business Compliance Tools
        </h1>
        <p className="text-sm text-ink-600">
          Search tools by state, category, or compliance need.
        </p>
        <Link
          href="/"
          className="text-sm font-semibold text-accent-600"
        >
          Back to homepage
        </Link>
      </header>

      <ToolSearch
        items={toolPages}
        categories={categories}
        showStateFilter
        states={states.map((state) => ({ slug: state.stateSlug, name: state.stateName }))}
      />

      <RecentTools />
    </div>
  );
}
