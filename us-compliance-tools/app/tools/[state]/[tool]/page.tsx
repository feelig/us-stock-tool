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

function formatStateLabel(stateName: string) {
  return stateName || "Unknown State";
}

function applyTemplate(template: string, stateName: string) {
  return template.replace(/\{State\}/g, stateName);
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

function formatStateList(stateSlugs: string[]) {
  const labels = stateSlugs.map(formatStateLabelFromSlug);
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

  const stateData = (() => {
    try {
      return getStateData(state);
    } catch {
      return null;
    }
  })();
  const tools = await loadTools().catch(() => [] as ToolConfig[]);
  const toolConfig = tools.find((tool) => tool.toolSlug === toolSlug);
  const seo = getToolSeo(state, toolSlug);
  const faqs = seo.faqs;
  const faqJsonLd = buildFaqJsonLd(faqs);
  const { moreToolsForState, otherStatesForTool } = getInternalLinks(state, toolSlug);

  if (!stateData) notFound();
  if (!toolConfig) notFound();

  const title = applyTemplate(toolConfig.titleTemplate, stateData.stateName);
  const description = applyTemplate(
    toolConfig.descriptionTemplate,
    stateData.stateName
  );

  if (
    toolConfig.allowedStates &&
    !toolConfig.allowedStates.includes(stateData.stateSlug)
  ) {
    const allowedStateSlug = toolConfig.allowedStates[0];
    const allowedStateLabel = formatStateLabelFromSlug(allowedStateSlug);
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
            href={`/tools/${allowedStateSlug}/${toolConfig.toolSlug}`}
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

  const annualReportItems = [
    stateData.annualReport.officialName
      ? { label: "Official name", value: stateData.annualReport.officialName }
      : null,
    stateData.annualReport.initialDue
      ? { label: "Initial due", value: stateData.annualReport.initialDue }
      : null,
    stateData.annualReport.recurring
      ? { label: "Recurring", value: stateData.annualReport.recurring }
      : null,
    stateData.annualReport.dueDate
      ? { label: "Due date", value: stateData.annualReport.dueDate }
      : null,
    stateData.annualReport.feeUSD !== undefined
      ? { label: "Filing fee", value: formatCurrency(stateData.annualReport.feeUSD) }
      : null,
    stateData.annualReport.lateFeeUSD !== undefined
      ? { label: "Late fee", value: formatCurrency(stateData.annualReport.lateFeeUSD) }
      : null,
    stateData.annualReport.notes
      ? { label: "Notes", value: stateData.annualReport.notes }
      : null,
    stateData.annualReport.ruleText
      ? { label: "Rule summary", value: stateData.annualReport.ruleText }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const franchiseTaxItems = stateData.franchiseTax
    ? ([
        stateData.franchiseTax.dueDate
          ? { label: "Due date", value: stateData.franchiseTax.dueDate }
          : null,
        stateData.franchiseTax.lateFilingFeeUSD !== undefined
          ? {
              label: "Late filing fee",
              value: formatCurrency(stateData.franchiseTax.lateFilingFeeUSD),
            }
          : null,
        stateData.franchiseTax.latePenalty
          ? {
              label: "Penalty rates",
              value: `1-30 days: ${stateData.franchiseTax.latePenalty["1to30days"] ?? "N/A"}, over 30 days: ${stateData.franchiseTax.latePenalty.over30days ?? "N/A"}`,
            }
          : null,
        stateData.franchiseTax.notes
          ? { label: "Notes", value: stateData.franchiseTax.notes }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>)
    : [];

  const publicationItems = stateData.publicationRequirement
    ? ([
        stateData.publicationRequirement.deadline
          ? { label: "Deadline", value: stateData.publicationRequirement.deadline }
          : null,
        stateData.publicationRequirement.publicationCostRangeUSD
          ? {
              label: "Publication cost range",
              value: stateData.publicationRequirement.publicationCostRangeUSD,
            }
          : null,
        stateData.publicationRequirement.certificateFilingFeeUSD !== undefined
          ? {
              label: "Certificate filing fee",
              value: formatCurrency(stateData.publicationRequirement.certificateFilingFeeUSD),
            }
          : null,
        stateData.publicationRequirement.notes
          ? { label: "Notes", value: stateData.publicationRequirement.notes }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>)
    : [];

  const relatedTools = toolConfig.relatedToolSlugs || [];
  const isDataBackedTool = [
    "annual-report-deadline",
    "late-filing-penalty",
    "annual-fee-calculator",
  ].includes(toolConfig.toolSlug);

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
        url={`/tools/${stateData.stateSlug}/${toolConfig.toolSlug}`}
      />
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-600">
          {formatStateLabel(stateData.stateName)} compliance tool
        </p>
        <Link
          href="/tools"
          className="text-sm font-semibold text-accent-600"
        >
          Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-ink-950">{title}</h1>
        <p className="text-sm text-ink-600">{description}</p>
        <p className="text-xs text-ink-500">Last updated: {stateData.updated_at}</p>
      </header>

      <section>
        {toolConfig.toolSlug === "annual-report-deadline" && (
          <AnnualReportDeadlineCalculator
            annualReport={stateData.annualReport}
          />
        )}
        {toolConfig.toolSlug === "late-filing-penalty" && (
          <LateFilingPenaltyCalculator
            rule={stateData.penalties.lateFiling}
            currency={stateData.fees.annualFee.currency}
          />
        )}
        {toolConfig.toolSlug === "annual-fee-calculator" && (
          <AnnualFeeCalculator
            fee={stateData.fees.annualFee}
            stateName={stateData.stateName}
          />
        )}
        {toolConfig.toolSlug === "llc-formation-cost" && (
          <LLCFormationCostCalculator
            stateName={stateData.stateName}
            notes={stateData.fees.annualFee.notes}
          />
        )}
        {toolConfig.toolSlug === "registered-agent-cost" && (
          <RegisteredAgentCostCalculator
            stateName={stateData.stateName}
            notes={stateData.fees.annualFee.notes}
          />
        )}
        {toolConfig.toolSlug === "business-compliance-calendar" && (
          <ComplianceCalendarGenerator
            stateName={stateData.stateName}
            notes={stateData.annualReport.ruleText}
          />
        )}
        {toolConfig.toolSlug === "texas-franchise-tax-due-date" && (
          <TexasFranchiseTaxDueDateCalculator
            notes={stateData.annualReport.ruleText}
          />
        )}
        {toolConfig.toolSlug === "texas-franchise-tax-penalty" && (
          <TexasFranchiseTaxPenaltyCalculator
            notes={stateData.penalties.lateFiling.notes}
          />
        )}
        {toolConfig.toolSlug === "llc-publication-cost-estimator" && (
          <NYPublicationCostEstimator
            notes={stateData.fees.annualFee.notes}
          />
        )}
        {toolConfig.toolSlug === "florida-annual-report-late-fee" && (
          <FloridaAnnualReportLateFeeCalculator
            notes={stateData.penalties.lateFiling.notes}
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
          {annualReportItems.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <h3 className="text-sm font-semibold text-ink-900">Annual report</h3>
              <dl className="mt-2 grid gap-2">
                {annualReportItems.map((item) => (
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
          {annualReportItems.length === 0 &&
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
          {stateData.sources.length > 0 ? (
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
                href={`/tools/${stateData.stateSlug}/${slug}`}
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
