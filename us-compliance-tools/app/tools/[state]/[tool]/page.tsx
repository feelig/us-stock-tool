import Link from "next/link";
import { notFound } from "next/navigation";
import AnnualReportDeadlineCalculator from "../../../../components/calculators/AnnualReportDeadlineCalculator";
import AnnualFeeCalculator from "../../../../components/calculators/AnnualFeeCalculator";
import ComplianceCalendarGenerator from "../../../../components/calculators/ComplianceCalendarGenerator";
import LateFilingPenaltyCalculator from "../../../../components/calculators/LateFilingPenaltyCalculator";
import LLCFormationCostCalculator from "../../../../components/calculators/LLCFormationCostCalculator";
import NYPublicationCostEstimator from "../../../../components/calculators/NYPublicationCostEstimator";
import RegisteredAgentCostCalculator from "../../../../components/calculators/RegisteredAgentCostCalculator";
import FloridaAnnualReportLateFeeCalculator from "../../../../components/calculators/FloridaAnnualReportLateFeeCalculator";
import TexasFranchiseTaxDueDateCalculator from "../../../../components/calculators/TexasFranchiseTaxDueDateCalculator";
import TexasFranchiseTaxPenaltyCalculator from "../../../../components/calculators/TexasFranchiseTaxPenaltyCalculator";
import RecordToolView from "../../../components/RecordToolView";
import { loadTools } from "../../../../lib/loadTools";
import { getStateData } from "../../../../core/stateLoader";
import { normalizeStateData } from "../../../../core/stateSchema";
import { STATES, isValidState } from "../../../../core/stateConfig";
import { tools as toolRegistry } from "../../../../core/toolRegistry";
import { buildFaqJsonLd, getInternalLinks, getToolSeo } from "../../../../core/seo";

type Params = { state: string; tool: string };

type ToolConfig = {
  toolSlug: string;
  titleTemplate: string;
  descriptionTemplate: string;
  category: string;
  faq: Array<Record<string, unknown>>;
  allowedStates?: string[];
  relatedToolSlugs: string[];
};

function formatStateLabel(stateLabel: string | null) {
  return stateLabel || "Unknown State";
}

function applyTemplate(template: string, stateLabel: string) {
  return template.replace(/\{State\}/g, stateLabel);
}

function formatToolLabel(toolSlug: string) {
  return toolSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStateLabelFromSlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStateList(stateIds: string[]) {
  const labels = stateIds.map(formatStateLabelFromSlug);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function Disclaimer() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
      <p className="text-sm text-ink-600">
        Disclaimer: Estimates only. Verify with official sources.
      </p>
    </section>
  );
}

function GenericEstimator({
  notes,
}: {
  notes?: string;
}) {
  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Estimator</h2>
        <p className="text-sm text-slate-600">
          This tool is not fully configured for the selected state yet.
        </p>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs uppercase tracking-wide text-slate-500">Estimated range</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">$0 - $500</p>
        <p className="mt-2 text-sm text-slate-600">
          Verify with official sources before filing.
        </p>
      </div>
      <p className="mt-3 text-xs text-slate-500">{notes || "Notes will be added soon."}</p>
    </div>
  );
}

function formatCurrency(amount?: number) {
  if (amount === undefined || Number.isNaN(amount)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function generateStaticParams() {
  const params = [];

  for (const state of STATES) {
    for (const tool of Object.keys(toolRegistry)) {
      params.push({ state, tool });
    }
  }

  return params;
}

export async function generateMetadata({ params }: { params: Params }) {
  const { state, tool } = params;
  try {
    const seo = getToolSeo(state, tool);
    return {
      title: seo.title,
      description: seo.description,
    };
  } catch {
    return {
      title: "Tool Not Found | US Compliance Tool",
      description: "The requested compliance tool could not be found.",
    };
  }
}

export default async function ToolPage({ params }: { params: Params }) {
  const { state, tool: toolSlug } = params;
  if (!isValidState(state)) notFound();
  if (!toolRegistry[toolSlug as keyof typeof toolRegistry]) notFound();

  const raw = (() => {
    try {
      return getStateData(state);
    } catch {
      return null;
    }
  })();
  if (!raw) notFound();
  const stateData = normalizeStateData(raw);
  const tools = await loadTools().catch(() => [] as ToolConfig[]);
  const toolConfig = tools.find((tool) => tool.toolSlug === toolSlug);
  const seo = getToolSeo(state, toolSlug);
  const faqs = seo.faqs;
  const faqJsonLd = buildFaqJsonLd(faqs);
  const { moreToolsForState, otherStatesForTool } = getInternalLinks(state, toolSlug);
  const hasSources = Array.isArray(stateData.sources) && stateData.sources.length > 0;
  const hasUpdatedAt = Boolean(stateData.updated_at);

  if (!toolConfig) notFound();

  const stateLabel = stateData.state ?? formatStateLabelFromSlug(state);
  const title = applyTemplate(toolConfig.titleTemplate, stateLabel);
  const description = applyTemplate(
    toolConfig.descriptionTemplate,
    stateLabel
  );

  if (
    toolConfig.allowedStates &&
    !toolConfig.allowedStates.includes(state)
  ) {
    const allowedStateId = toolConfig.allowedStates[0];
    const allowedStateLabel = formatStateLabelFromSlug(allowedStateId);
    const allowedStateNames = formatStateList(toolConfig.allowedStates);
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink-950">
          {formatToolLabel(toolConfig.toolSlug)} is currently available for{" "}
          {allowedStateNames} only
        </h1>
        <p className="text-sm text-ink-600">
          Not available for this state yet. We are expanding coverage soon.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/tools/${allowedStateId}/${toolConfig.toolSlug}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to {allowedStateLabel} tool
          </Link>
          <Link
            href="/tools"
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-accent-500 hover:text-accent-600"
          >
            Back to tools
          </Link>
        </div>
      </div>
    );
  }

  const reportItems = [
    stateData.business.annual_report_required !== null
      ? {
          label: "Required",
          value: stateData.business.annual_report_required ? "Yes" : "No",
        }
      : null,
    stateData.business.annual_report_deadline
      ? { label: "Deadline", value: stateData.business.annual_report_deadline }
      : null,
    stateData.business.llc_annual_fee !== null
      ? {
          label: "LLC annual fee",
          value: formatCurrency(stateData.business.llc_annual_fee),
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const franchiseTaxItems: Array<{ label: string; value: string }> = [];
  const publicationItems: Array<{ label: string; value: string }> = [];

  const relatedTools = toolConfig.relatedToolSlugs || [];
  const isDataBackedTool = [
    "annual-report-deadline",
    "late-filing-penalty",
    "annual-fee-calculator",
  ].includes(toolConfig.toolSlug);

  const reportRule = stateData.business.annual_report_deadline
    ? {
        ruleType: /calendar month|anniversary/i.test(
          stateData.business.annual_report_deadline
        )
          ? "anniversary_month"
          : "fixed_date",
        ruleText: stateData.business.annual_report_deadline,
      }
    : null;

  const lateFilingRule =
    stateData.penalties.late_filing_fee !== null
      ? {
          type: "fixed",
          fixedAmount: stateData.penalties.late_filing_fee,
          percentage: 0,
          notes: "Verify with official sources.",
        }
      : null;

  const annualFee =
    stateData.business.llc_annual_fee !== null
      ? {
          amount: stateData.business.llc_annual_fee,
          currency: "USD",
          notes: "Verify with official sources.",
        }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <RecordToolView
        title={title}
        url={`/tools/${state}/${toolConfig.toolSlug}`}
      />
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-600">
          {formatStateLabel(stateData.state)} compliance tool
        </p>
        <Link
          href="/tools"
          className="text-sm font-semibold text-accent-600"
        >
          Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-ink-950">{title}</h1>
        <p className="text-sm text-ink-600">{description}</p>
        <p className="text-xs text-ink-500">
          Last updated: {stateData.updated_at ?? "unknown"}
        </p>
        {(!hasUpdatedAt || !hasSources) && (
          <p className="text-xs text-ink-500">
            Data incomplete — verify with official sources.
          </p>
        )}
      </header>

      <section>
        {toolConfig.toolSlug === "annual-report-deadline" && (
          <AnnualReportDeadlineCalculator
            rule={reportRule}
          />
        )}
        {toolConfig.toolSlug === "late-filing-penalty" && (
          <LateFilingPenaltyCalculator
            rule={lateFilingRule}
            currency="USD"
          />
        )}
        {toolConfig.toolSlug === "annual-fee-calculator" && (
          <AnnualFeeCalculator
            fee={annualFee}
            stateLabel={stateData.state ?? undefined}
          />
        )}
        {toolConfig.toolSlug === "llc-formation-cost" && (
          <LLCFormationCostCalculator
            stateLabel={stateData.state ?? undefined}
            notes={stateData.business.annual_report_deadline ?? ""}
          />
        )}
        {toolConfig.toolSlug === "registered-agent-cost" && (
          <RegisteredAgentCostCalculator
            stateLabel={stateData.state ?? undefined}
            notes={stateData.business.annual_report_deadline ?? ""}
          />
        )}
        {toolConfig.toolSlug === "business-compliance-calendar" && (
          <ComplianceCalendarGenerator
            stateLabel={stateData.state ?? undefined}
            notes={stateData.business.annual_report_deadline ?? ""}
          />
        )}
        {toolConfig.toolSlug === "texas-franchise-tax-due-date" && (
          <TexasFranchiseTaxDueDateCalculator
            notes={stateData.business.annual_report_deadline ?? ""}
          />
        )}
        {toolConfig.toolSlug === "texas-franchise-tax-penalty" && (
          <TexasFranchiseTaxPenaltyCalculator
            notes={
              stateData.penalties.late_filing_fee !== null
                ? `Late filing fee: ${formatCurrency(stateData.penalties.late_filing_fee)}`
                : "Verify with official sources."
            }
          />
        )}
        {toolConfig.toolSlug === "llc-publication-cost-estimator" && (
          <NYPublicationCostEstimator
            notes={stateData.business.annual_report_deadline ?? ""}
          />
        )}
        {toolConfig.toolSlug === "florida-annual-report-late-fee" && (
          <FloridaAnnualReportLateFeeCalculator
            notes={
              stateData.penalties.late_filing_fee !== null
                ? `Late filing fee: ${formatCurrency(stateData.penalties.late_filing_fee)}`
                : "Verify with official sources."
            }
          />
        )}
        {!isDataBackedTool && (
          <div className="mt-6">
            <GenericEstimator notes={toolConfig.descriptionTemplate} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-card">
        <h2 className="text-lg font-semibold text-ink-950">Compliance details</h2>
        <div className="mt-4 grid gap-4 text-sm text-ink-700">
          {reportItems.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">Annual report</h3>
              <dl className="mt-2 grid gap-2">
                {reportItems.map((item) => (
                  <div key={`annual-${item.label}`} className="flex flex-col gap-1">
                    <dt className="text-xs uppercase tracking-wide text-ink-500">
                      {item.label}
                    </dt>
                    <dd className="text-sm text-ink-700">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {franchiseTaxItems.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">Franchise tax</h3>
              <dl className="mt-2 grid gap-2">
                {franchiseTaxItems.map((item) => (
                  <div key={`franchise-${item.label}`} className="flex flex-col gap-1">
                    <dt className="text-xs uppercase tracking-wide text-ink-500">
                      {item.label}
                    </dt>
                    <dd className="text-sm text-ink-700">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {publicationItems.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">Publication requirement</h3>
              <dl className="mt-2 grid gap-2">
                {publicationItems.map((item) => (
                  <div key={`publication-${item.label}`} className="flex flex-col gap-1">
                    <dt className="text-xs uppercase tracking-wide text-ink-500">
                      {item.label}
                    </dt>
                    <dd className="text-sm text-ink-700">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {reportItems.length === 0 &&
            franchiseTaxItems.length === 0 &&
            publicationItems.length === 0 && (
              <p className="text-sm text-ink-600">No additional rule details yet.</p>
            )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-card">
        <h2 className="text-lg font-semibold text-ink-950">FAQ</h2>
        <div className="mt-2 text-sm text-ink-600">
          {faqs.length > 0 ? (
            <ul className="list-disc space-y-2 pl-4">
              {faqs.map((item, index) => (
                <li key={`${toolSlug}-faq-${index}`}>
                  <p className="font-medium text-ink-800">{item.q}</p>
                  <p className="text-ink-600">{item.a}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>FAQ entries will be added soon.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
        <h2 className="text-lg font-semibold text-ink-950">Sources</h2>
        <div className="mt-2 flex flex-col gap-2 text-sm text-ink-600">
          {hasSources ? (
            <ul className="list-disc space-y-2 pl-4">
              {stateData.sources.map((source: any, index: number) => {
                if (typeof source === "string") {
                  return (
                    <li key={`${source}-${index}`} className="break-all">
                      {source}
                    </li>
                  );
                }
                return (
                  <li key={`${source.url}-${index}`} className="break-all">
                    <span className="font-medium text-ink-700">{source.title}</span>
                    <div className="text-xs text-ink-500">{source.url}</div>
                    {source.retrievedAt && (
                      <div className="text-xs text-ink-500">
                        Retrieved {source.retrievedAt}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Sources will be added soon.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
        <h2 className="text-lg font-semibold text-ink-950">
          More tools for {formatStateLabelFromSlug(state)}
        </h2>
        <div className="mt-2 text-sm text-ink-600">
          {moreToolsForState.length > 0 ? (
            <ul className="list-disc space-y-2 pl-4">
              {moreToolsForState.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-accent-600">
                    {formatToolLabel(link.tool)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No additional tools for this state yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
        <h2 className="text-lg font-semibold text-ink-950">
          Other states for this tool
        </h2>
        <div className="mt-2 text-sm text-ink-600">
          {otherStatesForTool.length > 0 ? (
            <ul className="list-disc space-y-2 pl-4">
              {otherStatesForTool.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-accent-600">
                    {formatStateLabelFromSlug(link.state)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No other states available yet.</p>
          )}
        </div>
      </section>

      {relatedTools.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white/70 p-5">
          <h2 className="text-lg font-semibold text-ink-950">Related tools</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((slug) => (
              <Link
                key={slug}
                href={`/tools/${state}/${slug}`}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 shadow-sm transition hover:border-accent-500 hover:text-accent-600"
              >
                {formatToolLabel(slug)}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Disclaimer />
    </div>
  );
}
